import type { Download, DownloadOptions, Category } from '@rdm/shared';

export interface RdmApi {
  download: {
    add(options: DownloadOptions): Promise<Download>;
    getAll(): Promise<Download[]>;
    get(id: string): Promise<Download | undefined>;
    pause(id: string): Promise<boolean>;
    resume(id: string): Promise<boolean>;
    cancel(id: string): Promise<boolean>;
    remove(id: string): Promise<boolean>;
    setSpeedLimit(id: string, limit: number): Promise<boolean>;
    setConnections(id: string, count: number): Promise<boolean>;
    onProgress(callback: (download: Download) => void): () => void;
    onCompleted(callback: (download: Download) => void): () => void;
    onError(callback: (download: Download) => void): () => void;
  };
  queue: {
    startAll(): Promise<boolean>;
    pauseAll(): Promise<boolean>;
    setConcurrency(n: number): Promise<boolean>;
    setGlobalSpeedLimit(limit: number): Promise<boolean>;
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
}

declare global {
  interface Window {
    api: RdmApi;
  }
}
