import { Settings, Monitor, Download, Bell, Folder, Shield } from 'lucide-react';
import { useState } from 'react';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'folders', label: 'Folders', icon: Folder },
  { id: 'security', label: 'Security', icon: Shield },
];

export function SettingsPage() {
  const [tab, setTab] = useState('general');

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-slate-800 py-2">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  tab === item.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-auto p-6">
          {tab === 'general' && <GeneralSettings />}
          {tab === 'downloads' && <DownloadSettings />}
          {tab !== 'general' && tab !== 'downloads' && (
            <div className="text-slate-500 text-sm">Settings coming soon...</div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">General</h2>
      <label className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Start with system</span>
        <input type="checkbox" className="rounded bg-slate-800 border-slate-700" />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Minimize to tray</span>
        <input type="checkbox" defaultChecked className="rounded bg-slate-800 border-slate-700" />
      </label>
    </div>
  );
}

function DownloadSettings() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Download</h2>
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Max concurrent downloads</label>
        <input
          type="number"
          defaultValue={5}
          min={1}
          max={20}
          className="w-24 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Default connections per download</label>
        <input
          type="number"
          defaultValue={8}
          min={1}
          max={32}
          className="w-24 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
        />
      </div>
    </div>
  );
}
