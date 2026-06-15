import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS, type Download, type DownloadOptions } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { DownloadEngine } from '../download/engine';
import { extractFilename, isValidUrl } from '@rdm/shared';
import { notifyDownloadComplete, notifyDownloadError } from '../notifications';
import { evaluateRules } from '../automation';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

let engine: DownloadEngine | null = null;

export function setDownloadEngine(e: DownloadEngine): void {
  engine = e;
}

export function getDownloadEngine(): DownloadEngine {
  if (!engine) throw new Error('Download engine not initialized');
  return engine;
}

function sendToRenderer(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(channel, data);
  });
}

function getQueueStatus() {
  return getDownloadEngine().getQueueStatus();
}

function emitQueueStatus() {
  sendToRenderer(IPC_CHANNELS.QUEUE_STATUS, getQueueStatus());
}

export function registerDownloadIpc(): void {
  const engineEvents = getDownloadEngine();

  engineEvents.on('progress', (dl: Download) => {
    sendToRenderer(IPC_CHANNELS.DOWNLOAD_PROGRESS, dl);
    emitQueueStatus();
  });

  engineEvents.on('completed', (dl: Download) => {
    sendToRenderer(IPC_CHANNELS.DOWNLOAD_COMPLETED, dl);
    notifyDownloadComplete(dl);
    emitQueueStatus();
  });

  engineEvents.on('error', (dl: Download) => {
    sendToRenderer(IPC_CHANNELS.DOWNLOAD_ERROR, dl);
    notifyDownloadError(dl);
    emitQueueStatus();
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_ADD, (_event, rawOptions: DownloadOptions): Download => {
    const eng = getDownloadEngine();
    const id = uuid();
    const now = Date.now();

    const options = evaluateRules(rawOptions);

    const download: Download = {
      id,
      url: options.url,
      filename: options.filename || extractFilename(options.url) || 'download',
      filepath: options.filepath,
      tempDir: '',
      fileSize: -1,
      downloaded: 0,
      status: options.paused ? 'paused' : 'queued',
      priority: options.priority || 'normal',
      categoryId: options.categoryId,
      addedAt: now,
      retryCount: 0,
      maxRetries: 3,
      speedLimit: options.speedLimit,
      numConnections: options.numConnections || 8,
      headers: options.headers,
      referer: options.referer,
      checksum: options.checksum,
      metadata: options.metadata,
      chunks: [],
      speed: 0,
      progress: 0,
      eta: 0,
    };

    eng.add(download);
    emitQueueStatus();
    return download;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_ALL, (): Download[] => {
    return getDownloadEngine().getAll();
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_FILE_INFO, async (_event, urlStr: string) => {
    const fetchInfo = (currentUrl: string, redirectCount = 0): Promise<{ supportsRange: boolean; fileSize: number }> => {
      return new Promise((resolve) => {
        if (redirectCount > 5) return resolve({ supportsRange: false, fileSize: -1 });
        try {
          const parsedUrl = new URL(currentUrl);
          const mod = parsedUrl.protocol === 'https:' ? https : http;
          const req = mod.request(
            {
              hostname: parsedUrl.hostname,
              port: parsedUrl.port,
              path: parsedUrl.pathname + parsedUrl.search,
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
              }
            },
            (res) => {
              if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.destroy();
                let nextUrl = res.headers.location;
                if (!nextUrl.startsWith('http')) {
                  nextUrl = new URL(nextUrl, currentUrl).href;
                }
                return resolve(fetchInfo(nextUrl, redirectCount + 1));
              }

              const headers = res.headers;
              const acceptRanges = String(headers['accept-ranges'] || '');
              const supportsRange =
                acceptRanges.includes('bytes') &&
                headers['content-length'] != null;
              let fileSize = parseInt(headers['content-length'] || '-1', 10);
              if (isNaN(fileSize)) fileSize = -1;
              res.destroy();
              resolve({ supportsRange, fileSize });
            }
          );
          req.on('error', () => resolve({ supportsRange: false, fileSize: -1 }));
          req.setTimeout(5000, () => {
            req.destroy();
            resolve({ supportsRange: false, fileSize: -1 });
          });
          req.end();
        } catch (err) {
          resolve({ supportsRange: false, fileSize: -1 });
        }
      });
    };
    return fetchInfo(urlStr);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET, (_event, id: string): Download | undefined => {
    return getDownloadEngine().getDownload(id);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_PAUSE, (_event, id: string): boolean => {
    const ok = getDownloadEngine().pause(id);
    if (ok) emitQueueStatus();
    return ok;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RESUME, (_event, id: string): boolean => {
    const ok = getDownloadEngine().resume(id);
    if (ok) emitQueueStatus();
    return ok;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CANCEL, (_event, id: string): boolean => {
    const ok = getDownloadEngine().cancel(id);
    if (ok) emitQueueStatus();
    return ok;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REMOVE, (_event, id: string): boolean => {
    const ok = getDownloadEngine().remove(id);
    if (ok) emitQueueStatus();
    return ok;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_MOVE, (_event, id: string, newPath: string): boolean => {
    const dl = getDownloadEngine().getDownload(id);
    if (!dl) return false;
    
    try {
      if (dl.status === 'completed' && dl.filepath) {
        const fs = require('fs');
        if (fs.existsSync(dl.filepath)) {
          fs.renameSync(dl.filepath, newPath);
        }
      }
      
      const ok = getDownloadEngine().updateFilePath(id, newPath);
      if (ok) emitQueueStatus();
      return ok;
    } catch (e) {
      console.error('Move error:', e);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_SET_SPEED_LIMIT, (_event, id: string, limit: number): boolean => {
    return getDownloadEngine().setSpeedLimit(id, limit);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_SET_CONNECTIONS, (_event, id: string, count: number): boolean => {
    return getDownloadEngine().setConnections(id, count);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_OPEN_FILE, async (_event, id: string): Promise<boolean> => {
    const dl = getDownloadEngine().getDownload(id);
    if (!dl || !dl.filepath) return false;
    const { shell } = require('electron');
    const result = await shell.openPath(dl.filepath);
    return result === '';
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_OPEN_FOLDER, (_event, id: string): boolean => {
    const dl = getDownloadEngine().getDownload(id);
    if (!dl || !dl.filepath) return false;
    const { shell } = require('electron');
    shell.showItemInFolder(dl.filepath);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_START_ALL, (): boolean => {
    try { getDownloadEngine().resumeAll(); emitQueueStatus(); return true; } catch { return false; }
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_PAUSE_ALL, (): boolean => {
    try { getDownloadEngine().pauseAll(); emitQueueStatus(); return true; } catch { return false; }
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_SET_CONCURRENCY, (_event, n: number): boolean => {
    try { getDownloadEngine().setMaxConcurrent(n); emitQueueStatus(); return true; } catch { return false; }
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_SET_GLOBAL_SPEED_LIMIT, (_event, limit: number): boolean => {
    try { getDownloadEngine().setGlobalSpeedLimit(limit); emitQueueStatus(); return true; } catch { return false; }
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_REORDER, (_event, orderedIds: string[]): boolean => {
    try { getDownloadEngine().reorder(orderedIds); return true; } catch { return false; }
  });
}
