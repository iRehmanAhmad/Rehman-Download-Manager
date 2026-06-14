import { join } from 'path';

export function getAppDataDir(app: Electron.App): string {
  const userData = app.getPath('userData');
  return userData;
}

export function getDownloadsDir(app: Electron.App): string {
  return app.getPath('downloads');
}

export function getPluginDir(app: Electron.App): string {
  return join(getAppDataDir(app), 'plugins');
}

export function ensureDir(dir: string): void {
  const fs = require('fs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
