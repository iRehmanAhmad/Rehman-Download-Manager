import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { app } from 'electron';
import type { PluginManifest, PluginInstance, PluginAPI } from '@rdm/shared';
import { v4 as uuid } from 'uuid';

const loadedPlugins = new Map<string, PluginInstance>();

export function getPluginDir(): string {
  const dir = join(app.getPath('userData'), 'plugins');
  if (!existsSync(dir)) {
    const fs = require('node:fs');
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function scanPlugins(): PluginManifest[] {
  const dir = getPluginDir();
  if (!existsSync(dir)) return [];

  const manifests: PluginManifest[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (!statSync(fullPath).isDirectory()) continue;

    const manifestPath = join(fullPath, 'manifest.json');
    if (!existsSync(manifestPath)) continue;

    try {
      const raw = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw) as PluginManifest;
      if (manifest.id && manifest.name && manifest.main) {
        manifests.push(manifest);
      }
    } catch {
      // skip invalid plugins
    }
  }

  return manifests;
}

export function loadPlugin(manifest: PluginManifest): PluginInstance | null {
  if (loadedPlugins.has(manifest.id)) {
    return loadedPlugins.get(manifest.id) || null;
  }

  const dir = getPluginDir();
  const pluginDir = join(dir, manifest.id);

  if (!existsSync(pluginDir)) return null;

  const mainPath = resolve(pluginDir, manifest.main);
  if (!existsSync(mainPath)) return null;

  try {
    const api = createPluginApi(manifest.id);
    const mod = require(mainPath);
    const instance: PluginInstance = {
      id: manifest.id,
      manifest,
      enabled: true,
      installedAt: Date.now(),
      entryPoint: mainPath,
    };

    if (typeof mod.default === 'function') {
      mod.default(api);
    }

    loadedPlugins.set(manifest.id, instance);
    return instance;
  } catch (err) {
    console.error(`Failed to load plugin ${manifest.id}:`, err);
    return null;
  }
}

export function unloadPlugin(id: string): boolean {
  const instance = loadedPlugins.get(id);
  if (!instance) return false;

  try {
    delete require.cache[require.resolve(instance.entryPoint)];
  } catch {
    // already uncached
  }

  loadedPlugins.delete(id);
  return true;
}

export function getLoadedPlugins(): PluginInstance[] {
  return Array.from(loadedPlugins.values());
}

function createPluginApi(pluginId: string): PluginAPI {
  return {
    downloads: {
      async add(options) {
        return pluginId;
      },
      async getAll() {
        return [];
      },
      async get(id) {
        return { id } as never;
      },
    },
    storage: {
      async get(key) {
        return null;
      },
      async set(key, value) {
        // stored per-plugin
      },
    },
    network: {
      async fetch(url, options) {
        return fetch(url, options);
      },
    },
    ui: {
      registerPanel(_component) {
        // UI panels not supported in current sandbox
      },
    },
    events: {
      on(_event, _handler) {},
      emit(_event, ..._args) {},
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
