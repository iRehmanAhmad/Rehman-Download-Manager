import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';
import { registerAllIpc, getDownloadEngine } from './ipc';
import { initDatabase, getDatabase } from './storage/database';
import { DownloadEngine } from './download/engine';
import { startBrowserBridge, stopBrowserBridge } from './browser-bridge';
import { APP_NAME, SETTINGS_KEY, MAX_CONCURRENT_DOWNLOADS } from '@rdm/shared';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let engine: DownloadEngine;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

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

app.whenReady().then(async () => {
  await initDatabase();

  engine = new DownloadEngine();

  registerAllIpc(engine);
  loadEngineSettings();
  startBrowserBridge(engine);
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
  stopBrowserBridge();
  tray?.destroy();
  tray = null;
});
