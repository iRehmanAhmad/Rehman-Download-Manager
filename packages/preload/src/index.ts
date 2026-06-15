import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type Download, type DownloadOptions, type Category, type QueueStatus, type PluginInstance, type GrabResult } from '@rdm/shared';

const api = {
  download: {
    getFileInfo: (url: string): Promise<{ fileSize: number; supportsRange: boolean; preId?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_GET_FILE_INFO, url),
    getFileInfoBasic: (url: string): Promise<{ fileSize: number; supportsRange: boolean; contentType: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_GET_FILE_INFO_BASIC, url),
    discardPre: (preId: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_DISCARD_PRE, preId),
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
    clearCompleted: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_CLEAR_COMPLETED),
    move: (id: string, newPath: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_MOVE, id, newPath),
    setSpeedLimit: (id: string, limit: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_SET_SPEED_LIMIT, id, limit),
    setConnections: (id: string, count: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_SET_CONNECTIONS, id, count),
    openFile: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_OPEN_FILE, id),
    openFolder: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_OPEN_FOLDER, id),
    export: (options: { format: 'ef2' | 'txt', mode: 'queue' | 'selected' | 'all', selectedIds: string[] }): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_EXPORT, options),
    import: (format: 'ef2' | 'txt'): Promise<string | void> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_IMPORT, format),
    onAdded: (callback: (download: Download) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, download: Download) =>
        callback(download);
      ipcRenderer.on(IPC_CHANNELS.DOWNLOAD_ADDED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DOWNLOAD_ADDED, handler);
    },
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

  queue: {
    getAll: (): Promise<import('@rdm/shared').QueueSettings[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_GET_ALL),
    get: (id: string): Promise<import('@rdm/shared').QueueSettings | undefined> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_GET, id),
    create: (queue: Omit<import('@rdm/shared').QueueSettings, 'id' | 'type'>): Promise<import('@rdm/shared').QueueSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_CREATE, queue),
    update: (queue: import('@rdm/shared').QueueSettings): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_UPDATE, queue),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_DELETE, id),
    start: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_START, id),
    stop: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_STOP, id),
    startAll: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_START_ALL),
    pauseAll: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_PAUSE_ALL),
    setConcurrency: (n: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_SET_CONCURRENCY, n),
    setGlobalSpeedLimit: (limit: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_SET_GLOBAL_SPEED_LIMIT, limit),
    reorder: (orderedIds: string[]): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUEUE_REORDER, orderedIds),
    onStatus: (callback: (status: QueueStatus) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: QueueStatus) =>
        callback(status);
      ipcRenderer.on(IPC_CHANNELS.QUEUE_STATUS, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.QUEUE_STATUS, handler);
    },
  },

  settings: {
    get: (key: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
    getAll: (): Promise<Record<string, string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
  },

  categories: {
    getAll: (): Promise<Category[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_GET_ALL),
    create: (category: Omit<Category, 'id'>): Promise<Category> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, category),
    update: (category: Category): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_UPDATE, category),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_DELETE, id),
  },

  schedule: {
    getAll: (): Promise<import('@rdm/shared').ScheduleEntry[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_GET_ALL),
    create: (entry: Omit<import('@rdm/shared').ScheduleEntry, 'id'>): Promise<import('@rdm/shared').ScheduleEntry> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_CREATE, entry),
    update: (entry: import('@rdm/shared').ScheduleEntry): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_UPDATE, entry),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEDULE_DELETE, id),
  },

  automation: {
    getRules: (): Promise<import('@rdm/shared').AutomationRule[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_GET_RULES),
    createRule: (rule: Omit<import('@rdm/shared').AutomationRule, 'id'>): Promise<import('@rdm/shared').AutomationRule> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_CREATE_RULE, rule),
    updateRule: (rule: import('@rdm/shared').AutomationRule): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_UPDATE_RULE, rule),
    deleteRule: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_DELETE_RULE, id),
  },

  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    minimize: () => ipcRenderer.send(IPC_CHANNELS.APP_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.APP_MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.APP_CLOSE),
  },

  clipboard: {
    readText: (): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.CLIPBOARD_READ_TEXT),
    onUrlDetected: (callback: (url: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, url: string) =>
        callback(url);
      ipcRenderer.on(IPC_CHANNELS.CLIPBOARD_URL, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CLIPBOARD_URL, handler);
    },
  },

  plugins: {
    getAll: (): Promise<PluginInstance[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_GET_ALL),
    install: (sourcePath: string): Promise<PluginInstance | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_INSTALL, sourcePath),
    uninstall: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_UNINSTALL, id),
    enable: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_ENABLE, id),
    disable: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PLUGIN_DISABLE, id),
  },

  grabber: {
    detectVideos: (url: string): Promise<GrabResult[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRABBER_DETECT_VIDEOS, url),
    crawlSite: (url: string): Promise<GrabResult[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.GRABBER_CRAWL_SITE, url),
  },

  system: {
    selectSavePath: (defaultPath?: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SELECT_SAVE_PATH, defaultPath),
    showOpenDialog: (options: any): Promise<string[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SHOW_OPEN_DIALOG, options),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type RdmApi = typeof api;
