import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { app, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import type { PluginManifest, PluginInstance, PluginAPI } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../storage/database';

const loadedPlugins = new Map<string, PluginInstance>();
const pluginEventBus = new EventEmitter();

export function getPluginDir(): string {
  const dir = join(app.getPath('userData'), 'plugins');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function scanPlugins(): PluginInstance[] {
  const db = getDatabase();
  const dir = getPluginDir();
  if (!existsSync(dir)) return [];

  const instances: PluginInstance[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isDirectory()) continue;

    const manifestPath = join(fullPath, 'manifest.json');
    if (!existsSync(manifestPath)) continue;

    try {
      const raw = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw) as PluginManifest;
      if (!manifest.id || !manifest.name || !manifest.main) continue;

      const dbRow = db
        .prepare('SELECT enabled, installed_at FROM plugins WHERE id = ?')
        .get(manifest.id) as { enabled: number; installed_at: number } | undefined;

      const enabled = dbRow ? dbRow.enabled === 1 : false;
      const installedAt = dbRow ? dbRow.installed_at : Date.now();

      if (!dbRow) {
        db.prepare(
          'INSERT OR IGNORE INTO plugins (id, name, version, author, description, entry_point, enabled, permissions, installed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          manifest.id,
          manifest.name,
          manifest.version,
          manifest.author || null,
          manifest.description || null,
          manifest.main,
          enabled ? 1 : 0,
          JSON.stringify(manifest.permissions || []),
          installedAt,
        );
      }

      instances.push({
        id: manifest.id,
        manifest,
        enabled,
        installedAt,
        entryPoint: resolve(fullPath, manifest.main),
      });
    } catch {
      // skip invalid
    }
  }

  return instances;
}

export function loadPlugin(id: string): PluginInstance | null {
  const instance = getPluginInstance(id);
  if (!instance) return null;
  if (loadedPlugins.has(id)) return loadedPlugins.get(id) || null;

  if (!existsSync(instance.entryPoint)) return null;

  try {
    const api = createPluginApi(id);
    const mod = require(instance.entryPoint);

    if (typeof mod.default === 'function') {
      mod.default(api);
    } else if (typeof mod.activate === 'function') {
      mod.activate(api);
    }

    loadedPlugins.set(id, instance);
    console.log(`[plugin] Loaded: ${instance.manifest.name} v${instance.manifest.version}`);
    return instance;
  } catch (err) {
    console.error(`[plugin] Failed to load ${id}:`, err);
    return null;
  }
}

export function unloadPlugin(id: string): boolean {
  const instance = loadedPlugins.get(id);
  if (!instance) return false;

  pluginEventBus.emit(`plugin:${id}:unload`);
  pluginEventBus.removeAllListeners(`plugin:${id}:`);
  pluginEventBus.removeAllListeners(`download:completed`);

  try {
    delete require.cache[require.resolve(instance.entryPoint)];
  } catch {
    // already uncached
  }

  loadedPlugins.delete(id);
  console.log(`[plugin] Unloaded: ${instance.manifest.name}`);
  return true;
}

export function enablePlugin(id: string): boolean {
  const db = getDatabase();
  db.prepare('UPDATE plugins SET enabled = 1 WHERE id = ?').run(id);
  const instances = scanPlugins();
  const inst = instances.find((i) => i.id === id);
  if (inst) {
    return loadPlugin(id) !== null;
  }
  return false;
}

export function disablePlugin(id: string): boolean {
  unloadPlugin(id);
  const db = getDatabase();
  db.prepare('UPDATE plugins SET enabled = 0 WHERE id = ?').run(id);
  return true;
}

export function installPlugin(sourcePath: string): PluginInstance | null {
  const dir = getPluginDir();

  const manifestPath = join(sourcePath, 'manifest.json');
  if (!existsSync(manifestPath)) return null;

  const raw = readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw) as PluginManifest;
  if (!manifest.id || !manifest.name || !manifest.main) return null;

  const destPath = join(dir, manifest.id);
  if (existsSync(destPath)) {
    rmSync(destPath, { recursive: true, force: true });
  }

  cpSync(sourcePath, destPath, { recursive: true });

  const db = getDatabase();
  const now = Date.now();
  db.prepare(
    'INSERT OR REPLACE INTO plugins (id, name, version, author, description, entry_point, enabled, permissions, installed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    manifest.id,
    manifest.name,
    manifest.version,
    manifest.author || null,
    manifest.description || null,
    manifest.main,
    0,
    JSON.stringify(manifest.permissions || []),
    now,
  );

  return {
    id: manifest.id,
    manifest,
    enabled: false,
    installedAt: now,
    entryPoint: resolve(destPath, manifest.main),
  };
}

export function uninstallPlugin(id: string): boolean {
  disablePlugin(id);

  const dir = getPluginDir();
  const pluginDir = join(dir, id);
  if (existsSync(pluginDir)) {
    rmSync(pluginDir, { recursive: true, force: true });
  }

  const db = getDatabase();
  db.prepare('DELETE FROM plugins WHERE id = ?').run(id);
  db.prepare("DELETE FROM settings WHERE key LIKE 'plugin:' || ? || ':%'").run(id);
  return true;
}

export function getLoadedPlugins(): PluginInstance[] {
  return Array.from(loadedPlugins.values());
}

export function getPluginInstance(id: string): PluginInstance | undefined {
  const loaded = loadedPlugins.get(id);
  if (loaded) return loaded;

  const instances = scanPlugins();
  return instances.find((i) => i.id === id);
}

export function isPluginLoaded(id: string): boolean {
  return loadedPlugins.has(id);
}

function getPluginStorage(pluginId: string) {
  return {
    get(key: string): unknown {
      const db = getDatabase();
      const row = db
        .prepare("SELECT value FROM settings WHERE key = ?")
        .get(`plugin:${pluginId}:${key}`) as { value: string } | undefined;
      if (!row) return null;
      try {
        return JSON.parse(row.value);
      } catch {
        return row.value;
      }
    },
    set(key: string, value: unknown): void {
      const db = getDatabase();
      db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ).run(`plugin:${pluginId}:${key}`, JSON.stringify(value));
    },
  };
}

function createPluginApi(pluginId: string): PluginAPI {
  const storage = getPluginStorage(pluginId);

  return {
    downloads: {
      async add(options) {
        const { getDownloadEngine } = await import('../ipc/download.ipc');
        const { v4 } = await import('uuid');
        const { extractFilename } = await import('@rdm/shared');
        const eng = getDownloadEngine();
        const id = v4();
        const download = {
          id,
          url: options.url,
          filename: options.filename || extractFilename(options.url) || 'download',
          tempDir: '',
          fileSize: -1,
          downloaded: 0,
          status: 'queued' as const,
          priority: options.priority || 'normal',
          categoryId: options.categoryId,
          addedAt: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          speedLimit: options.speedLimit,
          numConnections: options.numConnections || 8,
          headers: options.headers,
          referer: options.referer,
          checksum: options.checksum,
          chunks: [],
          speed: 0,
          progress: 0,
          eta: 0,
        };
        eng.add(download);
        return id;
      },
      async getAll() {
        const { getDownloadEngine } = await import('../ipc/download.ipc');
        return getDownloadEngine().getAll();
      },
      async get(id) {
        const { getDownloadEngine } = await import('../ipc/download.ipc');
        return getDownloadEngine().getDownload(id) as never;
      },
    },
    storage: {
      get: async (key) => storage.get(key),
      set: async (key, value) => { storage.set(key, value); },
    },
    network: {
      async fetch(url, options) {
        return fetch(url, options);
      },
    },
    ui: {
      registerPanel(_component: unknown) {
        console.log(`[plugin:${pluginId}] UI panel registered (renderer-side panels coming in future version)`);
      },
    },
    events: {
      on(event, handler) {
        pluginEventBus.on(`plugin:${pluginId}:${event}`, handler);
      },
      emit(event, ...args) {
        pluginEventBus.emit(`plugin:${pluginId}:${event}`, ...args);
      },
    },
    log: {
      info(msg) {
        console.log(`[plugin:${pluginId}]`, msg);
      },
      warn(msg) {
        console.warn(`[plugin:${pluginId}]`, msg);
      },
      error(msg) {
        console.error(`[plugin:${pluginId}]`, msg);
      },
    },
  };
}
