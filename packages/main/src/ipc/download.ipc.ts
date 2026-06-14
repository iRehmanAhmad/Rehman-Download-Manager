import { ipcMain } from 'electron';
import { IPC_CHANNELS, type Download, type DownloadOptions } from '@rdm/shared';
import { v4 as uuid } from 'uuid';

const downloads = new Map<string, Download>();

export function registerDownloadIpc(): void {
  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_ADD, (_event, options: DownloadOptions): Download => {
    const id = uuid();
    const now = Date.now();

    const download: Download = {
      id,
      url: options.url,
      filename: options.filename || 'download',
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

    downloads.set(id, download);
    return download;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_ALL, (): Download[] => {
    return Array.from(downloads.values());
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET, (_event, id: string): Download | undefined => {
    return downloads.get(id);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_PAUSE, (_event, id: string): boolean => {
    const dl = downloads.get(id);
    if (dl) {
      dl.status = 'paused';
      return true;
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RESUME, (_event, id: string): boolean => {
    const dl = downloads.get(id);
    if (dl) {
      dl.status = 'downloading';
      return true;
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CANCEL, (_event, id: string): boolean => {
    const dl = downloads.get(id);
    if (dl) {
      dl.status = 'cancelled';
      return true;
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REMOVE, (_event, id: string): boolean => {
    return downloads.delete(id);
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_SET_SPEED_LIMIT, (_event, id: string, limit: number): boolean => {
    const dl = downloads.get(id);
    if (dl) {
      dl.speedLimit = limit;
      return true;
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_SET_CONNECTIONS, (_event, id: string, count: number): boolean => {
    const dl = downloads.get(id);
    if (dl) {
      dl.numConnections = Math.max(1, Math.min(count, 32));
      return true;
    }
    return false;
  });
}
