import { app, BrowserWindow, Tray, Menu, nativeImage, screen } from 'electron';
import { join } from 'path';
import * as fs from 'fs';
import contextMenu from 'electron-context-menu';
import { registerAllIpc, getDownloadEngine } from './ipc';
import { initDatabase, getDatabase } from './storage/database';
import { DownloadEngine } from './download/engine';
import { startBrowserBridge, stopBrowserBridge } from './browser-bridge';
import { installNativeHost } from './browser-bridge/install-host';
import { startClipboardMonitor, stopClipboardMonitor } from './clipboard';
import { initNotifications } from './notifications';
import { getQueueManager } from './queue/queue.manager';
import { loadEnabledPlugins, unloadAllPlugins } from './plugins/loader';
import { APP_NAME, SETTINGS_KEY, MAX_CONCURRENT_DOWNLOADS } from '@rdm/shared';

const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL;

// Write crash logs into the app's data dir (not the user's Desktop).
function crashLogPath(): string {
  const dir = join(app.getPath('userData'), 'logs');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { /* best effort */ }
  return join(dir, 'crash.log');
}

function appendCrashLog(label: string, detail: string): void {
  try {
    fs.appendFileSync(crashLogPath(), `\n[${new Date().toISOString()}] ${label}:\n${detail}\n`);
  } catch { /* best effort */ }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  appendCrashLog('Uncaught Exception', error.stack || error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  appendCrashLog('Unhandled Rejection', reason instanceof Error ? (reason.stack ?? reason.message) : String(reason));
});

// Disable hardware acceleration BEFORE app.on('ready') to fix black/invisible screen issues
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let engine: DownloadEngine;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 400,
    title: APP_NAME,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    transparent: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Sandbox the renderer. The preload only uses electron's contextBridge/
      // ipcRenderer (both sandbox-safe), so no Node APIs leak into the renderer.
      sandbox: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  if (isDev) {
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('[main] renderer loaded');
    });

    mainWindow.webContents.on('console-message', (_event, _level, message) => {
      console.log(`[renderer console] ${message}`);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    const url = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
    mainWindow.loadURL(url);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function createTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show RDM', click: () => mainWindow?.show() },
    {
      label: 'Pause All',
      click: () => {
        try { engine.pauseAll(); } catch { /* ignore */ }
      },
    },
    {
      label: 'Resume All',
      click: () => {
        try { engine.resumeAll(); } catch { /* ignore */ }
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip(APP_NAME);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

function loadEngineSettings(): void {
  try {
    const db = getDatabase();
    const concurrencyRow = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(SETTINGS_KEY.MAX_CONCURRENT) as { value: string } | undefined;
    const concurrency = parseInt(concurrencyRow?.value || String(MAX_CONCURRENT_DOWNLOADS), 10);
    engine.setMaxConcurrent(Math.max(1, Math.min(concurrency, 32)));

    const speedLimitRow = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(SETTINGS_KEY.GLOBAL_SPEED_LIMIT) as { value: string } | undefined;
    const speedLimit = parseInt(speedLimitRow?.value || '0', 10);
    engine.setGlobalSpeedLimit(Math.max(0, speedLimit));
  } catch {
    // settings table may not exist yet
  }
}

function getClipboardEnabled(): boolean {
  try {
    const db = getDatabase();
    const row = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(SETTINGS_KEY.CLIPBOARD_MONITOR) as { value: string } | undefined;
    return row ? row.value === 'true' : false;
  } catch {
    return false;
  }
}

app.whenReady().then(async () => {
  await initDatabase();

  engine = new DownloadEngine();

  registerAllIpc(engine);
  loadEngineSettings();
  initNotifications();
  if (getClipboardEnabled()) startClipboardMonitor();
  installNativeHost();
  startBrowserBridge(engine);
  getQueueManager().start();
  loadEnabledPlugins();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopClipboardMonitor();
  stopBrowserBridge();
  unloadAllPlugins();
  tray?.destroy();
  tray = null;
});
