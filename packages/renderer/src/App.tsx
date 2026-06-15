import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Download } from '@rdm/shared';
import { TitleBar } from './components/layout/TitleBar';
import { MenuBar } from './components/layout/MenuBar';
import { TopToolbar } from './components/layout/TopToolbar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { DownloadsPage } from './pages/DownloadsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { AutomationPage } from './pages/AutomationPage';
import { PluginsPage } from './pages/PluginsPage';
import { GrabberPage } from './pages/GrabberPage';
import { GlobalAddUrlDialog } from './components/downloads/GlobalAddUrlDialog';
import { BatchDownloadDialog } from './components/downloads/BatchDownloadDialog';
import { BatchDownloadListDialog } from './components/downloads/BatchDownloadListDialog';
import { ImportLinksDialog } from './components/downloads/ImportLinksDialog';
import { ExportDialog } from './components/downloads/ExportDialog';
import { useSettingsStore } from './stores/settings-store';
import { useDownloadStore } from './stores/download-store';

export function App() {
  const loadAll = useSettingsStore((s) => s.loadAll);
  const updateDownload = useDownloadStore((s) => s.updateDownload);

  const addDownload = useDownloadStore((s) => s.addDownload);

  useEffect(() => {
    loadAll();
    
    // Fetch initial downloads
    if (typeof window.api.download.getAll === 'function') {
      window.api.download.getAll().then((dls) => {
        dls.forEach(dl => addDownload(dl));
      }).catch(err => console.error('Failed to get all downloads:', err));
    }
    
    // Global listeners for download progress (so they update even if we navigate away from DownloadsPage)
    let unsubAdded = () => {};
    if (typeof window.api.download.onAdded === 'function') {
      unsubAdded = window.api.download.onAdded((dl: Download) => {
        addDownload(dl);
      });
    }
    
    const unsubProgress = window.api.download.onProgress((dl: Download) => {
      updateDownload(dl.id, dl);
    });
    const unsubCompleted = window.api.download.onCompleted((dl: Download) => {
      updateDownload(dl.id, dl);
    });
    const unsubError = window.api.download.onError((dl: Download) => {
      updateDownload(dl.id, dl);
    });

    return () => {
      unsubAdded();
      unsubProgress();
      unsubCompleted();
      unsubError();
    };
  }, [loadAll, updateDownload, addDownload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    let url = e.dataTransfer.getData('text/uri-list');
    if (!url) {
      url = e.dataTransfer.getData('text/plain');
    }
    
    // Quick validation
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://'))) {
      const event = new CustomEvent('open-add-url-dialog', { detail: url });
      window.dispatchEvent(event);
    }
  };

  return (
    <HashRouter>
      <div 
        className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 text-slate-100"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <TitleBar />
        <MenuBar />
        <TopToolbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-transparent">
            <Routes>
              <Route path="/" element={<Navigate to="/list/all" replace />} />
              <Route path="/list/:status" element={<DownloadsPage />} />
              <Route path="/list/:status/:categoryId" element={<DownloadsPage />} />
              <Route path="/automation" element={<AutomationPage />} />
              <Route path="/scheduler" element={<SchedulerPage />} />
              <Route path="/plugins" element={<PluginsPage />} />
              <Route path="/grabber" element={<GrabberPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
        <StatusBar />
        <GlobalAddUrlDialog />
        <BatchDownloadDialog />
        <BatchDownloadListDialog />
        <ImportLinksDialog />
        <ExportDialog />
      </div>
    </HashRouter>
  );
}
