import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { DownloadsPage } from './pages/DownloadsPage';
import { CompletedPage } from './pages/CompletedPage';
import { SettingsPage } from './pages/SettingsPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { AutomationPage } from './pages/AutomationPage';
import { PluginsPage } from './pages/PluginsPage';
import { useSettingsStore } from './stores/settings-store';

export function App() {
  const loadAll = useSettingsStore((s) => s.loadAll);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <BrowserRouter>
      <div className="flex flex-col h-full">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-slate-950">
            <Routes>
              <Route path="/" element={<DownloadsPage />} />
              <Route path="/completed" element={<CompletedPage />} />
              <Route path="/automation" element={<AutomationPage />} />
              <Route path="/scheduler" element={<SchedulerPage />} />
              <Route path="/plugins" element={<PluginsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
        <StatusBar />
      </div>
    </BrowserRouter>
  );
}
