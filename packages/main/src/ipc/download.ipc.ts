import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS, type Download, type DownloadOptions } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { DownloadEngine } from '../download/engine';
import { extractFilename, isValidUrl } from '@rdm/shared';

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
    emitQueueStatus();
  });

  engineEvents.on('error', (dl: Download) => {
    sendToRenderer(IPC_CHANNELS.DOWNLOAD_ERROR, dl);
    emitQueueStatus();
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_ADD, (_event, options: DownloadOptions): Download => {
    const eng = getDownloadEngine();
    const id = uuid();
    const now = Date.now();

    const download: Download = {
      id,
      url: options.url,
      filename: options.filename || extractFilename(options.url) || 'download',
      tempDir: '',
      fileSize: -1,
      downloaded: 0,
      status: 'queued',
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

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_SET_SPEED_LIMIT, (_event, id: string, limit: number): boolean => {
    return getDownloadEngine().setSpeedLimit(id, limit);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_SET_CONNECTIONS, (_event, id: string, count: number): boolean => {
    return getDownloadEngine().setConnections(id, count);
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
