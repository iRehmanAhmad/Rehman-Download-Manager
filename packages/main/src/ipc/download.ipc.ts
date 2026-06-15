import { ipcMain, BrowserWindow, app, dialog } from 'electron';
import { IPC_CHANNELS, type Download, type DownloadOptions } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { DownloadEngine } from '../download/engine';
import { extractFilename, isValidUrl } from '@rdm/shared';
import { notifyDownloadComplete, notifyDownloadError } from '../notifications';
import { evaluateRules } from '../automation';
import { getDatabase } from '../storage/database';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
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
    const id = rawOptions.preId || uuid();
    const now = Date.now();

    const options = evaluateRules(rawOptions);

    let finalFilepath = options.filepath;
    const finalFilename = options.filename || extractFilename(options.url) || 'download';
    
    if (!finalFilepath) {
      try {
        const db = getDatabase();
        const defaultSavePathRow = db.prepare("SELECT value FROM settings WHERE key = 'defaultSavePath'").get() as { value: string } | undefined;
        let baseDir = defaultSavePathRow?.value || app.getPath('downloads');
        
        let subDir = '';
        if (options.categoryId) {
          const catRow = db.prepare('SELECT default_dir FROM categories WHERE id = ?').get(options.categoryId) as { default_dir: string } | undefined;
          if (catRow?.default_dir) {
            subDir = catRow.default_dir;
          }
        }
        finalFilepath = path.join(baseDir, subDir, finalFilename);
      } catch (e) {
        finalFilepath = path.join(app.getPath('downloads'), finalFilename);
      }
    }

    const download: Download = {
      id,
      url: options.url,
      filename: finalFilename,
      filepath: finalFilepath,
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
    sendToRenderer(IPC_CHANNELS.DOWNLOAD_ADDED, eng.getDownload(id) || download);
    emitQueueStatus();
    return eng.getDownload(id) || download;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_ALL, (): Download[] => {
    return getDownloadEngine().getAll();
  });

const fetchInfo = (currentUrl: string, redirectCount = 0): Promise<{ supportsRange: boolean; fileSize: number; contentType: string }> => {
  return new Promise((resolve) => {
    if (redirectCount > 5) return resolve({ supportsRange: false, fileSize: -1, contentType: '' });
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
          const contentType = headers['content-type'] || '';
          res.destroy();
          resolve({ supportsRange, fileSize, contentType });
        }
      );
      req.on('error', () => resolve({ supportsRange: false, fileSize: -1, contentType: '' }));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ supportsRange: false, fileSize: -1, contentType: '' });
      });
      req.end();
    } catch (err) {
      resolve({ supportsRange: false, fileSize: -1, contentType: '' });
    }
  });
};

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_FILE_INFO_BASIC, async (_event, urlStr: string) => {
    return await fetchInfo(urlStr);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_FILE_INFO, async (_event, urlStr: string) => {
    const info = await fetchInfo(urlStr);
    let preId: string | undefined = undefined;
    if (info.fileSize > 0) {
      preId = `pre-${uuid()}`;
      const dl: Download = {
        id: preId,
        url: urlStr,
        filename: extractFilename(urlStr) || 'download',
        filepath: '',
        tempDir: '',
        fileSize: info.fileSize,
        downloaded: 0,
        status: 'queued',
        priority: 'normal',
        addedAt: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        numConnections: 8,
        chunks: [],
        speed: 0,
        progress: 0,
        eta: 0,
      };
      getDownloadEngine().addPreDownload(dl);
    }
    return { ...info, preId };
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_DISCARD_PRE, (_event, preId: string): boolean => {
    return getDownloadEngine().discardPreDownload(preId);
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
    const eng = getDownloadEngine();
    return eng.remove(id);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CLEAR_COMPLETED, async () => {
    const eng = getDownloadEngine();
    eng.clearCompleted();
    const db = getDatabase();
    db.prepare("DELETE FROM downloads WHERE status = 'completed'").run();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_MOVE, async (_event, id: string, newPath: string): Promise<boolean> => {
    const eng = getDownloadEngine();
    const task = eng.getDownload(id);
    if (!task) return false;
    
    // Move the file on disk
    if (task.filepath && fs.existsSync(task.filepath)) {
      try {
        fs.renameSync(task.filepath, newPath);
      } catch (err: any) {
        if (err.code === 'EXDEV') {
          try {
            fs.copyFileSync(task.filepath, newPath);
            fs.unlinkSync(task.filepath);
          } catch (copyErr) {
            console.error('Failed to move file across drives:', copyErr);
            return false;
          }
        } else {
          console.error('Failed to move file:', err);
          return false;
        }
      }
    }
    
    const ok = eng.updateFilePath(id, newPath);
    if (ok) emitQueueStatus();
    return ok;
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

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_EXPORT, async (_event, options: { format: 'ef2' | 'txt', mode: 'queue' | 'selected' | 'all', selectedIds: string[] }): Promise<void> => {
    const { format, mode, selectedIds } = options;
    const eng = getDownloadEngine();
    let downloads = eng.getAll();

    if (mode === 'queue') {
      downloads = downloads.filter(d => ['queued', 'paused', 'downloading'].includes(d.status));
    } else if (mode === 'selected') {
      downloads = downloads.filter(d => selectedIds.includes(d.id));
    }

    if (downloads.length === 0) return;

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export download list',
      defaultPath: format === 'ef2' ? 'export.ef2' : 'export.txt',
      filters: format === 'ef2' 
        ? [{ name: 'RDM Export Files', extensions: ['ef2'] }]
        : [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (canceled || !filePath) return;

    const fs = require('node:fs');
    if (format === 'ef2') {
      // Export as JSON string format for easy re-importing
      const data = JSON.stringify(downloads, null, 2);
      fs.writeFileSync(filePath, data, 'utf-8');
    } else {
      // Export as plain text (URLs only)
      const data = downloads.map(d => d.url).join('\n');
      fs.writeFileSync(filePath, data, 'utf-8');
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_IMPORT, async (_event, format: 'ef2' | 'txt'): Promise<string | void> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import download list',
      filters: format === 'ef2' 
        ? [{ name: 'RDM Export Files', extensions: ['ef2'] }]
        : [{ name: 'Text Files', extensions: ['txt'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return;

    const fs = require('node:fs');
    const content = fs.readFileSync(filePaths[0], 'utf-8');

    if (format === 'txt') {
      return content; // Return to renderer to handle via Batch dialog
    } else {
      try {
        const downloads: Download[] = JSON.parse(content);
        // Return the full JSON array string so frontend can use the pre-saved metadata (names, sizes, types)
        return JSON.stringify(downloads);
      } catch (err) {
        console.error('Failed to parse ef2 file:', err);
        throw new Error('Invalid EF2 file format');
      }
    }
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
