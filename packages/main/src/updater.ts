import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow } from 'electron';
import log from 'electron-log';

// Configure logging for the updater
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = 'info';

export function setupUpdater(mainWindow: BrowserWindow) {
  // Set up autoUpdater behavior
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Listen for update events
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available.', info);
    mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.', info);
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater.', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
    log.info(log_message);
    mainWindow.webContents.send('download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded.', info);
    mainWindow.webContents.send('update-downloaded', info);
  });

  // Handle IPC calls from the renderer
  ipcMain.handle('check-for-updates', () => {
    return autoUpdater.checkForUpdatesAndNotify();
  });

  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });
}
