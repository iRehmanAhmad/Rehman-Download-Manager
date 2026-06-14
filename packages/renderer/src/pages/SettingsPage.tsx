import { Settings, Monitor, Download, Bell, Folder, Shield } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/settings-store';

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
          {tab === 'appearance' && <AppearanceSettings />}
          {tab === 'downloads' && <DownloadSettings />}
          {tab === 'notifications' && <NotificationSettings />}
          {tab === 'folders' && <FolderSettings />}
          {tab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">General</h2>
      <label className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Start with system</span>
        <input
          type="checkbox"
          className="rounded bg-slate-800 border-slate-700"
          checked={settings.autoStart === 'true'}
          onChange={(e) => setValue('autoStart', String(e.target.checked))}
        />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Minimize to tray</span>
        <input
          type="checkbox"
          className="rounded bg-slate-800 border-slate-700"
          checked={settings.minimizeToTray !== 'false'}
          onChange={(e) => setValue('minimizeToTray', String(e.target.checked))}
        />
      </label>
    </div>
  );
}

function AppearanceSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Appearance</h2>
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Theme</label>
        <select
          value={settings.theme || 'dark'}
          onChange={(e) => setValue('theme', e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </div>
    </div>
  );
}

function DownloadSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  const handleMaxConcurrent = useCallback(
    async (v: number) => {
      await setValue('maxConcurrent', String(v));
      await window.api.queue.setConcurrency(v);
    },
    [setValue],
  );

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Download</h2>
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Max concurrent downloads</label>
        <input
          type="number"
          value={settings.maxConcurrent || '5'}
          min={1}
          max={20}
          onChange={(e) => handleMaxConcurrent(parseInt(e.target.value) || 1)}
          className="w-24 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Default connections per download</label>
        <input
          type="number"
          value={8}
          min={1}
          max={32}
          readOnly
          className="w-24 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Global speed limit (0 = unlimited)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={settings.globalSpeedLimit || '0'}
            min={0}
            step={1024}
            onChange={(e) => {
              const v = String(e.target.value);
              setValue('globalSpeedLimit', v);
              window.api.queue.setGlobalSpeedLimit(parseInt(v) || 0);
            }}
            className="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
          />
          <span className="text-xs text-slate-500">bytes/s</span>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Notifications</h2>
      <label className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Show download notifications</span>
        <input
          type="checkbox"
          className="rounded bg-slate-800 border-slate-700"
          checked={settings.showNotifications !== 'false'}
          onChange={(e) => setValue('showNotifications', String(e.target.checked))}
        />
      </label>
      <label className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Monitor clipboard for URLs</span>
        <input
          type="checkbox"
          className="rounded bg-slate-800 border-slate-700"
          checked={settings.clipboardMonitor !== 'false'}
          onChange={(e) => setValue('clipboardMonitor', String(e.target.checked))}
        />
      </label>
    </div>
  );
}

function FolderSettings() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Folders</h2>
      <p className="text-sm text-slate-500">Default download location and temp directory management coming soon.</p>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Security</h2>
      <p className="text-sm text-slate-500">Checksum verification and SSL/TLS settings coming soon.</p>
    </div>
  );
}
