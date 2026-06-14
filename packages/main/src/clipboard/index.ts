import { clipboard, BrowserWindow } from 'electron';
import { IPC_CHANNELS, isValidUrl } from '@rdm/shared';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastText = '';

export function startClipboardMonitor(): void {
  if (pollTimer) return;

  pollTimer = setInterval(() => {
    try {
      const text = clipboard.readText();
      if (!text || text === lastText) return;
      lastText = text;

      if (isValidUrl(text.trim())) {
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send(IPC_CHANNELS.CLIPBOARD_URL, text.trim());
        });
      }
    } catch {
      // clipboard read can fail
    }
  }, 1500);
}

export function stopClipboardMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    lastText = '';
  }
}

export function isClipboardMonitorRunning(): boolean {
  return pollTimer !== null;
}
