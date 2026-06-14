import { ipcMain } from 'electron';
import { getDatabase } from '../storage/database';

const defaults: Record<string, string> = {
  globalSpeedLimit: '0',
  maxConcurrent: '5',
  defaultFolder: '',
  tempFolder: '',
  theme: 'dark',
  autoStart: 'false',
  minimizeToTray: 'true',
  showNotifications: 'true',
  clipboardMonitor: 'true',
};

function ensureDefaults(): void {
  const db = getDatabase();
  const insertStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insertStmt.run(key, value);
  }
}

export function registerSettingsIpc(): void {
  ensureDefaults();

  ipcMain.handle('settings:get', (_event, key: string): string | null => {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? defaults[key] ?? null;
  });

  ipcMain.handle('settings:set', (_event, key: string, value: string): boolean => {
    const db = getDatabase();
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
      key,
      String(value),
    );
    return true;
  });

  ipcMain.handle('settings:get-all', (): Record<string, string> => {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value FROM settings').all() as {
      key: string;
      value: string;
    }[];
    const result: Record<string, string> = { ...defaults };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  });
}
