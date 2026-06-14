import { createServer, Socket } from 'node:net';
import { DownloadEngine } from '../download/engine';
import { extractFilename } from '@rdm/shared';
import { v4 as uuid } from 'uuid';

let bridgeServer: ReturnType<typeof createServer> | null = null;

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

          handleBridgeMessage(socket, message, engine);
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

function handleBridgeMessage(socket: Socket, message: Record<string, unknown>, engine: DownloadEngine): void {
  const { action } = message;

  if (action === 'ping') {
    sendBridgeResponse(socket, { status: 'ok', version: '0.1.0' });
    return;
  }

  if (action === 'add-download') {
    const url = String(message.url || '');
    if (!url) {
      sendBridgeResponse(socket, { status: 'error', error: 'No URL provided' });
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
