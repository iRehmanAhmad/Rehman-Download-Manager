import { DatabaseSync } from 'node:sqlite';
import { app } from 'electron';
import { join } from 'path';
import { readFileSync } from 'fs';
import { DB_FILENAME } from '@rdm/shared';

let db: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const dbPath = join(app.getPath('userData'), DB_FILENAME);

  db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  const migrationPath = join(__dirname, 'migrations', '001-initial.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  db.exec(sql);
}
