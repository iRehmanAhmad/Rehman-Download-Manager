import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC_CHANNELS, type ScheduleEntry } from '@rdm/shared';
import { registerDownloadIpc, setDownloadEngine, getDownloadEngine } from './download.ipc';
import { registerSettingsIpc } from './settings.ipc';
import { registerCategoryIpc } from './category.ipc';
import { DownloadEngine } from '../download/engine';
import { registerScheduleIpc, loadSchedules } from '../scheduler';
import { registerAutomationIpc } from '../automation';

export function registerAllIpc(engine: DownloadEngine): void {
  setDownloadEngine(engine);

  registerDownloadIpc();
  registerSettingsIpc();
  registerCategoryIpc();

  registerAutomationIpc();

  registerScheduleIpc({
    onTrigger(entry: ScheduleEntry) {
      engine.add({
        id: `sched-${Date.now()}`,
        url: entry.url,
        filename: entry.filename || undefined,
        categoryId: entry.categoryId,
        tempDir: '',
        fileSize: -1,
        downloaded: 0,
        status: 'queued',
        priority: 'normal',
        addedAt: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        speedLimit: undefined,
        numConnections: 8,
        headers: undefined,
        referer: undefined,
        checksum: undefined,
        chunks: [],
        speed: 0,
        progress: 0,
        eta: 0,
      });
    },
    loadAll: loadSchedules,
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => process.env.npm_package_version || '0.1.0');

  ipcMain.on(IPC_CHANNELS.APP_MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.APP_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.APP_CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  app.on('before-quit', () => {
    try {
      getDownloadEngine().pauseAll();
    } catch {
      // engine may not exist
    }
  });
}

export { getDownloadEngine };
