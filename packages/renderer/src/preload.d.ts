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
  settings: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<boolean>;
    getAll(): Promise<Record<string, unknown>>;
  };
  categories: {
    getAll(): Promise<Category[]>;
    create(category: Omit<Category, 'id'>): Promise<Category>;
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
