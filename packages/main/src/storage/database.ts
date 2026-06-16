import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import { join } from 'path';
import { DB_FILENAME } from '@rdm/shared';

let db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS downloads (
    id              TEXT PRIMARY KEY,
    url             TEXT NOT NULL,
    filename        TEXT NOT NULL,
    filepath        TEXT,
    temp_dir        TEXT,
    file_size       INTEGER DEFAULT -1,
    downloaded      INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'queued',
    priority        TEXT DEFAULT 'normal',
    category_id     TEXT,
    added_at        INTEGER NOT NULL,
    completed_at    INTEGER,
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,
    max_retries     INTEGER DEFAULT 3,
    speed_limit     INTEGER,
    num_connections INTEGER DEFAULT 8,
    headers         TEXT,
    cookies         TEXT,
    referer         TEXT,
    user_agent      TEXT,
    checksum        TEXT,
    metadata        TEXT
);

CREATE TABLE IF NOT EXISTS chunks (
    id              TEXT PRIMARY KEY,
    download_id     TEXT NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    start_byte      INTEGER NOT NULL,
    end_byte        INTEGER NOT NULL,
    downloaded      INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'pending',
    retry_count     INTEGER DEFAULT 0,
    UNIQUE(download_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS categories (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    default_dir     TEXT NOT NULL,
    icon            TEXT,
    color           TEXT,
    sort_order      INTEGER DEFAULT 0,
    extensions      TEXT,
    save_last_folder INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS schedules (
    id              TEXT PRIMARY KEY,
    name            TEXT,
    url             TEXT NOT NULL,
    filename        TEXT,
    category_id     TEXT,
    cron_expression TEXT NOT NULL,
    start_time      TEXT,
    stop_time       TEXT,
    days_of_week    TEXT,
    active          INTEGER DEFAULT 1,
    last_run        INTEGER,
    next_run        INTEGER
);

CREATE TABLE IF NOT EXISTS automation_rules (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    enabled         INTEGER DEFAULT 1,
    priority        INTEGER DEFAULT 0,
    conditions      TEXT NOT NULL,
    actions         TEXT NOT NULL,
    stop_processing INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cloud_providers (
    id              TEXT PRIMARY KEY,
    provider_type   TEXT NOT NULL,
    display_name    TEXT,
    credentials     TEXT,
    sync_folder     TEXT,
    auto_upload     INTEGER DEFAULT 0,
    enabled         INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS plugins (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    version         TEXT NOT NULL,
    author          TEXT,
    description     TEXT,
    entry_point     TEXT NOT NULL,
    enabled         INTEGER DEFAULT 1,
    permissions     TEXT,
    installed_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL
);

INSERT OR IGNORE INTO categories (id, name, default_dir, color, sort_order) VALUES
    ('music', 'Music', 'Music', '#ec4899', 1),
    ('videos', 'Videos', 'Videos', '#8b5cf6', 2),
    ('documents', 'Documents', 'Documents', '#3b82f6', 3),
    ('archives', 'Archives', 'Archives', '#f59e0b', 4),
    ('programs', 'Programs', 'Programs', '#10b981', 5),
    ('other', 'Other', 'Other', '#6b7280', 99);

INSERT OR IGNORE INTO settings (key, value) VALUES
    ('globalSpeedLimit', '0'),
    ('maxConcurrent', '5'),
    ('theme', 'dark'),
    ('autoStart', 'false'),
    ('minimizeToTray', 'true'),
    ('showNotifications', 'true'),
    ('clipboardMonitor', 'true'),
    ('proxyUrl', ''),
    ('antivirusEnabled', 'false'),
    ('antivirusCmd', '');

CREATE TABLE IF NOT EXISTS queues (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    type              TEXT NOT NULL,
    scheduleType      TEXT NOT NULL DEFAULT 'one-time',
    startOnStartup    INTEGER DEFAULT 0,
    startAt           TEXT,
    runOnceAt         TEXT,
    runDaily          INTEGER DEFAULT 0,
    daysOfWeek        TEXT DEFAULT '[]',
    startEveryHours   INTEGER,
    startEveryMinutes INTEGER,
    stopAt            TEXT,
    retries           INTEGER DEFAULT 10,
    openFileWhenDone  TEXT,
    hangUpModem       INTEGER DEFAULT 0,
    exitWhenDone      INTEGER DEFAULT 0,
    turnOffComputer   INTEGER DEFAULT 0,
    turnOffAction     TEXT DEFAULT 'shutdown',
    forceTerminate    INTEGER DEFAULT 0,
    limitEnabled      INTEGER DEFAULT 0,
    limitMB           INTEGER,
    limitHours        INTEGER,
    limitShowWarning  INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO queues (id, name, type) VALUES
    ('main', 'Main download queue', 'main'),
    ('sync', 'Synchronization queue', 'sync');
`;

export async function initDatabase(): Promise<void> {
  const dbPath = join(app.getPath('userData'), DB_FILENAME);
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);

  try {
    db.exec("ALTER TABLE downloads ADD COLUMN queue_id TEXT DEFAULT 'main'");
  } catch (e) {
    // Column might already exist
  }

  try {
    db.exec("ALTER TABLE categories ADD COLUMN extensions TEXT");
    db.exec("ALTER TABLE categories ADD COLUMN save_last_folder INTEGER DEFAULT 0");
  } catch (e) {
    // Columns might already exist
  }
}
