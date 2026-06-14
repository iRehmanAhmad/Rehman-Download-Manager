export type PluginPermission =
  | 'download:intercept'
  | 'download:post-process'
  | 'protocol:register'
  | 'ui:extend'
  | 'storage:read'
  | 'network:request'
  | 'automation:rules';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  minAppVersion?: string;
  permissions: PluginPermission[];
  main: string;
  ui?: string;
}

export interface PluginInstance {
  id: string;
  manifest: PluginManifest;
  enabled: boolean;
  installedAt: number;
  entryPoint: string;
}

export interface PluginAPI {
  downloads: {
    add(options: import('./download').DownloadOptions): Promise<string>;
    getAll(): Promise<import('./download').Download[]>;
    get(id: string): Promise<import('./download').Download>;
  };
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
  };
  network: {
    fetch(url: string, options?: RequestInit): Promise<Response>;
  };
  ui: {
    registerPanel(component: unknown): void;
  };
  events: {
    on(event: string, handler: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
  };
  log: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
}
