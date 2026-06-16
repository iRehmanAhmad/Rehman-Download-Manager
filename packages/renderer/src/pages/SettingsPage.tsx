import { Settings, Monitor, Download, Bell, Folder, Shield, Network } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { useTranslation } from 'react-i18next';
import type { Category } from '@rdm/shared';
import * as Dialog from '@radix-ui/react-dialog';

import { SiteLoginDialog, type SiteLogin } from '../components/settings/SiteLoginDialog';

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'file-types', label: 'File types', icon: Folder },
  { id: 'save-to', label: 'Save to', icon: Folder },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'connection', label: 'Connection', icon: Settings },
  { id: 'proxy', label: 'Proxy / Socks', icon: Shield },
  { id: 'sites-logins', label: 'Sites Logins', icon: Shield },
  { id: 'dial-up-vpn', label: 'Dial Up / VPN', icon: Network },
  { id: 'sounds', label: 'Sounds', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
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
          {tab === 'file-types' && <FileTypesSettings />}
          {tab === 'save-to' && <FolderSettings />}
          {tab === 'downloads' && <DownloadSettings />}
          {tab === 'connection' && <ConnectionSettings />}
          {tab === 'proxy' && <NetworkSettings />}
          {tab === 'sites-logins' && <SitesLoginsSettings />}
          {tab === 'dial-up-vpn' && <DialUpVpnSettings />}
          {tab === 'sounds' && <SoundsSettings />}
          {tab === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

import { DownloadPanelsDialog } from '../components/settings/DownloadPanelsDialog';
import { AddressExceptionsDialog } from '../components/settings/AddressExceptionsDialog';
import { CategoryDialog } from '../components/settings/CategoryDialog';
import { ConnectionExceptionsDialog, type ConnectionException } from '../components/settings/ConnectionExceptionsDialog';

function GeneralSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);
  const loading = useSettingsStore((s) => s.loading);
  const { i18n } = useTranslation();
  
  const [panelsDialogOpen, setPanelsDialogOpen] = useState(false);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading settings...</div>;
  }

  const defaultBrowsers = [
    { name: 'Apple Safari', checked: true },
    { name: 'Google Chrome', checked: true },
    { name: 'Internet Explorer', checked: true },
    { name: 'Microsoft Edge', checked: true },
    { name: 'Microsoft Edge Legacy', checked: true },
    { name: 'Mozilla Firefox', checked: true },
    { name: 'Opera', checked: true },
  ];
  
  const capturedBrowsers = settings.capturedBrowsers ? JSON.parse(settings.capturedBrowsers) : defaultBrowsers;
  const setCapturedBrowsers = (browsers: any) => setValue('capturedBrowsers', JSON.stringify(browsers));

  const toggleBrowser = (index: number) => {
    const newBrowsers = [...capturedBrowsers];
    newBrowsers[index].checked = !newBrowsers[index].checked;
    setCapturedBrowsers(newBrowsers);
  };

  const handleAddBrowser = async () => {
    const result = await window.api.system.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Executables', extensions: ['exe'] }]
    });
    
    if (result && result.length > 0) {
      const filePath = result[0];
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'Unknown Browser';
      const cleanName = fileName.replace('.exe', '').charAt(0).toUpperCase() + fileName.replace('.exe', '').slice(1);
      
      const newBrowsers = [...capturedBrowsers, { name: cleanName, checked: true }];
      setCapturedBrowsers(newBrowsers);
    }
  };

  return (
    <div className="max-w-2xl space-y-4 text-sm text-slate-200">
      
      <div className="flex items-center justify-between border-b border-gray-600 pb-2">
        <span className="font-medium text-[15px]">Browser/System Integration</span>
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        <span>Advanced browser integration is enabled</span>
        <button className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors">
          Restart
        </button>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-400 accent-blue-600"
            checked={settings.autoStart === 'true'}
            onChange={(e) => setValue('autoStart', String(e.target.checked))}
          />
          <span>Launch Internet Download Manager on startup</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-400 accent-blue-600"
            checked={settings.autoDownloadClipboard === 'true'}
            onChange={(e) => setValue('autoDownloadClipboard', String(e.target.checked))}
          />
          <span>Automatically start downloading of URLs placed to clipboard</span>
        </label>
      </div>

      <div className="border border-gray-500 rounded p-4 mt-6">
        <div className="mb-2 -mt-7 bg-[#0f172a] px-1 w-fit text-slate-300">Capture downloads from the following browsers:</div>
        <div className="border border-gray-500 bg-white h-48 overflow-y-auto p-1 text-black">
          {capturedBrowsers.map((b: any, idx: number) => (
            <label key={idx} className="flex items-center gap-2 p-0.5 cursor-pointer hover:bg-blue-50">
              <input 
                type="checkbox" 
                checked={b.checked} 
                onChange={() => toggleBrowser(idx)}
                className="w-4 h-4 accent-blue-600"
              />
              <span>{b.name}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end mt-2">
          <button 
            onClick={handleAddBrowser}
            className="px-4 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors"
          >
            Add browser...
          </button>
        </div>
      </div>

      <div className="space-y-3 mt-6">
        <div className="flex items-center justify-between border-t border-gray-600 pt-3">
          <span>Customize keys to prevent or force downloading with IDM</span>
          <button className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors">
            Keys...
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Customize IDM menu items in context menu of browsers</span>
          <button className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors">
            Edit...
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <span>Customize IDM Download panels in browsers</span>
          <button 
            onClick={() => setPanelsDialogOpen(true)}
            className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors"
          >
            Edit...
          </button>
        </div>
      </div>

      <DownloadPanelsDialog 
        open={panelsDialogOpen} 
        onOpenChange={setPanelsDialogOpen} 
      />
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

  const getBool = (key: string, def: boolean) => settings[key] !== undefined ? settings[key] === 'true' : def;

  const useBrowserProxyOnError = getBool('useBrowserProxyOnError', true);
  const proxyType = settings.proxyType || 'none';
  const pacAddress = settings.pacAddress || '';
  const proxyAddress = settings.proxyAddress || '';
  const proxyPort = settings.proxyPort || '';
  const proxyUsername = settings.proxyUsername || '';
  const proxyPassword = settings.proxyPassword || '';
  const proxyUseHttp = getBool('proxyUseHttp', false);
  const proxyUseHttps = getBool('proxyUseHttps', false);
  const proxyUseFtp = getBool('proxyUseFtp', false);
  const useFtpPasv = getBool('useFtpPasv', false);

  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const handleGetSystem = () => {
    setErrorDialogOpen(true);
  };

  const handleProxyTypeChange = (type: string) => {
    if (type === 'system') {
      setErrorDialogOpen(true);
      // Optional: automatically revert to 'none' if system proxy fails, but let's just set it for now
    }
    setValue('proxyType', type);
  };

  return (
    <div className="max-w-2xl text-sm text-slate-200 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          <img src="/icons/icon.png" alt="" className="w-8 h-8 object-contain opacity-80" />
          <span className="font-bold text-lg font-sans">Proxy / socks configuration</span>
        </div>
        <button 
          onClick={handleGetSystem}
          className="px-6 py-1 bg-white border border-blue-500 rounded hover:bg-blue-50 w-28 border-2 text-black"
        >
          Get System
        </button>
      </div>

      <div className="space-y-4 px-2">
        <label className="flex items-start gap-2 cursor-pointer pt-2">
          <input 
            type="checkbox" 
            checked={useBrowserProxyOnError}
            onChange={(e) => setValue('useBrowserProxyOnError', String(e.target.checked))}
            className="w-4 h-4 mt-0.5 accent-blue-600 border border-gray-400 rounded-sm"
          />
          <span className="text-black">
            Use proxy/socks from a browser's request if there are download errors<br/>
            for the downloads intercepted from the browser
          </span>
        </label>

        <div className="border-b border-gray-400 mt-2 mb-2"></div>

        <label className="flex items-center gap-2 cursor-pointer text-black font-medium">
          <input 
            type="radio" 
            name="proxyType"
            value="none"
            checked={proxyType === 'none'}
            onChange={() => handleProxyTypeChange('none')}
            className="w-4 h-4 accent-blue-600"
          />
          No proxy/socks
        </label>

        <div className="border-b border-gray-400 my-2"></div>

        <label className="flex items-center gap-2 cursor-pointer text-black">
          <input 
            type="radio" 
            name="proxyType"
            value="system"
            checked={proxyType === 'system'}
            onChange={() => handleProxyTypeChange('system')}
            className="w-4 h-4 accent-blue-600"
          />
          Use system settings
        </label>

        <div className="border-b border-gray-400 my-2"></div>

        <label className="flex items-center gap-2 cursor-pointer text-black">
          <input 
            type="radio" 
            name="proxyType"
            value="pac"
            checked={proxyType === 'pac'}
            onChange={() => handleProxyTypeChange('pac')}
            className="w-4 h-4 accent-blue-600"
          />
          Use automatic configuration script
        </label>

        <div className="flex items-center gap-4 pl-6 pt-2 pb-2">
          <span className={proxyType === 'pac' ? 'text-gray-600' : 'text-gray-400'}>Address</span>
          <input 
            type="text" 
            disabled={proxyType !== 'pac'}
            value={pacAddress}
            onChange={(e) => setValue('pacAddress', e.target.value)}
            className={`border flex-1 p-1 outline-none ${proxyType === 'pac' ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
          />
        </div>

        <div className="border-b border-gray-400 my-2"></div>

        <label className="flex items-center gap-2 cursor-pointer text-black">
          <input 
            type="radio" 
            name="proxyType"
            value="manual"
            checked={proxyType === 'manual'}
            onChange={() => handleProxyTypeChange('manual')}
            className="w-4 h-4 accent-blue-600"
          />
          Manual proxy/socks configuration
        </label>

        <div className="pl-6 pt-2 grid grid-cols-[1fr_80px_1fr_1fr] gap-4 text-black">
          <div className="flex flex-col gap-1">
            <span className={proxyType === 'manual' ? 'text-gray-500' : 'text-gray-300'}>Proxy server address</span>
            <input 
              type="text" 
              disabled={proxyType !== 'manual'}
              value={proxyAddress}
              onChange={(e) => setValue('proxyAddress', e.target.value)}
              className={`border p-1 outline-none ${proxyType === 'manual' ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={proxyType === 'manual' ? 'text-gray-500' : 'text-gray-300'}>Port</span>
            <input 
              type="text" 
              disabled={proxyType !== 'manual'}
              value={proxyPort}
              onChange={(e) => setValue('proxyPort', e.target.value)}
              className={`border p-1 outline-none ${proxyType === 'manual' ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={proxyType === 'manual' ? 'text-gray-500' : 'text-gray-300'}>UserName</span>
            <input 
              type="text" 
              disabled={proxyType !== 'manual'}
              value={proxyUsername}
              onChange={(e) => setValue('proxyUsername', e.target.value)}
              className={`border p-1 outline-none ${proxyType === 'manual' ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={proxyType === 'manual' ? 'text-gray-500' : 'text-gray-300'}>Password</span>
            <input 
              type="password" 
              disabled={proxyType !== 'manual'}
              value={proxyPassword}
              onChange={(e) => setValue('proxyPassword', e.target.value)}
              className={`border p-1 outline-none ${proxyType === 'manual' ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
            />
          </div>
        </div>

        <div className="pl-6 pt-2 pb-6">
          <div className={proxyType === 'manual' ? 'text-gray-500 mb-2' : 'text-gray-300 mb-2'}>
            Use this proxy for the following protocols:
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-6">
              <label className={`flex items-center gap-1.5 ${proxyType === 'manual' ? 'cursor-pointer text-gray-700' : 'cursor-not-allowed text-gray-400'}`}>
                <input 
                  type="checkbox" 
                  disabled={proxyType !== 'manual'}
                  checked={proxyUseHttp}
                  onChange={(e) => setValue('proxyUseHttp', String(e.target.checked))}
                  className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
                />
                http
              </label>
              <label className={`flex items-center gap-1.5 ${proxyType === 'manual' ? 'cursor-pointer text-gray-700' : 'cursor-not-allowed text-gray-400'}`}>
                <input 
                  type="checkbox" 
                  disabled={proxyType !== 'manual'}
                  checked={proxyUseHttps}
                  onChange={(e) => setValue('proxyUseHttps', String(e.target.checked))}
                  className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
                />
                https
              </label>
              <label className={`flex items-center gap-1.5 ${proxyType === 'manual' ? 'cursor-pointer text-gray-700' : 'cursor-not-allowed text-gray-400'}`}>
                <input 
                  type="checkbox" 
                  disabled={proxyType !== 'manual'}
                  checked={proxyUseFtp}
                  onChange={(e) => setValue('proxyUseFtp', String(e.target.checked))}
                  className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
                />
                ftp
              </label>
            </div>
            
            <button 
              disabled={proxyType !== 'manual'}
              className={`px-4 py-1 border rounded w-40 ${proxyType === 'manual' ? 'bg-white border-gray-400 text-black hover:bg-[#e0e0e0]' : 'bg-[#f0f0f0] border-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              Advanced / Socks...
            </button>
          </div>
        </div>

        <div className="border-b-2 border-gray-400 mt-auto mb-2"></div>

        <label className="flex items-center gap-2 cursor-pointer text-black">
          <input 
            type="checkbox" 
            checked={useFtpPasv}
            onChange={(e) => setValue('useFtpPasv', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          Use FTP in PASV mode
        </label>
      </div>

      {/* Warning Dialog */}
      <Dialog.Root open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-transparent z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-[380px] translate-x-[-50%] translate-y-[-50%] bg-[#f0f0f0] shadow-lg border border-gray-400 p-0 text-black font-sans text-sm outline-none">
            
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-300 gap-2">
              <Dialog.Title className="text-xs font-normal">Internet Download Manager</Dialog.Title>
              <Dialog.Close className="text-gray-500 hover:text-black">
                <span className="text-lg leading-none">&times;</span>
              </Dialog.Close>
            </div>

            <div className="flex items-center gap-4 px-6 py-8 pb-10">
              {/* Alert Triangle Icon */}
              <div className="flex-shrink-0 text-yellow-500">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L1 21H23L12 2ZM13 18H11V16H13V18ZM13 14H11V10H13V14Z" />
                </svg>
              </div>
              <div className="text-sm">
                Could not find proxy configuration in System Settings
              </div>
            </div>

            <div className="bg-[#f0f0f0] flex justify-end px-4 py-3 pb-4">
              <Dialog.Close asChild>
                <button className="px-8 py-1 bg-white border border-blue-500 rounded hover:bg-blue-50 w-24 border-2">
                  OK
                </button>
              </Dialog.Close>
            </div>
            
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}

function ConnectionSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  const getBool = (key: string, def: boolean) => settings[key] !== undefined ? settings[key] === 'true' : def;

  // Defaults based on IDM
  const defaultMaxConnections = settings.defaultMaxConnections || '8';
  const downloadLimitsEnabled = getBool('downloadLimitsEnabled', false);
  const downloadLimitMB = settings.downloadLimitMB || '200';
  const downloadLimitHours = settings.downloadLimitHours || '5';
  const showWarningBeforeStopping = getBool('showWarningBeforeStopping', true);

  // Exceptions list
  const exceptions: ConnectionException[] = settings.connectionExceptions ? JSON.parse(settings.connectionExceptions) : [];
  const [selectedExceptionId, setSelectedExceptionId] = useState<string>('');
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  const [exceptionDialogMode, setExceptionDialogMode] = useState<'new' | 'edit'>('new');

  const selectedException = exceptions.find(e => e.id === selectedExceptionId);

  const handleExceptionSave = (exception: ConnectionException) => {
    let newExceptions;
    if (exceptionDialogMode === 'new') {
      newExceptions = [...exceptions, exception];
    } else {
      newExceptions = exceptions.map(e => e.id === exception.id ? exception : e);
    }
    setValue('connectionExceptions', JSON.stringify(newExceptions));
    setSelectedExceptionId(exception.id);
  };

  const handleExceptionDelete = () => {
    if (!selectedExceptionId) return;
    const newExceptions = exceptions.filter(e => e.id !== selectedExceptionId);
    setValue('connectionExceptions', JSON.stringify(newExceptions));
    setSelectedExceptionId('');
  };

  return (
    <div className="max-w-2xl space-y-4 text-sm text-slate-200 h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-600 pb-2">
        <div className="flex items-center gap-2">
          <img src="/icons/icon.png" alt="" className="w-5 h-5 object-contain opacity-80" />
          <span className="font-bold text-[15px] font-sans">Connections and Limits</span>
        </div>
      </div>

      <div className="border border-gray-300 p-4 bg-white text-black relative mt-6">
        <div className="absolute -top-3 left-2 bg-[#f0f0f0] px-1 text-black font-sans">
          Max. connections number
        </div>

        <div className="flex justify-center items-center gap-2 mt-2 mb-6">
          <label>Default max. conn. number</label>
          <select
            value={defaultMaxConnections}
            onChange={(e) => setValue('defaultMaxConnections', e.target.value)}
            className="border border-gray-400 p-1 bg-white outline-none w-20 text-center"
          >
            {[1, 2, 4, 8, 16, 24, 32].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-start gap-4 pb-2">
          <div className="flex-1 flex flex-col">
            <label className="mb-1">Exceptions:</label>
            <div className="border border-gray-400 h-32 bg-white overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 border-b border-gray-300">
                  <tr>
                    <th className="font-normal px-2 py-1 border-r border-gray-300 w-3/4">Server</th>
                    <th className="font-normal px-2 py-1">Number</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map(exc => (
                    <tr 
                      key={exc.id} 
                      onClick={() => setSelectedExceptionId(exc.id)}
                      className={`cursor-pointer ${selectedExceptionId === exc.id ? 'bg-[#0078d7] text-white' : 'hover:bg-blue-50'}`}
                    >
                      <td className="px-2 py-0.5 border-r border-gray-300">{exc.protocol}{exc.server}</td>
                      <td className="px-2 py-0.5">{exc.maxConnections}</td>
                    </tr>
                  ))}
                  {exceptions.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-2 py-1 text-center text-gray-400 italic">No exceptions</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-6">
            <button 
              onClick={() => { setExceptionDialogMode('new'); setExceptionDialogOpen(true); }}
              className="px-6 py-1 bg-white border border-gray-400 rounded hover:bg-[#e0e0e0] w-24"
            >
              New
            </button>
            <button 
              onClick={handleExceptionDelete}
              disabled={!selectedExceptionId}
              className={`px-6 py-1 border rounded w-24 ${!selectedExceptionId ? 'bg-[#f0f0f0] border-gray-300 text-gray-400 cursor-not-allowed' : 'bg-[#f0f0f0] border-gray-400 hover:bg-[#e0e0e0]'}`}
            >
              Delete
            </button>
            <button 
              onClick={() => { setExceptionDialogMode('edit'); setExceptionDialogOpen(true); }}
              disabled={!selectedExceptionId}
              className={`px-6 py-1 border rounded w-24 ${!selectedExceptionId ? 'bg-[#f0f0f0] border-gray-300 text-gray-400 cursor-not-allowed' : 'bg-[#f0f0f0] border-gray-400 hover:bg-[#e0e0e0]'}`}
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="border border-gray-300 p-4 bg-white text-black relative mt-8">
        <div className="absolute -top-3 left-2 bg-[#f0f0f0] px-1 text-black font-sans flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={downloadLimitsEnabled}
            onChange={(e) => setValue('downloadLimitsEnabled', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          Download limits
        </div>

        <div className="pl-6 space-y-2 mt-4">
          <div className="flex items-center gap-2">
            <span className={downloadLimitsEnabled ? 'text-black' : 'text-gray-400'}>Download no more than</span>
            <input 
              type="number" 
              disabled={!downloadLimitsEnabled}
              value={downloadLimitMB}
              onChange={(e) => setValue('downloadLimitMB', e.target.value)}
              className={`border p-1 w-16 text-center outline-none ${downloadLimitsEnabled ? 'border-gray-400 bg-white' : 'border-gray-200 bg-[#f0f0f0] text-gray-400'}`}
            />
            <span className={downloadLimitsEnabled ? 'text-black' : 'text-gray-400'}>MBytes</span>
          </div>

          <div className="flex items-center gap-2 ml-16">
            <span className={downloadLimitsEnabled ? 'text-black' : 'text-gray-400'}>every</span>
            <input 
              type="number" 
              disabled={!downloadLimitsEnabled}
              value={downloadLimitHours}
              onChange={(e) => setValue('downloadLimitHours', e.target.value)}
              className={`border p-1 w-16 text-center outline-none ${downloadLimitsEnabled ? 'border-gray-400 bg-white' : 'border-gray-200 bg-[#f0f0f0] text-gray-400'}`}
            />
            <span className={downloadLimitsEnabled ? 'text-black' : 'text-gray-400'}>hours</span>
          </div>

          <div className="pt-2">
            <label className={`flex items-center gap-2 ${downloadLimitsEnabled ? 'cursor-pointer text-black' : 'cursor-not-allowed text-gray-400'}`}>
              <input 
                type="checkbox" 
                disabled={!downloadLimitsEnabled}
                checked={showWarningBeforeStopping}
                onChange={(e) => setValue('showWarningBeforeStopping', String(e.target.checked))}
                className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
              />
              <span>Show warning before stopping downloads</span>
            </label>
          </div>
        </div>
      </div>

      <ConnectionExceptionsDialog
        open={exceptionDialogOpen}
        onOpenChange={setExceptionDialogOpen}
        exception={exceptionDialogMode === 'edit' ? selectedException : null}
        onSave={handleExceptionSave}
      />

    </div>
  );
}

function DownloadSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  const getBool = (key: string, def: boolean) => settings[key] !== undefined ? settings[key] === 'true' : def;

  const showStartDialog = getBool('showStartDialog', true);
  const addFilesToQueueOnly = getBool('addFilesToQueueOnly', false);
  const showCompleteDialog = getBool('showCompleteDialog', true);
  const startImmediatelyWhenInfoDialog = getBool('startImmediatelyWhenInfoDialog', true);
  const showQueueSelectionOnLater = getBool('showQueueSelectionOnLater', true);
  const duplicateLinkAction = settings.duplicateLinkAction || 'ask';

  return (
    <div className="max-w-2xl space-y-4 text-sm text-slate-200">
      
      <div className="flex items-center justify-between border-b border-gray-600 pb-2">
        <div className="flex items-center gap-2">
          <img src="/icons/icon.png" alt="" className="w-5 h-5 object-contain opacity-80" />
          <span className="font-medium text-[15px] font-sans">Default download settings</span>
        </div>
      </div>

      <div className="flex justify-between items-center px-4 py-2 mt-4">
        <span>Customize "Download progress" dialog</span>
        <button className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors w-24">
          Edit...
        </button>
      </div>

      <div className="space-y-3 px-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showStartDialog}
            onChange={(e) => setValue('showStartDialog', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          <span>Show start download dialog</span>
        </label>
        
        <label className={`flex items-center gap-2 ml-6 ${!showStartDialog ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input 
            type="checkbox" 
            checked={addFilesToQueueOnly}
            disabled={!showStartDialog}
            onChange={(e) => setValue('addFilesToQueueOnly', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          <span>Do not start downloading, only add files to the queue</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input 
            type="checkbox" 
            checked={showCompleteDialog}
            onChange={(e) => setValue('showCompleteDialog', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          <span>Show download complete dialog</span>
        </label>
        
        <div className="ml-6 text-gray-400 pb-2">
          Note: These settings don't relate to queue processing
        </div>
      </div>

      <div className="border-b border-gray-600 mx-2"></div>

      <div className="space-y-3 px-4 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={startImmediatelyWhenInfoDialog}
            onChange={(e) => setValue('startImmediatelyWhenInfoDialog', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          <span>Start downloading immediately while displaying "Download File Info" dialog</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={showQueueSelectionOnLater}
            onChange={(e) => setValue('showQueueSelectionOnLater', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          <span>Show queue selection panel on pressing "Download Later" button</span>
        </label>
      </div>

      <div className="border-b border-gray-600 mx-2"></div>

      <div className="px-4 pt-2 pb-6 space-y-2">
        <label className="block mb-1">If a duplicate download link is added:</label>
        <select
          value={duplicateLinkAction}
          onChange={(e) => setValue('duplicateLinkAction', e.target.value)}
          className="border border-gray-400 p-1 w-full bg-white text-black outline-none"
        >
          <option value="ask">Show a dialog and ask what to do.</option>
          <option value="numbered">Add the duplicate with a numbered file name</option>
          <option value="overwrite">Add the duplicate and overwrite the existing file</option>
          <option value="resume">If existing file is complete, show download complete dialog; otherwise resume it.</option>
        </select>
      </div>

    </div>
  );
}

function SitesLoginsSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);
  
  const sitesLogins: SiteLogin[] = settings.sitesLogins ? JSON.parse(settings.sitesLogins) : [];
  const [selectedLoginId, setSelectedLoginId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'new' | 'edit'>('new');

  const selectedLogin = sitesLogins.find(l => l.id === selectedLoginId);

  const handleSave = (login: SiteLogin) => {
    let newLogins;
    if (dialogMode === 'new') {
      newLogins = [...sitesLogins, login];
    } else {
      newLogins = sitesLogins.map(l => l.id === login.id ? login : l);
    }
    setValue('sitesLogins', JSON.stringify(newLogins));
  };

  const handleRemove = () => {
    if (!selectedLoginId) return;
    const newLogins = sitesLogins.filter(l => l.id !== selectedLoginId);
    setValue('sitesLogins', JSON.stringify(newLogins));
    setSelectedLoginId('');
  };

  return (
    <div className="max-w-2xl text-sm text-slate-200 flex flex-col h-full">
      <div className="flex items-center gap-4 pb-2 border-b border-gray-400">
        <img src="/icons/icon.png" alt="" className="w-8 h-8 object-contain opacity-80" />
        <span className="font-bold text-lg font-sans text-black">User names and passwords for servers/sites</span>
      </div>

      <div className="pt-4 flex-1 flex flex-col min-h-0">
        <div className="border border-gray-400 bg-white flex-1 overflow-auto">
          <table className="w-full text-black">
            <thead className="sticky top-0 bg-white border-b border-gray-300 shadow-sm">
              <tr className="text-left text-[13px]">
                <th className="font-normal px-2 py-1 w-1/2 border-r border-gray-300">Site/path</th>
                <th className="font-normal px-2 py-1 border-r border-gray-300">User</th>
                <th className="font-normal px-2 py-1">Password</th>
              </tr>
            </thead>
            <tbody>
              {sitesLogins.map((login) => (
                <tr 
                  key={login.id} 
                  onClick={() => setSelectedLoginId(login.id)}
                  className={`cursor-default ${selectedLoginId === login.id ? 'bg-[#0078d7] text-white' : 'hover:bg-[#f0f0f0]'}`}
                >
                  <td className="px-2 py-0.5 truncate max-w-[200px] border-r border-gray-100 border-opacity-50">{login.protocol === '*' ? '*' : `${login.protocol}${login.server}`}</td>
                  <td className="px-2 py-0.5 truncate max-w-[100px] border-r border-gray-100 border-opacity-50">{login.username}</td>
                  <td className="px-2 py-0.5">{login.password ? '***' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex gap-4 mt-4">
          <button 
            onClick={() => { setDialogMode('new'); setDialogOpen(true); }}
            className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 rounded hover:bg-[#e0e0e0] w-24 text-black"
          >
            New
          </button>
          <button 
            onClick={() => { if (selectedLoginId) { setDialogMode('edit'); setDialogOpen(true); } }}
            disabled={!selectedLoginId}
            className={`px-6 py-1 border rounded w-24 ${selectedLoginId ? 'bg-[#f0f0f0] border-gray-400 text-black hover:bg-[#e0e0e0]' : 'bg-[#f0f0f0] border-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Edit
          </button>
          <button 
            onClick={handleRemove}
            disabled={!selectedLoginId}
            className={`px-6 py-1 border rounded w-24 ${selectedLoginId ? 'bg-[#f0f0f0] border-gray-400 text-black hover:bg-[#e0e0e0]' : 'bg-[#f0f0f0] border-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Remove
          </button>
        </div>
      </div>

      <SiteLoginDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        siteLogin={dialogMode === 'edit' ? selectedLogin : null}
        onSave={handleSave}
      />
    </div>
  );
}

function DialUpVpnSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  const getBool = (key: string, def: boolean) => settings[key] !== undefined ? settings[key] === 'true' : def;

  const useVpn = getBool('useVpn', false);
  const vpnConnection = settings.vpnConnection || '';
  const vpnUsername = settings.vpnUsername || '';
  const vpnPassword = settings.vpnPassword || '';
  const vpnSavePassword = getBool('vpnSavePassword', false);
  const vpnRedialAttempts = settings.vpnRedialAttempts || '0';
  const vpnRedialDelay = settings.vpnRedialDelay || '30';

  return (
    <div className="max-w-2xl text-sm text-slate-200 flex flex-col h-full">
      <div className="flex items-center gap-4 pb-2 border-b border-gray-400">
        <img src="/icons/icon.png" alt="" className="w-8 h-8 object-contain opacity-80" />
        <span className="font-bold text-lg font-sans text-black">Dial up / VPN settings</span>
      </div>

      <div className="pt-4 space-y-4 px-2">
        <label className="flex items-center gap-2 cursor-pointer text-black">
          <input 
            type="checkbox" 
            checked={useVpn}
            onChange={(e) => setValue('useVpn', String(e.target.checked))}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          Use Windows Dial Up / VPN Networking
        </label>

        <fieldset className="border border-gray-300 p-4 pt-2 relative mt-4">
          <legend className="px-1 text-black bg-[#f0f0f0] absolute -top-2.5 left-2">Connection options</legend>
          <div className="grid grid-cols-[120px_1fr] items-center gap-y-3 gap-x-2 pt-2">
            <span className="text-right text-black pr-2">Connection:</span>
            <select 
              value={vpnConnection}
              onChange={(e) => setValue('vpnConnection', e.target.value)}
              disabled={!useVpn}
              className={`border p-1 outline-none w-full ${useVpn ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
            >
              <option value=""></option>
            </select>

            <span className="text-right text-black pr-2">User name:</span>
            <input 
              type="text" 
              value={vpnUsername}
              onChange={(e) => setValue('vpnUsername', e.target.value)}
              disabled={!useVpn}
              className={`border p-1 outline-none w-64 ${useVpn ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
            />

            <span className="text-right text-black pr-2">Password:</span>
            <input 
              type="password" 
              value={vpnPassword}
              onChange={(e) => setValue('vpnPassword', e.target.value)}
              disabled={!useVpn}
              className={`border p-1 outline-none w-64 ${useVpn ? 'bg-white border-gray-400 text-black' : 'bg-[#f0f0f0] border-gray-200 text-gray-400'}`}
            />

            <div></div>
            <div className="flex justify-between items-center pr-4">
              <label className={`flex items-center gap-1.5 ${useVpn ? 'cursor-pointer text-gray-600' : 'cursor-not-allowed text-gray-400'}`}>
                <input 
                  type="checkbox" 
                  checked={vpnSavePassword}
                  onChange={(e) => setValue('vpnSavePassword', String(e.target.checked))}
                  disabled={!useVpn}
                  className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
                />
                Save password
              </label>
              
              <button 
                disabled={!useVpn}
                className={`px-8 py-1 border rounded w-24 ml-auto ${useVpn ? 'bg-[#f0f0f0] border-gray-400 text-black hover:bg-[#e0e0e0]' : 'bg-[#f0f0f0] border-gray-200 text-gray-400 cursor-not-allowed'}`}
              >
                Apply
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset className="border border-gray-300 p-4 pt-2 relative mt-4">
          <legend className="px-1 text-black bg-[#f0f0f0] absolute -top-2.5 left-2">Redial options</legend>
          <div className="grid grid-cols-[250px_60px_1fr] items-center gap-y-3 gap-x-2 pt-2">
            <span className="text-right text-black pr-2">Redial attempts (zero if endlessly):</span>
            <input 
              type="text" 
              value={vpnRedialAttempts}
              onChange={(e) => setValue('vpnRedialAttempts', e.target.value)}
              className="border p-1 outline-none bg-white border-gray-400 text-black w-full text-right"
            />
            <span className="text-black pl-2">times</span>

            <span className="text-right text-black pr-2">Time between redial attempts:</span>
            <input 
              type="text" 
              value={vpnRedialDelay}
              onChange={(e) => setValue('vpnRedialDelay', e.target.value)}
              className="border p-1 outline-none bg-white border-gray-400 text-black w-full text-right"
            />
            <span className="text-black pl-2">seconds</span>
          </div>
        </fieldset>

      </div>
    </div>
  );
}

const SOUND_EVENTS = [
  { id: 'sound_downloadComplete', label: 'Download complete' },
  { id: 'sound_downloadFailed', label: 'Download failed' },
  { id: 'sound_queueStarted', label: 'Queue processing started' },
  { id: 'sound_queueStopped', label: 'Queue processing stopped/finished' },
];

function SoundsSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  const handleBrowse = async () => {
    if (!selectedEventId) return;
    const result = await window.api.system.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Audio Files', extensions: ['wav', 'mp3'] }]
    });

    if (result && result.length > 0) {
      setValue(`${selectedEventId}_file`, result[0]);
    }
  };

  const handlePlay = () => {
    if (!selectedEventId) return;
    const filePath = settings[`${selectedEventId}_file`];
    if (filePath) {
      const audio = new Audio(`file://${filePath.replace(/\\/g, '/')}`);
      audio.play().catch(console.error);
    }
  };

  return (
    <div className="max-w-2xl text-sm text-slate-200 flex flex-col h-full">
      <div className="flex items-center gap-4 pb-2 border-b border-gray-400">
        <img src="/icons/icon.png" alt="" className="w-8 h-8 object-contain opacity-80" />
        <span className="font-bold text-lg font-sans text-black">Sound settings</span>
      </div>

      <div className="pt-4 flex-1 flex flex-col min-h-0">
        <fieldset className="border border-gray-300 p-2 pt-4 relative flex-1 flex flex-col min-h-0 mt-2">
          <legend className="px-1 text-black bg-[#f0f0f0] absolute -top-2.5 left-2">Select sounds for Internet Download Manager events</legend>
          
          <div className="border border-gray-400 bg-white flex-1 overflow-auto">
            <table className="w-full text-black table-fixed">
              <thead className="sticky top-0 bg-white border-b border-gray-300">
                <tr className="text-left text-[13px]">
                  <th className="font-normal px-2 py-0.5 w-[250px] border-r border-gray-300">Event</th>
                  <th className="font-normal px-2 py-0.5">Sound file</th>
                </tr>
              </thead>
              <tbody>
                {SOUND_EVENTS.map((event) => {
                  const enabled = settings[`${event.id}_enabled`] === 'true';
                  const filePath = settings[`${event.id}_file`] || '';
                  const isSelected = selectedEventId === event.id;

                  return (
                    <tr 
                      key={event.id}
                      onClick={() => setSelectedEventId(event.id)}
                      className={`cursor-default ${isSelected ? 'bg-[#0078d7] text-white' : 'hover:bg-[#f0f0f0]'}`}
                    >
                      <td className="px-2 py-0.5 border-r border-gray-100 border-opacity-50 flex items-center gap-1.5 truncate">
                        <input 
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setValue(`${event.id}_enabled`, String(e.target.checked))}
                          className="w-3.5 h-3.5 accent-blue-600 rounded-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {event.label}
                      </td>
                      <td className="px-2 py-0.5 truncate text-[12px]">{filePath}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center gap-16 mt-4 mb-2">
            <button 
              onClick={handleBrowse}
              disabled={!selectedEventId}
              className={`px-8 py-1.5 border rounded w-32 ${selectedEventId ? 'bg-[#f0f0f0] border-gray-400 text-black hover:bg-[#e0e0e0]' : 'bg-[#f0f0f0] border-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              Browse...
            </button>
            <button 
              onClick={handlePlay}
              disabled={!selectedEventId || !settings[`${selectedEventId}_file`]}
              className={`px-8 py-1.5 border rounded w-32 ${selectedEventId && settings[`${selectedEventId}_file`] ? 'bg-[#f0f0f0] border-gray-400 text-black hover:bg-[#e0e0e0]' : 'bg-[#f0f0f0] border-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              Play
            </button>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function FolderSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const categories = useSettingsStore((s) => s.categories);
  const setValue = useSettingsStore((s) => s.setValue);
  const setCategories = useSettingsStore((s) => s.setCategories);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState<'new' | 'edit'>('new');

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      const otherCategory = categories.find((c) => c.id === 'other');
      setSelectedCategoryId(otherCategory ? otherCategory.id : categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || categories[0];

  const handleCategoryUpdate = async (updates: Partial<Category>) => {
    if (!selectedCategory) return;
    const updatedCategory = { ...selectedCategory, ...updates };
    
    // Optimistic update
    setCategories(categories.map((c) => (c.id === updatedCategory.id ? updatedCategory : c)));
    
    // Persist
    await window.api.categories.update(updatedCategory);
  };

  const handleCategorySave = async (updates: Partial<Category>) => {
    if (categoryDialogMode === 'new') {
      const newCategory = await window.api.categories.create(updates as any);
      setCategories([...categories, newCategory]);
      setSelectedCategoryId(newCategory.id);
    } else {
      await handleCategoryUpdate(updates);
    }
  };

  const handleBrowseDefaultDir = async () => {
    const dirs = await window.api.system.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: selectedCategory?.defaultDir,
    });
    if (dirs && dirs.length > 0) {
      handleCategoryUpdate({ defaultDir: dirs[0] });
    }
  };

  const handleBrowseTempDir = async () => {
    const dirs = await window.api.system.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: settings.tempDirectory,
    });
    if (dirs && dirs.length > 0) {
      setValue('tempDirectory', dirs[0]);
    }
  };

  if (!selectedCategory) return null;

  const isGeneral = selectedCategory.id === 'other';

  return (
    <div className="max-w-2xl space-y-4 text-sm text-slate-200">
      
      <div className="flex items-center justify-between border-b border-gray-600 pb-2">
        <div className="flex items-center gap-2">
          <img src="/icons/icon.png" alt="" className="w-5 h-5 object-contain opacity-80" />
          <span className="font-medium text-[15px] font-sans">Categories, file types, folders</span>
        </div>
      </div>

      <div className="border border-gray-400 p-4 space-y-4 rounded-sm bg-[#f0f0f0] text-black">
        <div className="text-xs -mt-6 bg-[#f0f0f0] inline-block px-1 ml-2 mb-2">Save To...</div>
        
        <div className="flex items-center gap-2 justify-between">
          <div className="flex flex-col flex-1">
            <label className="mb-1">Category</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="border border-gray-400 p-1 w-64 bg-white outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => { setCategoryDialogMode('new'); setCategoryDialogOpen(true); }}
              className="px-6 py-1 bg-white border border-gray-400 rounded hover:bg-[#e0e0e0] w-24"
            >
              New
            </button>
            <button 
              onClick={() => { setCategoryDialogMode('edit'); setCategoryDialogOpen(true); }}
              disabled={isGeneral}
              className={`px-6 py-1 border rounded w-24 ${isGeneral ? 'bg-[#f0f0f0] border-gray-300 text-gray-400 cursor-not-allowed' : 'bg-[#f0f0f0] border-gray-400 hover:bg-[#e0e0e0]'}`}
            >
              Edit...
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-1">Automatically put in "{selectedCategory.name}" category the following file types:</label>
          {isGeneral ? (
            <input 
              type="text" 
              value="The file types that are not listed in any other category" 
              readOnly 
              className="border border-gray-400 p-1 bg-[#e0e0e0] text-gray-600 cursor-not-allowed outline-none" 
            />
          ) : (
            <input 
              type="text" 
              value={selectedCategory.extensions || ''} 
              onChange={(e) => handleCategoryUpdate({ extensions: e.target.value })}
              className="border border-gray-400 p-1 bg-white outline-none" 
            />
          )}
        </div>

        <div className="flex flex-col mt-2">
          <label className="mb-1">Default download directory for "{selectedCategory.name}" category</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={selectedCategory.defaultDir} 
              onChange={(e) => handleCategoryUpdate({ defaultDir: e.target.value })}
              className="border border-gray-400 p-1 bg-white flex-1 outline-none" 
            />
            <button 
              onClick={handleBrowseDefaultDir}
              className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 rounded hover:bg-[#e0e0e0]"
            >
              Browse
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-4">
          <input 
            type="checkbox" 
            checked={!!selectedCategory.saveLastFolder}
            onChange={(e) => handleCategoryUpdate({ saveLastFolder: e.target.checked })}
            className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
          />
          <span>Change folder for "{selectedCategory.name}" category on last selected</span>
        </label>
      </div>

      <label className="flex items-center gap-2 cursor-pointer pt-2">
        <input 
          type="checkbox" 
          checked={settings.serverCreationDate === 'true'}
          onChange={(e) => setValue('serverCreationDate', String(e.target.checked))}
          className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
        />
        <span>Set file creation date as provided by the server</span>
      </label>

      <div className="border border-gray-400 p-4 rounded-sm bg-[#f0f0f0] text-black mt-6">
        <div className="text-xs -mt-6 bg-[#f0f0f0] inline-block px-1 ml-2 mb-2">Temporary directory</div>
        
        <div className="flex gap-2 mb-2 mt-1">
          <input 
            type="text" 
            value={settings.tempDirectory || 'C:\\Users\\Default\\AppData\\Roaming\\RDM\\'} 
            onChange={(e) => setValue('tempDirectory', e.target.value)}
            className="border border-gray-400 p-1 bg-white flex-1 outline-none" 
          />
          <button 
            onClick={handleBrowseTempDir}
            className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 rounded hover:bg-[#e0e0e0]"
          >
            Browse
          </button>
        </div>
        
        <p className="text-xs text-gray-700 leading-tight mt-3">
          Temporary directory is required for storing file parts during download.<br/>
          If you have several physical drives on your computer, you should select<br/>
          different physical drives for temporary directory and "Save To" folders for<br/>
          faster assembling of downloaded files.
        </p>
      </div>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={categoryDialogMode === 'edit' ? selectedCategory : null}
        onSave={handleCategorySave}
        title={categoryDialogMode === 'new' ? 'Adding a category to IDM categories list' : 'Editing a category from IDM categories list'}
      />

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

function FileTypesSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);
  const [exceptionsDialogOpen, setExceptionsDialogOpen] = useState(false);

  const defaultFileTypes = "3GP 7Z AAC ACE AIF APK ARJ ASF AVI BIN BZ2 EXE GZ GZIP IMG ISO LZH M4A M4V MKV MOV MP3 MP4 MPA MPE MPEG MPG MSI MSU OGG OGV PDF PLJ PPS PPT QT R0* R1* RA RAR RM RMVB SEA SIT SITX TAR TIF TIFF WAV WMA WMV Z ZIP";
  const defaultExcludedSites = "*.update.microsoft.com download.windowsupdate.com *.download.windowsupdate.com siteseal.thawte.com ecom.cimetz.com *.voice2page.com";

  const fileTypes = settings.autoDownloadTypes !== undefined ? settings.autoDownloadTypes : defaultFileTypes;
  const excludedSites = settings.noAutoDownloadSites !== undefined ? settings.noAutoDownloadSites : defaultExcludedSites;

  return (
    <div className="max-w-2xl space-y-4 text-sm text-slate-200">
      
      <div className="flex items-center justify-between border-b border-gray-600 pb-2">
        <div className="flex items-center gap-2">
          <img src="/icons/icon.png" alt="" className="w-5 h-5 object-contain opacity-80" />
          <span className="font-medium text-[15px] font-sans">Downloaded file types</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block mb-1">Automatically start downloading the following file types:</label>
        <textarea
          value={fileTypes}
          onChange={(e) => setValue('autoDownloadTypes', e.target.value)}
          className="w-full h-24 border border-gray-400 p-2 text-black bg-white rounded-none resize-none outline-none font-sans"
        />
        <div className="flex justify-end pt-1">
          <button 
            onClick={() => setValue('autoDownloadTypes', defaultFileTypes)}
            className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors"
          >
            Default
          </button>
        </div>
      </div>

      <div className="space-y-1 mt-6">
        <label className="block mb-1">Don't start downloading automatically from the following sites:</label>
        <textarea
          value={excludedSites}
          onChange={(e) => setValue('noAutoDownloadSites', e.target.value)}
          className="w-full h-16 border border-gray-400 p-2 text-black bg-white rounded-none resize-none outline-none font-sans"
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-slate-400">(separate names by spaces)</span>
          <button 
            onClick={() => setValue('noAutoDownloadSites', defaultExcludedSites)}
            className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors"
          >
            Default
          </button>
        </div>
      </div>

      <div className="space-y-2 mt-6">
        <label className="block mb-1">Don't start downloading automatically from the following addresses:</label>
        <button 
          onClick={() => setExceptionsDialogOpen(true)}
          className="px-8 py-1.5 bg-[#f0f0f0] border border-gray-400 text-black rounded hover:bg-[#e0e0e0] transition-colors min-w-[120px]"
        >
          Edit list ...
        </button>
      </div>

      <AddressExceptionsDialog 
        open={exceptionsDialogOpen} 
        onOpenChange={setExceptionsDialogOpen} 
      />
    </div>
  );
}
