import type { Download, DownloadOptions, Category, QueueStatus, PluginInstance, GrabResult } from '@rdm/shared';

export interface RdmApi {
  download: {
    getFileInfo(url: string): Promise<{ fileSize: number; supportsRange: boolean; preId?: string }>;
    getFileInfoBasic(url: string): Promise<{ fileSize: number; supportsRange: boolean; contentType: string }>;
    discardPre(preId: string): Promise<boolean>;
    add(options: DownloadOptions): Promise<Download>;
    getAll(): Promise<Download[]>;
    get(id: string): Promise<Download | undefined>;
    pause(id: string): Promise<boolean>;
    resume(id: string): Promise<boolean>;
    cancel(id: string): Promise<boolean>;
    remove(id: string): Promise<boolean>;
    clearCompleted(): Promise<boolean>;
    move(id: string, newPath: string): Promise<boolean>;
    setSpeedLimit(id: string, limit: number): Promise<boolean>;
    setConnections(id: string, count: number): Promise<boolean>;
    openFile(id: string): Promise<boolean>;
    openFolder(id: string): Promise<boolean>;
    export(options: { format: 'ef2' | 'txt', mode: 'queue' | 'selected' | 'all', selectedIds: string[] }): Promise<void>;
    import(format: 'ef2' | 'txt'): Promise<string | void>;
    onAdded(callback: (download: Download) => void): () => void;
    onProgress(callback: (download: Download) => void): () => void;
    onCompleted(callback: (download: Download) => void): () => void;
    onError(callback: (download: Download) => void): () => void;
  };
  queue: {
    getAll(): Promise<import('@rdm/shared').QueueSettings[]>;
    get(id: string): Promise<import('@rdm/shared').QueueSettings | undefined>;
    create(queue: Omit<import('@rdm/shared').QueueSettings, 'id' | 'type'>): Promise<import('@rdm/shared').QueueSettings>;
    update(queue: import('@rdm/shared').QueueSettings): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    start(id: string): Promise<boolean>;
    stop(id: string): Promise<boolean>;
    startAll(): Promise<boolean>;
    pauseAll(): Promise<boolean>;
    setConcurrency(n: number): Promise<boolean>;
    setGlobalSpeedLimit(limit: number): Promise<boolean>;
    reorder(orderedIds: string[]): Promise<boolean>;
    onStatus(callback: (status: QueueStatus) => void): () => void;
  };
  settings: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<boolean>;
    getAll(): Promise<Record<string, string>>;
  };
  categories: {
    getAll(): Promise<Category[]>;
    create(category: Omit<Category, 'id'>): Promise<Category>;
    update(category: Category): Promise<boolean>;
    delete(id: string): Promise<boolean>;
  };
  schedule: {
    getAll(): Promise<import('@rdm/shared').ScheduleEntry[]>;
    create(entry: Omit<import('@rdm/shared').ScheduleEntry, 'id'>): Promise<import('@rdm/shared').ScheduleEntry>;
    update(entry: import('@rdm/shared').ScheduleEntry): Promise<boolean>;
    delete(id: string): Promise<boolean>;
  };
  automation: {
    getRules(): Promise<import('@rdm/shared').AutomationRule[]>;
    createRule(rule: Omit<import('@rdm/shared').AutomationRule, 'id'>): Promise<import('@rdm/shared').AutomationRule>;
    updateRule(rule: import('@rdm/shared').AutomationRule): Promise<boolean>;
    deleteRule(id: string): Promise<boolean>;
  };
  app: {
    getVersion(): Promise<string>;
    minimize(): void;
    maximize(): void;
    close(): void;
  };
  clipboard: {
    readText(): Promise<string>;
    onUrlDetected(callback: (url: string) => void): () => void;
  };
  plugins: {
    getAll(): Promise<PluginInstance[]>;
    install(sourcePath: string): Promise<PluginInstance | null>;
    uninstall(id: string): Promise<boolean>;
    enable(id: string): Promise<boolean>;
    disable(id: string): Promise<boolean>;
  };
  grabber: {
    detectVideos(url: string): Promise<GrabResult[]>;
    crawlSite(url: string): Promise<GrabResult[]>;
  };
  system: {
    selectSavePath(defaultPath?: string): Promise<string | null>;
    showOpenDialog(options: any): Promise<string[]>;
  };
}

declare global {
  interface Window {
    api: RdmApi;
  }
}
