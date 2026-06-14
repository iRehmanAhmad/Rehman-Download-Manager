export const APP_NAME = 'RDM';
export const APP_VERSION = '0.1.0';
export const DEFAULT_CONNECTIONS = 8;
export const MAX_CONNECTIONS = 32;
export const MIN_CHUNK_SIZE = 1024 * 256;
export const DEFAULT_CATEGORY_ID = 'uncategorized';
export const DOWNLOAD_DIR = 'downloads';
export const TEMP_DIR = 'temp';
export const DB_FILENAME = 'rdm.db';
export const MAX_CONCURRENT_DOWNLOADS = 5;
export const CLIPBOARD_POLL_INTERVAL = 1000;
export const PROGRESS_UPDATE_INTERVAL = 500;
export const SPEED_AVERAGE_WINDOW = 5000;
export const PLUGIN_DIR = 'plugins';
export const SETTINGS_KEY = {
  GLOBAL_SPEED_LIMIT: 'globalSpeedLimit',
  MAX_CONCURRENT: 'maxConcurrent',
  DEFAULT_FOLDER: 'defaultFolder',
  TEMP_FOLDER: 'tempFolder',
  THEME: 'theme',
  AUTO_START: 'autoStart',
  MINIMIZE_TO_TRAY: 'minimizeToTray',
  SHOW_NOTIFICATIONS: 'showNotifications',
  CLIPBOARD_MONITOR: 'clipboardMonitor',
} as const;
