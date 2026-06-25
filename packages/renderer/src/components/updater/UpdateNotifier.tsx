import React, { useEffect, useState } from 'react';
import { DownloadCloud, RefreshCw, X } from 'lucide-react';

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // We assume `window.api.updater` exists due to preload
    const api = (window as any).api?.updater;
    if (!api) return;

    const cleanupAvailable = api.onUpdateAvailable(() => {
      setUpdateAvailable(true);
      setVisible(true);
    });

    const cleanupProgress = api.onDownloadProgress((prog: any) => {
      setProgress(prog.percent);
    });

    const cleanupDownloaded = api.onUpdateDownloaded(() => {
      setUpdateDownloaded(true);
      setUpdateAvailable(false);
      setVisible(true);
    });

    return () => {
      if (cleanupAvailable) cleanupAvailable();
      if (cleanupProgress) cleanupProgress();
      if (cleanupDownloaded) cleanupDownloaded();
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl shadow-cyan-500/10 flex items-center space-x-4 max-w-sm">
        <div className="bg-cyan-500/10 p-2 rounded-lg text-cyan-400">
          {updateDownloaded ? <RefreshCw className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5 animate-pulse" />}
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-200">
            {updateDownloaded ? 'Update Ready' : 'Downloading Update'}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {updateDownloaded 
              ? 'A new version has been downloaded and is ready to install.'
              : `Downloading... ${Math.round(progress)}%`}
          </p>
          
          {updateAvailable && !updateDownloaded && (
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-cyan-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {updateDownloaded && (
            <button
              onClick={() => {
                (window as any).api?.updater?.quitAndInstall();
              }}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Restart
            </button>
          )}
          <button
            onClick={() => setVisible(false)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
