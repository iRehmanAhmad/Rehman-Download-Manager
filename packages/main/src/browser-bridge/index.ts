import { createServer, Socket } from 'node:net';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { DownloadEngine } from '../download/engine';
import { extractFilename, SETTINGS_KEY } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../storage/database';
import { isPublicHttpUrl } from '../net/ssrf-guard';

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

    const filename = String(message.filename || extractFilename(url) || 'download');
    const pageUrl = String(message.pageUrl || '');
    const source = String(message.source || 'extension');

    const download = {
      id: uuid(),
      url,
      filename,
      tempDir: '',
      fileSize: -1,
      downloaded: 0,
      status: 'queued' as const,
      priority: 'normal' as const,
      addedAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      numConnections: 8,
      headers: pageUrl ? { Referer: pageUrl } : undefined,
      referer: pageUrl || undefined,
      chunks: [],
      speed: 0,
      progress: 0,
      eta: 0,
    };

    engine.add(download);
    console.log(`[browser-bridge] Added download from ${source}: ${url}`);

    sendBridgeResponse(socket, {
      status: 'ok',
      downloadId: download.id,
      filename: download.filename,
      action: 'added',
    });
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
