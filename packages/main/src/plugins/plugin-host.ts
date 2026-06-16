/**
 * Plugin host — runs inside an Electron utilityProcess, one per loaded plugin.
 *
 * This process has NO access to ipcMain, the database, the download engine, or
 * the renderer. The plugin's `require()` resolves normally here, but anything
 * the plugin can reach (fs, child_process, …) acts only on this isolated
 * process — it cannot touch app state except through the message-passing API
 * below, every call of which is permission-checked in the main process.
 */

interface InitMessage {
  type: 'init';
  pluginId: string;
  entryPoint: string;
  permissions: string[];
}

type HostMessage =
  | InitMessage
  | { type: 'api-result'; callId: number; ok: boolean; value?: unknown; error?: string }
  | { type: 'event'; event: string; args: unknown[] };

// parentPort is injected by Electron's utilityProcess runtime.
declare const process: NodeJS.Process & {
  parentPort: {
    on(event: 'message', handler: (e: { data: HostMessage }) => void): void;
    postMessage(msg: unknown): void;
  };
};

const parentPort = process.parentPort;

let pluginId = '';
let permissions: string[] = [];
let callSeq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
const eventHandlers = new Map<string, Array<(...args: unknown[]) => void>>();

function has(permission: string): boolean {
  return permissions.includes(permission);
}

/** Forward a privileged API call to the main process and await its result. */
function callMain(domain: string, method: string, args: unknown[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const callId = ++callSeq;
    pending.set(callId, { resolve, reject });
    parentPort.postMessage({ type: 'api-call', callId, domain, method, args });
  });
}

function buildApi() {
  return {
    downloads: {
      add: (options: unknown) => {
        if (!has('download:intercept') && !has('download:post-process')) {
          return Promise.reject(new Error('Permission denied: download'));
        }
        return callMain('downloads', 'add', [options]);
      },
      getAll: () => callMain('downloads', 'getAll', []),
      get: (id: string) => callMain('downloads', 'get', [id]),
    },
    storage: {
      get: (key: string) => callMain('storage', 'get', [key]),
      set: (key: string, value: unknown) => callMain('storage', 'set', [key, value]),
    },
    network: {
      // Runs in-process. The utilityProcess has no elevated privileges, so the
      // only thing to gate is whether the plugin declared network access.
      fetch: (url: string, options?: RequestInit) => {
        if (!has('network:request')) {
          return Promise.reject(new Error('Permission denied: network:request'));
        }
        return fetch(url, options);
      },
    },
    ui: {
      registerPanel: () => {
        // Renderer-side panels are not yet supported; no-op kept for API parity.
      },
    },
    events: {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        const list = eventHandlers.get(event) || [];
        list.push(handler);
        eventHandlers.set(event, list);
      },
      emit: (event: string, ...args: unknown[]) => {
        parentPort.postMessage({ type: 'event-emit', event, args });
      },
    },
    log: {
      info: (msg: string) => parentPort.postMessage({ type: 'log', level: 'info', msg: String(msg) }),
      warn: (msg: string) => parentPort.postMessage({ type: 'log', level: 'warn', msg: String(msg) }),
      error: (msg: string) => parentPort.postMessage({ type: 'log', level: 'error', msg: String(msg) }),
    },
  };
}

parentPort.on('message', (e: { data: HostMessage }) => {
  const msg = e.data;

  if (msg.type === 'init') {
    pluginId = msg.pluginId;
    permissions = msg.permissions || [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(msg.entryPoint);
      const api = buildApi();
      if (typeof mod.default === 'function') mod.default(api);
      else if (typeof mod.activate === 'function') mod.activate(api);
      parentPort.postMessage({ type: 'ready', pluginId });
    } catch (err) {
      parentPort.postMessage({ type: 'load-error', pluginId, error: String(err) });
    }
    return;
  }

  if (msg.type === 'api-result') {
    const p = pending.get(msg.callId);
    if (!p) return;
    pending.delete(msg.callId);
    if (msg.ok) p.resolve(msg.value);
    else p.reject(new Error(msg.error || 'API call failed'));
    return;
  }

  if (msg.type === 'event') {
    const list = eventHandlers.get(msg.event) || [];
    for (const handler of list) {
      try {
        handler(...(msg.args || []));
      } catch (err) {
        parentPort.postMessage({ type: 'log', level: 'error', msg: `event handler error: ${String(err)}` });
      }
    }
    return;
  }
});
