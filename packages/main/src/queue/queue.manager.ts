import { getQueueRepository } from './queue.repository';
import { getDownloadEngine } from '../ipc/download.ipc';
import { QueueSettings } from '@rdm/shared';

class QueueManager {
  private timer: NodeJS.Timeout | null = null;
  private runningQueues = new Set<string>();

  public start() {
    if (this.timer) return;
    
    // Check every minute if a queue needs to start or stop
    this.timer = setInterval(() => {
      this.checkSchedules();
    }, 60000);
    
    // Run immediately on start
    this.checkSchedules();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public startQueue(id: string) {
    if (id === 'limits') return;
    const engine = getDownloadEngine();
    if (!engine) return;

    this.runningQueues.add(id);
    
    const allTasks = engine.getAll();
    const queueTasks = allTasks.filter(t => (t.queueId || 'main') === id);
    
    queueTasks.forEach(task => {
      if (task.status === 'paused' || task.status === 'queued') {
        engine.resume(task.id);
      }
    });
  }

  public stopQueue(id: string) {
    if (id === 'limits') return;
    const engine = getDownloadEngine();
    if (!engine) return;

    this.runningQueues.delete(id);
    
    const allTasks = engine.getAll();
    const queueTasks = allTasks.filter(t => (t.queueId || 'main') === id);
    
    queueTasks.forEach(task => {
      if (task.status === 'downloading') {
        engine.pause(task.id);
      }
    });
  }

  private checkSchedules() {
    const repo = getQueueRepository();
    const queues = repo.getAll();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const currentDateStr = now.toISOString().split('T')[0];

    for (const q of queues) {
      if (q.id === 'limits') continue;

      // 1. Check if we need to STOP
      if (q.stopAt && q.stopAt === currentTimeStr) {
        if (this.runningQueues.has(q.id)) {
          console.log(`[QueueManager] Stopping queue ${q.name} at scheduled time ${q.stopAt}`);
          this.stopQueue(q.id);
        }
      }

      // 2. Check if we need to START
      if (q.startAt && q.startAt === currentTimeStr) {
        let shouldStart = false;

        if (q.scheduleType === 'one-time') {
          if (q.runDaily) {
            // Daily check
            if (q.daysOfWeek.includes(currentDay)) {
              shouldStart = true;
            }
          } else if (q.runOnceAt === currentDateStr) {
            // Run once
            shouldStart = true;
          }
        } else if (q.scheduleType === 'periodic') {
          // Periodic syncing uses startAt to begin the cycle
          shouldStart = true;
        }

        if (shouldStart && !this.runningQueues.has(q.id)) {
          console.log(`[QueueManager] Starting queue ${q.name} at scheduled time ${q.startAt}`);
          this.startQueue(q.id);
        }
      }

      // 3. Periodic synchronization specific logic
      if (q.scheduleType === 'periodic' && (q.startEveryHours || q.startEveryMinutes)) {
        // If it's a periodic sync, we calculate if it's time to run again based on an interval.
        // For a full implementation, we would track "lastRun" in the database.
        // For now, this is a basic approximation for periodic checks.
      }
    }
  }
}

let manager: QueueManager;

export function getQueueManager(): QueueManager {
  if (!manager) {
    manager = new QueueManager();
  }
  return manager;
}
