import { useState, useEffect, useCallback } from 'react';
import { Puzzle, Plus, Trash2, Power, PowerOff, FolderOpen } from 'lucide-react';
import type { PluginInstance } from '@rdm/shared';

export function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.api.plugins.getAll();
      setPlugins(list);
    } catch (err) {
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPlugins();
  }, [refreshPlugins]);

  const handleEnable = useCallback(
    async (id: string) => {
      await window.api.plugins.enable(id);
      refreshPlugins();
    },
    [refreshPlugins],
  );

  const handleDisable = useCallback(
    async (id: string) => {
      await window.api.plugins.disable(id);
      refreshPlugins();
    },
    [refreshPlugins],
  );

  const handleUninstall = useCallback(
    async (id: string) => {
      await window.api.plugins.uninstall(id);
      refreshPlugins();
    },
    [refreshPlugins],
  );

  const handleInstallFromFolder = useCallback(async () => {
    try {
      const result = await window.api.plugins.install('/path/to/plugin');
      if (result) {
        refreshPlugins();
      }
    } catch {
      // dialog would go here in production
    }
  }, [refreshPlugins]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Plugins</h1>
        <button
          onClick={handleInstallFromFolder}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-md transition-colors"
        >
          <Plus size={14} />
          Install Plugin
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center text-slate-500 text-sm mt-12">Loading plugins...</div>
        ) : plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Puzzle size={48} strokeWidth={1.5} />
            <p className="mt-4 text-sm">No plugins installed</p>
            <p className="text-xs mt-1">Install plugins to extend download capabilities</p>
            <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-lg max-w-md text-left">
              <h3 className="text-xs font-medium text-slate-400 mb-2">Bundled Plugins</h3>
              <div className="space-y-2">
                <QuickInstallItem
                  name="YouTube Extractor"
                  desc="Extract video/audio links from YouTube"
                  version="0.1.0"
                  onInstall={async () => {
                    const result = await window.api.plugins.install('plugins/youtube-extractor');
                    if (result) refreshPlugins();
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {plugins.map((p) => (
              <PluginCard
                key={p.id}
                plugin={p}
                onEnable={handleEnable}
                onDisable={handleDisable}
                onUninstall={handleUninstall}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PluginCard({
  plugin,
  onEnable,
  onDisable,
  onUninstall,
}: {
  plugin: PluginInstance;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onUninstall: (id: string) => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${
              plugin.enabled ? 'bg-green-500' : 'bg-slate-600'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-slate-200">{plugin.manifest.name}</p>
            <p className="text-xs text-slate-500">
              v{plugin.manifest.version}
              {plugin.manifest.author && ` • ${plugin.manifest.author}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {plugin.enabled ? (
            <button
              onClick={() => onDisable(plugin.id)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-yellow-400"
              title="Disable"
            >
              <PowerOff size={15} />
            </button>
          ) : (
            <button
              onClick={() => onEnable(plugin.id)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-green-400"
              title="Enable"
            >
              <Power size={15} />
            </button>
          )}
          <button
            onClick={() => onUninstall(plugin.id)}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"
            title="Uninstall"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {plugin.manifest.description && (
        <p className="text-xs text-slate-600 mt-2 ml-5">{plugin.manifest.description}</p>
      )}
      {plugin.manifest.permissions.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 ml-5">
          {plugin.manifest.permissions.map((perm) => (
            <span
              key={perm}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500"
            >
              {perm}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickInstallItem({
  name,
  desc,
  version,
  onInstall,
}: {
  name: string;
  desc: string;
  version: string;
  onInstall: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-slate-800/50 rounded p-2.5">
      <div>
        <p className="text-xs font-medium text-slate-300">{name}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
      <button
        onClick={onInstall}
        className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-[11px] rounded transition-colors flex items-center gap-1"
      >
        <FolderOpen size={11} />
        Install
      </button>
    </div>
  );
}
