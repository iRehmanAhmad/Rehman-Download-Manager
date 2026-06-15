import { ipcMain } from 'electron';
import { IPC_CHANNELS, QueueSettings } from '@rdm/shared';
import { getQueueRepository } from '../queue/queue.repository';

export function registerQueueHandlers(): void {
  const repo = getQueueRepository();

  ipcMain.handle(IPC_CHANNELS.QUEUE_GET_ALL, (): QueueSettings[] => {
    return repo.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_GET, (_event, id: string): QueueSettings | undefined => {
    return repo.getById(id);
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_CREATE, (_event, queue: Omit<QueueSettings, 'id' | 'type'>): QueueSettings => {
    return repo.create(queue);
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_UPDATE, (_event, queue: QueueSettings): boolean => {
    return repo.update(queue);
  });

  ipcMain.handle(IPC_CHANNELS.QUEUE_DELETE, (_event, id: string): boolean => {
    return repo.delete(id);
  });
}
