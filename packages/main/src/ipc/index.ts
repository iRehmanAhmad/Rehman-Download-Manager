import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC_CHANNELS, type ScheduleEntry, type PluginInstance } from '@rdm/shared';
import { registerDownloadIpc, setDownloadEngine, getDownloadEngine } from './download.ipc';
import { registerSettingsIpc } from './settings.ipc';
import { registerCategoryIpc } from './category.ipc';
import { DownloadEngine } from '../download/engine';
import { registerScheduleIpc, loadSchedules } from '../scheduler';
import { registerAutomationIpc } from '../automation';
import { startClipboardMonitor, stopClipboardMonitor } from '../clipboard';
import { setNotificationsEnabled } from '../notifications';
import {
  scanPlugins,
  enablePlugin,
  disablePlugin,
  installPlugin,
  uninstallPlugin,
} from '../plugins/loader';

function registerPluginIpc(): void {
  ipcMain.handle(IPC_CHANNELS.PLUGIN_GET_ALL, (): PluginInstance[] => {
    return scanPlugins();
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_INSTALL, (_event, sourcePath: string): PluginInstance | null => {
    const instance = installPlugin(sourcePath);
    if (instance) {
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('plugin:installed', instance);
      });
    }
    return instance;
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_UNINSTALL, (_event, id: string): boolean => {
    return uninstallPlugin(id);
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_ENABLE, (_event, id: string): boolean => {
    return enablePlugin(id);
  });

  ipcMain.handle(IPC_CHANNELS.PLUGIN_DISABLE, (_event, id: string): boolean => {
    return disablePlugin(id);
  });
}

export function registerAllIpc(engine: DownloadEngine): void {
  setDownloadEngine(engine);

  registerDownloadIpc();
  registerSettingsIpc();
  registerCategoryIpc();
  registerPluginIpc();

  registerAutomationIpc();

  registerScheduleIpc({
    onTrigger(entry: ScheduleEntry) {
      engine.add({
        id: `sched-${Date.now()}`,
        url: entry.url,
        filename: entry.filename || 'scheduled-download',
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
