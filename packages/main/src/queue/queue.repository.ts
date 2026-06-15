import { getDatabase } from '../storage/database';
import { QueueSettings } from '@rdm/shared';
import { randomUUID } from 'crypto';

export class QueueRepository {
  public getAll(): QueueSettings[] {
    const stmt = getDatabase().prepare('SELECT * FROM queues');
    const rows = stmt.all() as any[];
    return rows.map(this.mapRowToQueue);
  }

  public getById(id: string): QueueSettings | undefined {
    const stmt = getDatabase().prepare('SELECT * FROM queues WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return undefined;
    return this.mapRowToQueue(row as any);
  }

  public create(queue: Omit<QueueSettings, 'id' | 'type'>): QueueSettings {
    const id = randomUUID();
    const type = 'custom';
    
    const stmt = getDatabase().prepare(`
      INSERT INTO queues (
        id, name, type, scheduleType, startOnStartup, startAt, runOnceAt, 
        runDaily, daysOfWeek, startEveryHours, startEveryMinutes, stopAt, 
        retries, openFileWhenDone, hangUpModem, exitWhenDone, turnOffComputer, 
        turnOffAction, forceTerminate, limitEnabled, limitMB, limitHours, limitShowWarning
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      queue.name,
      type,
      queue.scheduleType,
      queue.startOnStartup ? 1 : 0,
      queue.startAt || null,
      queue.runOnceAt || null,
      queue.runDaily ? 1 : 0,
      JSON.stringify(queue.daysOfWeek || []),
      queue.startEveryHours || null,
      queue.startEveryMinutes || null,
      queue.stopAt || null,
      queue.retries || 10,
      queue.openFileWhenDone || null,
      queue.hangUpModem ? 1 : 0,
      queue.exitWhenDone ? 1 : 0,
      queue.turnOffComputer ? 1 : 0,
      queue.turnOffAction || 'shutdown',
      queue.forceTerminate ? 1 : 0,
      queue.limitEnabled ? 1 : 0,
      queue.limitMB || null,
      queue.limitHours || null,
      queue.limitShowWarning !== false ? 1 : 0
    );

    return this.getById(id)!;
  }

  public update(queue: QueueSettings): boolean {
    const stmt = getDatabase().prepare(`
      UPDATE queues SET
        name = ?, scheduleType = ?, startOnStartup = ?, startAt = ?, runOnceAt = ?, 
        runDaily = ?, daysOfWeek = ?, startEveryHours = ?, startEveryMinutes = ?, stopAt = ?, 
        retries = ?, openFileWhenDone = ?, hangUpModem = ?, exitWhenDone = ?, turnOffComputer = ?, 
        turnOffAction = ?, forceTerminate = ?, limitEnabled = ?, limitMB = ?, limitHours = ?, limitShowWarning = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      queue.name,
      queue.scheduleType,
      queue.startOnStartup ? 1 : 0,
      queue.startAt || null,
      queue.runOnceAt || null,
      queue.runDaily ? 1 : 0,
      JSON.stringify(queue.daysOfWeek || []),
      queue.startEveryHours || null,
      queue.startEveryMinutes || null,
      queue.stopAt || null,
      queue.retries || 10,
      queue.openFileWhenDone || null,
      queue.hangUpModem ? 1 : 0,
      queue.exitWhenDone ? 1 : 0,
      queue.turnOffComputer ? 1 : 0,
      queue.turnOffAction || 'shutdown',
      queue.forceTerminate ? 1 : 0,
      queue.limitEnabled ? 1 : 0,
      queue.limitMB || null,
      queue.limitHours || null,
      queue.limitShowWarning !== false ? 1 : 0,
      queue.id
    );

    return result.changes > 0;
  }

  public delete(id: string): boolean {
    if (id === 'main' || id === 'sync') return false; // Prevent deleting core queues
    
    // Move downloads to main queue
    const moveStmt = getDatabase().prepare("UPDATE downloads SET queue_id = 'main' WHERE queue_id = ?");
    moveStmt.run(id);

    const stmt = getDatabase().prepare('DELETE FROM queues WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  private mapRowToQueue(row: any): QueueSettings {
    return {
      id: row.id,
      name: row.name,
      type: row.type as 'main' | 'sync' | 'custom',
      scheduleType: row.scheduleType as 'one-time' | 'periodic',
      startOnStartup: Boolean(row.startOnStartup),
      startAt: row.startAt || undefined,
      runOnceAt: row.runOnceAt || undefined,
      runDaily: Boolean(row.runDaily),
      daysOfWeek: JSON.parse(row.daysOfWeek || '[]'),
      startEveryHours: row.startEveryHours || undefined,
      startEveryMinutes: row.startEveryMinutes || undefined,
      stopAt: row.stopAt || undefined,
      retries: row.retries,
      openFileWhenDone: row.openFileWhenDone || undefined,
      hangUpModem: Boolean(row.hangUpModem),
      exitWhenDone: Boolean(row.exitWhenDone),
      turnOffComputer: Boolean(row.turnOffComputer),
      turnOffAction: row.turnOffAction as 'shutdown' | 'restart' | 'sleep' | 'hibernate',
      forceTerminate: Boolean(row.forceTerminate),
      limitEnabled: Boolean(row.limitEnabled),
      limitMB: row.limitMB || undefined,
      limitHours: row.limitHours || undefined,
      limitShowWarning: Boolean(row.limitShowWarning)
    };
  }
}

let repository: QueueRepository;

export function getQueueRepository(): QueueRepository {
  if (!repository) {
    repository = new QueueRepository();
  }
  return repository;
}
