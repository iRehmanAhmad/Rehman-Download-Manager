import { ipcMain } from 'electron';

const settings = new Map<string, unknown>();

const defaults: Record<string, unknown> = {
  globalSpeedLimit: 0,
  maxConcurrent: 5,
  defaultFolder: '',
  tempFolder: '',
  theme: 'dark',
  autoStart: false,
  minimizeToTray: true,
  showNotifications: true,
  clipboardMonitor: true,
};

export function registerSettingsIpc(): void {
  for (const [key, value] of Object.entries(defaults)) {
    if (!settings.has(key)) {
      settings.set(key, value);
    }
  }

  ipcMain.handle('settings:get', (_event, key: string): unknown => {
    return settings.get(key) ?? defaults[key] ?? null;
  });

  ipcMain.handle('settings:set', (_event, key: string, value: unknown): boolean => {
    settings.set(key, value);
    return true;
  });

  ipcMain.handle('settings:get-all', (): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...defaults };
    for (const [key, value] of settings.entries()) {
      result[key] = value;
    }
    return result;
  });
}
