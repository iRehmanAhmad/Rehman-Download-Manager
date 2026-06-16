import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { app, utilityProcess, type UtilityProcess } from 'electron';
import type { PluginManifest, PluginInstance } from '@rdm/shared';
import { getDatabase } from '../storage/database';

const loadedPlugins = new Map<string, PluginInstance>();
// Live utilityProcess per loaded plugin (the sandbox boundary).
const pluginProcesses = new Map<string, UtilityProcess>();

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

/** Absolute path to the bundled plugin-host (built alongside main/index.js). */
function getHostPath(): string {
  return join(__dirname, 'plugin-host.js');
}

export function loadPlugin(id: string): PluginInstance | null {
  const instance = getPluginInstance(id);
  if (!instance) return null;
  if (pluginProcesses.has(id)) return loadedPlugins.get(id) || instance;

  if (!existsSync(instance.entryPoint)) return null;

  try {
    // Launch the plugin in an isolated utilityProcess. It gets no Node
    // integration into the app — it can only reach app state through the
    // permission-checked message API serviced below.
    const child = utilityProcess.fork(getHostPath(), [], {
      serviceName: `rdm-plugin-${id}`,
      stdio: 'ignore',
    });

    child.on('message', (msg: Record<string, unknown>) => {
      handleHostMessage(id, child, msg);
    });

    child.on('exit', () => {
      pluginProcesses.delete(id);
      loadedPlugins.delete(id);
    });

    child.postMessage({
      type: 'init',
      pluginId: id,
      entryPoint: instance.entryPoint,
      permissions: instance.manifest.permissions || [],
    });

    pluginProcesses.set(id, child);
    loadedPlugins.set(id, instance);
    console.log(`[plugin] Loaded (sandboxed): ${instance.manifest.name} v${instance.manifest.version}`);
    return instance;
  } catch (err) {
    console.error(`[plugin] Failed to load ${id}:`, err);
    return null;
  }
}

export function unloadPlugin(id: string): boolean {
  const child = pluginProcesses.get(id);
  if (child) {
    try { child.kill(); } catch { /* already dead */ }
    pluginProcesses.delete(id);
  }
  const instance = loadedPlugins.get(id);
  loadedPlugins.delete(id);
  if (instance) console.log(`[plugin] Unloaded: ${instance.manifest.name}`);
  return !!instance || !!child;
}

/**
 * Deliver an event to every loaded plugin's sandbox (e.g. 'download:intercept').
 * Plugins subscribe via api.events.on inside their utilityProcess.
 */
export function emitPluginEvent(event: string, ...args: unknown[]): void {
  for (const child of pluginProcesses.values()) {
    try {
      child.postMessage({ type: 'event', event, args });
    } catch { /* process may be exiting */ }
  }
}

/** Service a message coming from a plugin's utilityProcess. */
async function handleHostMessage(
  pluginId: string,
  child: UtilityProcess,
  msg: Record<string, unknown>,
): Promise<void> {
  const type = msg.type;

  if (type === 'log') {
    const level = String(msg.level || 'info');
    const line = `[plugin:${pluginId}] ${String(msg.msg)}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
    return;
  }

  if (type === 'load-error') {
    console.error(`[plugin:${pluginId}] load error:`, msg.error);
    return;
  }

  if (type === 'event-emit') {
    // A plugin emitting an event is currently informational; broadcast to peers.
    emitPluginEvent(String(msg.event), ...((msg.args as unknown[]) || []));
    return;
  }

  if (type === 'api-call') {
    const callId = msg.callId as number;
    const instance = loadedPlugins.get(pluginId);
    const perms = instance?.manifest.permissions || [];
    try {
      const value = await servicePluginApi(
        pluginId,
        perms,
        String(msg.domain),
        String(msg.method),
        (msg.args as unknown[]) || [],
      );
      child.postMessage({ type: 'api-result', callId, ok: true, value });
    } catch (err) {
      child.postMessage({ type: 'api-result', callId, ok: false, error: String(err) });
    }
  }
}

function requirePerm(perms: string[], required: string[]): void {
  if (!required.some((p) => perms.includes(p))) {
    throw new Error(`Permission denied: requires one of [${required.join(', ')}]`);
  }
}

/** Execute a privileged plugin API call in the main process, enforcing perms. */
async function servicePluginApi(
  pluginId: string,
  perms: string[],
  domain: string,
  method: string,
  args: unknown[],
): Promise<unknown> {
  if (domain === 'downloads') {
    requirePerm(perms, ['download:intercept', 'download:post-process']);
    const { getDownloadEngine } = await import('../ipc/download.ipc');
    const eng = getDownloadEngine();
    if (method === 'add') {
      const { v4 } = await import('uuid');
      const { extractFilename } = await import('@rdm/shared');
      const options = (args[0] || {}) as Record<string, any>;
      const dlId = v4();
      eng.add({
        id: dlId,
        url: options.url,
        filename: options.filename || extractFilename(options.url) || 'download',
        tempDir: '',
        fileSize: -1,
        downloaded: 0,
        status: 'queued',
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
      });
      return dlId;
    }
    if (method === 'getAll') return eng.getAll();
    if (method === 'get') return eng.getDownload(String(args[0]));
    throw new Error(`Unknown downloads method: ${method}`);
  }

  if (domain === 'storage') {
    requirePerm(perms, ['storage:read']);
    const storage = getPluginStorage(pluginId);
    if (method === 'get') return storage.get(String(args[0]));
    if (method === 'set') {
      storage.set(String(args[0]), args[1]);
      return undefined;
    }
    throw new Error(`Unknown storage method: ${method}`);
  }

  throw new Error(`Unknown API domain: ${domain}`);
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

/** Load every plugin marked enabled in the DB. Call once at app startup. */
export function loadEnabledPlugins(): void {
  for (const inst of scanPlugins()) {
    if (inst.enabled) loadPlugin(inst.id);
  }
}

/** Kill all plugin sandboxes (call on app quit). */
export function unloadAllPlugins(): void {
  for (const id of Array.from(pluginProcesses.keys())) {
    unloadPlugin(id);
  }
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

