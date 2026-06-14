import { Notification } from 'electron';
import { getDatabase } from '../storage/database';
import { SETTINGS_KEY } from '@rdm/shared';
import type { Download } from '@rdm/shared';

let notificationsEnabled = true;

export function initNotifications(): void {
  try {
    const db = getDatabase();
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(SETTINGS_KEY.SHOW_NOTIFICATIONS) as { value: string } | undefined;
    notificationsEnabled = row ? row.value === 'true' : true;
  } catch {
    notificationsEnabled = true;
  }
}

export function setNotificationsEnabled(enabled: boolean): void {
  notificationsEnabled = enabled;
}

export function notifyDownloadComplete(download: Download): void {
  if (!notificationsEnabled) return;

  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'Download Complete',
      body: `${download.filename} has finished downloading.`,
      urgency: 'normal',
    });
    n.on('click', () => {
    });
    n.show();
  }
}

export function notifyDownloadError(download: Download): void {
  if (!notificationsEnabled) return;

  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'Download Failed',
      body: `${download.filename}: ${download.errorMessage || 'Unknown error'}`,
      urgency: 'critical',
    });
    n.show();
  }
}

export function notifyClipboardUrl(url: string): void {
  if (!notificationsEnabled) return;

  if (Notification.isSupported()) {
    const n = new Notification({
      title: 'URL Detected in Clipboard',
      body: `Click to download: ${truncate(url, 80)}`,
      urgency: 'low',
    });
    n.show();
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.substring(0, max - 3) + '...';
}
