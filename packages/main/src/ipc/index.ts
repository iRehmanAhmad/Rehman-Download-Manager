import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@rdm/shared';
import { registerDownloadIpc } from './download.ipc';
import { registerSettingsIpc } from './settings.ipc';
import { registerCategoryIpc } from './category.ipc';

export function registerAllIpc(): void {
  registerDownloadIpc();
  registerSettingsIpc();
  registerCategoryIpc();

  ipcMain.handle('app:get-version', () => process.env.npm_package_version || '0.1.0');
  ipcMain.on('app:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.on('app:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.on('app:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
