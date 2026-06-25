import { createServer, Socket } from 'node:net';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { DownloadEngine } from '../download/engine';
import { extractFilename, SETTINGS_KEY, IPC_CHANNELS } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../storage/database';
import { isPublicHttpUrl } from '../net/ssrf-guard';
import { isYtdlpUrl } from '../ipc/download.ipc';
import youtubedl from 'youtube-dl-exec';

let bridgeServer: ReturnType<typeof createServer> | null = null;

/**
 * Return the bridge auth token, generating and persisting one on first run.
 * The native-messaging host reads the same token from settings so legitimate
 * extension traffic authenticates while arbitrary local processes cannot.
 */
export function getBridgeToken(): string {
  const db = getDatabase();
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(SETTINGS_KEY.BRIDGE_TOKEN) as { value: string } | undefined;
  if (row?.value) return row.value;

  const token = randomBytes(32).toString('hex');
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(SETTINGS_KEY.BRIDGE_TOKEN, token);
  return token;
}

export function startBrowserBridge(engine: DownloadEngine): void {
  if (bridgeServer) return;

  bridgeServer = createServer((socket: Socket) => {
    let buffer = Buffer.alloc(0);
    let expectedLength = 0;

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

      while (true) {
        if (expectedLength === 0 && buffer.length >= 4) {
          expectedLength = buffer.readUInt32LE(0);
          buffer = buffer.subarray(4);
        }

        if (expectedLength > 0 && buffer.length >= expectedLength) {
          const messageRaw = buffer.subarray(0, expectedLength);
          buffer = buffer.subarray(expectedLength);
          expectedLength = 0;

          let message;
          try {
            message = JSON.parse(messageRaw.toString('utf-8'));
          } catch {
            continue;
          }

          handleBridgeMessage(socket, message, engine).catch(() => {
            try { sendBridgeResponse(socket, { status: 'error', error: 'Internal error' }); } catch {}
          });
          continue;
        }

        break;
      }
    });

    socket.on('error', () => {
      // client disconnected
    });

    socket.on('close', () => {
      // cleanup
    });
  });

  // Persist the token to a file the native-messaging host can read, so it can
  // attach it to messages it forwards from the browser extension.
  try {
    writeFileSync(join(app.getPath('userData'), 'bridge-token'), getBridgeToken(), 'utf-8');
  } catch (err) {
    console.error('[browser-bridge] Failed to write token file:', err);
  }

  bridgeServer.listen(19527, '127.0.0.1', () => {
    console.log('[browser-bridge] TCP server listening on 127.0.0.1:19527');
  });
}

export function stopBrowserBridge(): void {
  if (bridgeServer) {
    bridgeServer.close();
    bridgeServer = null;
    console.log('[browser-bridge] TCP server stopped');
  }
}

async function handleBridgeMessage(socket: Socket, message: Record<string, unknown>, engine: DownloadEngine): Promise<void> {
  const { action } = message;

  // ping is unauthenticated so the extension can detect RDM is running.
  if (action === 'ping') {
    sendBridgeResponse(socket, { status: 'ok', version: '0.1.0' });
    return;
  }

  // Every other action requires the shared secret. Reject otherwise so a
  // random local process cannot drive the download engine.
  const token = String(message.token || '');
  if (!token || token !== getBridgeToken()) {
    sendBridgeResponse(socket, { status: 'error', error: 'Unauthorized' });
    return;
  }

  if (action === 'add-download') {
    const url = String(message.url || '');
    if (!url) {
      sendBridgeResponse(socket, { status: 'error', error: 'No URL provided' });
      return;
    }

    if (!(await isPublicHttpUrl(url))) {
      sendBridgeResponse(socket, { status: 'error', error: 'URL not allowed' });
      return;
    }

    const pageUrl = String(message.pageUrl || '');
    const source = String(message.source || 'extension');

    const metadata = (message.metadata || {}) as Record<string, unknown>;
    const isYtdlp = !!metadata.ytdlpFormat || isYtdlpUrl(url);

    const finalFilename = isYtdlp
      ? 'Fetching video...'
      : String(message.filename || extractFilename(url) || 'download');

    // Resolve output filepath — same logic as download.ipc.ts
    let filepath: string;
    try {
      const db = getDatabase();
      const defaultSavePathRow = db.prepare("SELECT value FROM settings WHERE key = 'defaultSavePath'").get() as { value: string } | undefined;
      const baseDir = defaultSavePathRow?.value || app.getPath('downloads');
      filepath = join(baseDir, finalFilename);
    } catch {
      filepath = join(app.getPath('downloads'), finalFilename);
    }



    console.log(`[browser-bridge] Intercepted download from ${source}: ${url}, triggering Add Dialog`);

    // Bring app to foreground and show the Add Download dialog
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win.isMinimized()) win.restore();
      win.focus();
      
      // We pass the URL and a pre-filled filename/referer so the AddUrlDialog can use it
      win.webContents.send(IPC_CHANNELS.SHOW_ADD_DOWNLOAD_DIALOG, {
        url,
        filename: finalFilename,
        referer: pageUrl || undefined,
        metadata
      });
    });

    sendBridgeResponse(socket, {
      status: 'ok',
      action: 'show-dialog',
    });
    return;
  }

  if (action === 'get-formats') {
    const url = String(message.url || '');
    const tabId = message.tabId;
    if (!url || !(await isPublicHttpUrl(url))) {
      sendBridgeResponse(socket, { status: 'error', error: 'Invalid URL', action: 'formats-result', tabId });
      return;
    }

    try {
      const ytInfo = await youtubedl(url, { dumpJson: true }) as any;
      if (ytInfo.formats && Array.isArray(ytInfo.formats)) {
        const availableFormats: { id: string, label: string }[] = [];
        const formatSize = (bytes?: number) => bytes ? ` - ${(bytes / (1024 * 1024)).toFixed(1)}MB` : '';
        const videoFormats = ytInfo.formats.filter((f: any) => f.vcodec !== 'none').reverse();
        const heights = [4320, 2880, 2160, 1440, 1080, 720, 480, 360, 240, 144];
        
        heights.forEach(height => {
          const formatsAtHeight = videoFormats.filter((f: any) => f.height === height);
          if (formatsAtHeight.length > 0) {
            const format = formatsAtHeight.find((f: any) => f.ext === 'mp4') || formatsAtHeight[0];
            const hasAudio = format.acodec !== 'none';
            const formatId = hasAudio ? format.format_id : `${format.format_id}+bestaudio/best`;
            availableFormats.push({
              id: formatId,
              label: `${height}p${format.fps && format.fps > 30 ? format.fps : ''} (${format.ext.toUpperCase()})${formatSize(format.filesize || format.filesize_approx)}`
            });
          }
        });

        const bestAudio = ytInfo.formats.find((f: any) => f.vcodec === 'none' && f.ext === 'm4a') || ytInfo.formats.find((f: any) => f.vcodec === 'none');
        if (bestAudio) {
          availableFormats.push({
            id: bestAudio.format_id,
            label: `Audio Only (${bestAudio.ext})${formatSize(bestAudio.filesize || bestAudio.filesize_approx)}`
          });
        }
        sendBridgeResponse(socket, { status: 'ok', formats: availableFormats, action: 'formats-result', tabId });
      } else {
        sendBridgeResponse(socket, { status: 'error', error: 'No formats found', action: 'formats-result', tabId });
      }
    } catch (err: any) {
      let errorMessage = err.message || 'Unknown error occurred';
      if (errorMessage.includes('HTTP Error 429') || errorMessage.includes('Too Many Requests')) {
        errorMessage = 'YouTube Rate Limit (HTTP 429). Please try again later.';
      } else if (errorMessage.includes('No supported JavaScript runtime') || errorMessage.includes('Sign in to confirm')) {
        errorMessage = 'YouTube blocked the request. Cookies or a JS runtime may be required.';
      } else {
        const match = errorMessage.match(/ERROR: (.*)/);
        if (match) {
          errorMessage = match[1];
        } else {
          errorMessage = errorMessage.split('\n')[0].substring(0, 100);
        }
      }
      sendBridgeResponse(socket, { status: 'error', error: errorMessage, action: 'formats-result', tabId });
    }
    return;
  }

  if (action === 'get-status') {
    const status = engine.getQueueStatus();
    sendBridgeResponse(socket, { status: 'ok', ...status });
    return;
  }

  sendBridgeResponse(socket, { status: 'error', error: `Unknown action: ${action}` });
}

function sendBridgeResponse(socket: Socket, data: Record<string, unknown>): void {
  const json = JSON.stringify(data);
  const buffer = Buffer.from(json, 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  socket.write(Buffer.concat([header, buffer]));
}
