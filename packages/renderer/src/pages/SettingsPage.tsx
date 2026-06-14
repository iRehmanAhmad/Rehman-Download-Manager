import { Settings, Monitor, Download, Bell, Folder, Shield } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useSettingsStore } from '../stores/settings-store';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'network', label: 'Network', icon: Settings }, // Reusing Settings icon
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
          {tab === 'network' && <NetworkSettings />}
          {tab === 'notifications' && <NotificationSettings />}
          {tab === 'folders' && <FolderSettings />}
          {tab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

function GeneralSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);
  const loading = useSettingsStore((s) => s.loading);
  const { i18n } = useTranslation();

  if (loading) {
    return <div className="text-sm text-slate-500">Loading settings...</div>;
  }

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    await setValue('language', lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">General</h2>
      
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Language</label>
        <select
          value={settings.language || i18n.language || 'en'}
          onChange={handleLanguageChange}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      <label className="flex items-center justify-between pt-4 border-t border-slate-800">
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

function NetworkSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Network & Proxy</h2>
      <div className="space-y-2">
        <label className="text-sm text-slate-400 block">Proxy Server (HTTP/HTTPS)</label>
        <input
          type="text"
          placeholder="http://127.0.0.1:8080"
          value={settings.proxyUrl || ''}
          onChange={(e) => setValue('proxyUrl', e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
        />
        <p className="text-xs text-slate-500">Leave blank to use direct connection. Basic auth can be embedded in URL (e.g., http://user:pass@127.0.0.1).</p>
      </div>
    </div>
  );
}

function DownloadSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);
  const [globalLimitInput, setGlobalLimitInput] = useState(settings.globalSpeedLimit || '0');
  const [concurrencyInput, setConcurrencyInput] = useState(settings.maxConcurrent || '5');

  const handleMaxConcurrent = useCallback(
    async (v: number) => {
      const clamped = Math.max(1, Math.min(v, 32));
      setConcurrencyInput(String(clamped));
      await setValue('maxConcurrent', String(clamped));
      await window.api.queue.setConcurrency(clamped);
    },
    [setValue],
  );

  const handleGlobalSpeedLimit = useCallback(
    async (v: number) => {
      const clamped = Math.max(0, v);
      setGlobalLimitInput(String(clamped));
      await setValue('globalSpeedLimit', String(clamped));
      await window.api.queue.setGlobalSpeedLimit(clamped);
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
          value={concurrencyInput}
          min={1}
          max={32}
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
            value={globalLimitInput}
            min={0}
            step={102400}
            onChange={(e) => handleGlobalSpeedLimit(parseInt(e.target.value) || 0)}
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
        <div>
          <span className="text-sm text-slate-400">Show download notifications</span>
          <p className="text-xs text-slate-600 mt-0.5">Desktop alerts on download complete or failure</p>
        </div>
        <input
          type="checkbox"
          className="rounded bg-slate-800 border-slate-700"
          checked={settings.showNotifications !== 'false'}
          onChange={(e) => setValue('showNotifications', String(e.target.checked))}
        />
      </label>
      <label className="flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-400">Monitor clipboard for URLs</span>
          <p className="text-xs text-slate-600 mt-0.5">Auto-detect copied URLs and show download prompt</p>
        </div>
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
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-base font-medium text-slate-200">Security</h2>
      
      <label className="flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-400">Enable Antivirus Scanning</span>
          <p className="text-xs text-slate-600 mt-0.5">Automatically scan files after they finish downloading</p>
        </div>
        <input
          type="checkbox"
          className="rounded bg-slate-800 border-slate-700"
          checked={settings.antivirusEnabled === 'true'}
          onChange={(e) => setValue('antivirusEnabled', String(e.target.checked))}
        />
      </label>

      {settings.antivirusEnabled === 'true' && (
        <div className="space-y-2 mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-800">
          <label className="text-sm text-slate-400 block">Antivirus Executable Command</label>
          <input
            type="text"
            placeholder="C:\ProgramData\Microsoft\Windows Defender\Platform\...\MpCmdRun.exe"
            value={settings.antivirusCmd || ''}
            onChange={(e) => setValue('antivirusCmd', e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200"
          />
          <p className="text-xs text-slate-500 mt-2">
            Enter the absolute path to your antivirus scanner's CLI tool. RDM will append the downloaded file path as the final argument.
          </p>
        </div>
      )}

      <div className="mt-8 border-t border-slate-800 pt-6">
        <h3 className="text-sm font-medium text-slate-300 mb-2">Checksums</h3>
        <p className="text-sm text-slate-500">MD5 checksum verification runs automatically on download completion if a checksum is provided when adding a URL.</p>
      </div>
    </div>
  );
}
