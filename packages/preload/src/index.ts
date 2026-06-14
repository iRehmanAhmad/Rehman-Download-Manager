import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type Download, type DownloadOptions, type Category } from '@rdm/shared';

const api = {
  download: {
    add: (options: DownloadOptions): Promise<Download> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_ADD, options),
    getAll: (): Promise<Download[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_GET_ALL),
    get: (id: string): Promise<Download | undefined> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_GET, id),
    pause: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_PAUSE, id),
    resume: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_RESUME, id),
    cancel: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_CANCEL, id),
    remove: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_REMOVE, id),
    setSpeedLimit: (id: string, limit: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_SET_SPEED_LIMIT, id, limit),
    setConnections: (id: string, count: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_SET_CONNECTIONS, id, count),
    onProgress: (callback: (download: Download) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, download: Download) =>
        callback(download);
      ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_PROGRESS, handler);
    },
    onCompleted: (callback: (download: Download) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, download: Download) =>
        callback(download);
      ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_COMPLETED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_COMPLETED, handler);
    },
    onError: (callback: (download: Download) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, download: Download) =>
        callback(download);
      ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_ERROR, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_ERROR, handler);
    },
  },

  settings: {
    get: (key: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: unknown): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
    getAll: (): Promise<Record<string, unknown>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  },

  categories: {
    getAll: (): Promise<Category[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_ALL),
    create: (category: Omit<Category, 'id'>): Promise<Category> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, category),
  },

  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    minimize: () => ipcRenderer.send(IPC_CHANNELS.APP_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.APP_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.APP_CLOSE),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type RdmApi = typeof api;
