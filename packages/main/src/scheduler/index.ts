import { ipcMain } from 'electron';
import { IPC_CHANNELS, type ScheduleEntry } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../storage/database';
import { getNextRun, isValidCron } from './cron';

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function rowToEntry(row: Record<string, unknown>): ScheduleEntry {
  return {
    id: row.id as string,
    name: (row.name as string) || undefined,
    url: row.url as string,
    filename: (row.filename as string) || undefined,
    categoryId: (row.category_id as string) || undefined,
    cronExpression: row.cron_expression as string,
    startTime: (row.start_time as string) || undefined,
    stopTime: (row.stop_time as string) || undefined,
    daysOfWeek: (row.days_of_week as string) || undefined,
    active: !!(row.active as number),
    lastRun: (row.last_run as number) || undefined,
    nextRun: (row.next_run as number) || undefined,
  };
}

function scheduleNext(entry: ScheduleEntry, onTrigger: (entry: ScheduleEntry) => void): void {
  clearTimer(entry.id);

  if (!entry.active) return;

  const nextRun = getNextRun(entry);
  if (!nextRun) return;

  const delay = nextRun - Date.now();
  if (delay <= 0) return;

  const timer = setTimeout(() => {
    onTrigger(entry);
    activeTimers.delete(entry.id);
  }, delay);

  activeTimers.set(entry.id, timer);
}

function clearTimer(id: string): void {
  const timer = activeTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(id);
  }
}

export function registerScheduleIpc(options: {
  onTrigger: (entry: ScheduleEntry) => void;
  loadAll: () => ScheduleEntry[];
}): void {
  const db = getDatabase();

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_GET_ALL, (): ScheduleEntry[] => {
    return options.loadAll();
  });

  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_CREATE,
    (_event, data: Omit<ScheduleEntry, 'id'>): ScheduleEntry => {
      const id = uuid();
      const nextRun = getNextRun({ id, ...data } as ScheduleEntry);

      db.prepare(
        `INSERT INTO schedules (id, name, url, filename, category_id, cron_expression, start_time, stop_time, days_of_week, active, last_run, next_run)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        data.name || null,
        data.url,
        data.filename || null,
        data.categoryId || null,
        data.cronExpression,
        data.startTime || null,
        data.stopTime || null,
        data.daysOfWeek || null,
        data.active !== false ? 1 : 0,
        data.lastRun || null,
        nextRun || null,
      );

      const entry: ScheduleEntry = { id, ...data, nextRun: nextRun || undefined };
      scheduleNext(entry, options.onTrigger);
      return entry;
    },
  );

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_UPDATE, (_event, entry: ScheduleEntry): boolean => {
    const nextRun = getNextRun(entry);

    const result = db
      .prepare(
        `UPDATE schedules SET name=?, url=?, filename=?, category_id=?, cron_expression=?, start_time=?, stop_time=?, days_of_week=?, active=?, last_run=?, next_run=?
         WHERE id=?`,
      )
      .run(
        entry.name || null,
        entry.url,
        entry.filename || null,
        entry.categoryId || null,
        entry.cronExpression,
        entry.startTime || null,
        entry.stopTime || null,
        entry.daysOfWeek || null,
        entry.active !== false ? 1 : 0,
        entry.lastRun || null,
        nextRun || null,
        entry.id,
      );

    if (result.changes > 0) {
      scheduleNext({ ...entry, nextRun: nextRun || undefined }, options.onTrigger);
      return true;
    }
    return false;
  });

  ipcMain.handle(IPC_CHANNELS.SCHEDULE_DELETE, (_event, id: string): boolean => {
    clearTimer(id);
    const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

export function loadSchedules(): ScheduleEntry[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM schedules ORDER BY next_run ASC')
    .all() as Record<string, unknown>[];
  return rows.map(rowToEntry);
}
