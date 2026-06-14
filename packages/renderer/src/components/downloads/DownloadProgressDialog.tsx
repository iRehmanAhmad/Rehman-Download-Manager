import { useState, useEffect } from 'react';
import type { Download } from '@rdm/shared';
import { formatFileSize } from '@rdm/shared';

interface DownloadProgressDialogProps {
  download: Download;
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function DownloadProgressDialog({
  download,
  onClose,
  onPause,
  onResume,
  onCancel,
}: DownloadProgressDialogProps) {
  const isDownloading = download.status === 'downloading';
  const isPaused = download.status === 'paused';
  const [activeTab, setActiveTab] = useState<'status' | 'speed' | 'options'>('status');

  const [speedLimitEnabled, setSpeedLimitEnabled] = useState(download.speedLimit ? download.speedLimit > 0 : false);
  const [speedLimitStr, setSpeedLimitStr] = useState(download.speedLimit ? (download.speedLimit / 1024).toString() : '100');

  useEffect(() => {
    if (speedLimitEnabled) {
      const limitBytes = Math.max(0, parseFloat(speedLimitStr) * 1024 || 0);
      window.api.download.setSpeedLimit(download.id, limitBytes);
    } else {
      window.api.download.setSpeedLimit(download.id, 0);
    }
  }, [speedLimitEnabled, speedLimitStr, download.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        className="bg-[#f0f0f0] border border-[#ccc] w-[550px] shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col text-[#000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className="bg-gradient-to-b from-[#fff] to-[#e0e0e0] border-b border-[#ccc] px-3 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{Math.round(download.progress)}% {download.filename}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="hover:bg-[#d0d0d0] px-2 text-xs" onClick={onClose}>—</button>
            <button className="hover:bg-[#e81123] hover:text-white px-2 text-xs" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pt-2 gap-0 border-b border-[#ccc] text-xs">
          <button 
            className={`px-3 py-1.5 border border-b-0 translate-y-px ${activeTab === 'status' ? 'bg-[#fff] border-[#ccc] text-black z-10' : 'bg-transparent border-transparent text-[#666] hover:text-black'}`}
            onClick={() => setActiveTab('status')}
          >
            Download status
          </button>
          <button 
            className={`px-3 py-1.5 border border-b-0 translate-y-px ${activeTab === 'speed' ? 'bg-[#fff] border-[#ccc] text-black z-10' : 'bg-transparent border-transparent text-[#666] hover:text-black'}`}
            onClick={() => setActiveTab('speed')}
          >
            Speed Limiter
          </button>
          <button 
            className={`px-3 py-1.5 border border-b-0 translate-y-px ${activeTab === 'options' ? 'bg-[#fff] border-[#ccc] text-black z-10' : 'bg-transparent border-transparent text-[#666] hover:text-black'}`}
            onClick={() => setActiveTab('options')}
          >
            Options on completion
          </button>
        </div>

        {/* Content */}
        <div className="bg-[#fff] p-3 border border-[#ccc] border-t-0 mx-2 mb-2 shadow-inner min-h-[140px] flex flex-col">
          {activeTab === 'status' && (
            <div className="flex-1">
              <div className="truncate text-xs mb-2 text-brand-600">{download.url}</div>
              
              <div className="grid grid-cols-[130px_1fr] gap-y-0.5 text-[11px] mb-3">
                <div className="text-[#333]">Status</div>
                <div className="text-[#0000ff]">{
                  isDownloading ? 'Receiving data...' : 
                  isPaused ? 'Paused' : download.status === 'completed' ? 'Finished' : download.status
                }</div>
                
                <div className="text-[#333]">File size</div>
                <div>{formatFileSize(download.fileSize)}</div>
                
                <div className="text-[#333]">Downloaded</div>
                <div>{formatFileSize(download.downloaded)} ({Number.isNaN(download.progress) ? 0 : download.progress.toFixed(2)}%)</div>
                
                <div className="text-[#333]">Transfer rate</div>
                <div>{isDownloading ? `${formatFileSize(download.speed)}/sec` : '--'}</div>
                
                <div className="text-[#333]">Time left</div>
                <div>{isDownloading ? formatEta(download.eta) : '--'}</div>
                
                <div className="text-[#333] whitespace-nowrap">Resume capability</div>
                <div>Yes</div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3.5 bg-[#e6e6e6] border border-[#ccc] relative overflow-hidden mb-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-b from-[#00d800] to-[#00a800]"
                  style={{ width: `${Number.isNaN(download.progress) ? 0 : download.progress}%` }}
                />
              </div>
            </div>
          )}

          {activeTab === 'speed' && (
            <div className="text-xs text-[#333] flex-1 flex flex-col justify-center items-center">
              <label className="flex items-center gap-2 mb-4">
                <input 
                  type="checkbox" 
                  checked={speedLimitEnabled} 
                  onChange={(e) => setSpeedLimitEnabled(e.target.checked)} 
                /> Use Speed Limiter
              </label>
              <div className="flex items-center gap-2">
                Maximum download speed: 
                <input 
                  type="number" 
                  className="border border-[#ccc] px-1 w-16 disabled:opacity-50" 
                  value={speedLimitStr}
                  onChange={(e) => setSpeedLimitStr(e.target.value)}
                  disabled={!speedLimitEnabled}
                /> KB/s
              </div>
            </div>
          )}

          {activeTab === 'options' && (
            <div className="text-xs text-[#333] flex-1 flex flex-col justify-center items-center">
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" /> Show download complete dialog
              </label>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" /> Disconnect from Internet when done
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" /> Turn off computer when done
              </label>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#eee]">
            <button className="px-5 py-0.5 bg-[#e0e0e0] hover:bg-[#d0d0d0] border border-[#999] rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none">
              Options
            </button>
            <div className="flex items-center gap-2">
              {download.status === 'completed' ? (
                <>
                  <button 
                    onClick={() => { window.api.download.openFile(download.id); onClose(); }}
                    className="px-4 py-0.5 bg-[#e0e0e0] hover:bg-[#d0d0d0] border border-[#999] rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  >
                    Open
                  </button>
                  <button 
                    onClick={() => { window.api.download.openFolder(download.id); onClose(); }}
                    className="px-4 py-0.5 bg-[#e0e0e0] hover:bg-[#d0d0d0] border border-[#999] rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  >
                    Open Folder
                  </button>
                  <button 
                    onClick={onClose}
                    className="px-4 py-0.5 bg-[#e0e0e0] hover:bg-[#d0d0d0] border border-[#999] rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={isDownloading ? onPause : isPaused ? onResume : undefined}
                    className="px-5 py-0.5 bg-[#e0e0e0] hover:bg-[#d0d0d0] border border-[#999] rounded text-xs min-w-[75px] focus:ring-1 focus:ring-brand-500 focus:outline-none"
                    disabled={download.status !== 'downloading' && download.status !== 'paused'}
                  >
                    {isDownloading ? 'Pause' : 'Resume'}
                  </button>
                  <button 
                    onClick={onCancel}
                    className="px-5 py-0.5 bg-[#e0e0e0] hover:bg-[#d0d0d0] border border-[#999] rounded text-xs min-w-[75px] focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '...';
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m} min ${s} sec`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} hours ${m} min`;
}
