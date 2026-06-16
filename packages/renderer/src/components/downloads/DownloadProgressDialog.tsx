import { useState, useEffect } from 'react';
import { X, Minus, Activity } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'status' | 'speed'>('status');

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
        <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <Activity size={14} className="text-brand-500" />
            <span className="text-xs font-semibold">{Math.round(download.progress)}% {download.filename}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="hover:bg-slate-100 rounded px-1.5 py-0.5 text-slate-500 transition-colors" onClick={onClose}><Minus size={14} /></button>
            <button className="hover:bg-red-500 rounded px-1.5 py-0.5 text-slate-500 hover:text-white transition-colors" onClick={onClose}><X size={14} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pt-2 gap-0 border-b border-[#ccc] text-xs">
          <button 
            className={`px-4 py-1.5 border border-b-0 translate-y-px rounded-t-sm transition-colors ${activeTab === 'status' ? 'bg-[#fff] border-[#ccc] text-slate-900 z-10 font-medium' : 'bg-transparent border-transparent text-[#666] hover:text-slate-900'}`}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
          <button 
            className={`px-4 py-1.5 border border-b-0 translate-y-px rounded-t-sm transition-colors ${activeTab === 'speed' ? 'bg-[#fff] border-[#ccc] text-slate-900 z-10 font-medium' : 'bg-transparent border-transparent text-[#666] hover:text-slate-900'}`}
            onClick={() => setActiveTab('speed')}
          >
            Speed Limit
          </button>
        </div>

        {/* Content */}
        <div className="bg-[#fff] p-3 border border-[#ccc] border-t-0 mx-2 mb-2 shadow-inner min-h-[140px] flex flex-col">
          {activeTab === 'status' && (
            <div className="flex-1">
              <div className="truncate text-xs mb-2 text-brand-600">{download.url}</div>
              
              <div className="grid grid-cols-[130px_1fr] gap-y-0.5 text-[11px] mb-3">
                <div className="text-[#333]">Status</div>
                <div className="text-[#0000ff] font-medium">{
                  isDownloading ? 'Downloading' : 
                  isPaused ? 'Paused' : download.status === 'completed' ? 'Finished' : download.status
                }</div>
                
                <div className="text-[#333]">File size</div>
                <div>{formatFileSize(download.fileSize)}</div>
                
                <div className="text-[#333]">Downloaded</div>
                <div>{formatFileSize(download.downloaded)} ({Number.isNaN(download.progress) ? 0 : download.progress.toFixed(2)}%)</div>
                
                <div className="text-[#333]">Transfer rate</div>
                <div className="flex items-center gap-2">
                  {isDownloading ? `${formatFileSize(download.speed)}/sec` : '--'}
                  {speedLimitEnabled && speedLimitStr && (
                    <span className="text-[10px] text-brand-600 bg-brand-50 px-1 rounded border border-brand-200">
                      Limit: {speedLimitStr} KB/s
                    </span>
                  )}
                </div>
                
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
              <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={speedLimitEnabled} 
                  onChange={(e) => setSpeedLimitEnabled(e.target.checked)} 
                  className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                /> 
                <span className="font-medium">Use Speed Limiter</span>
              </label>
              <div className="flex items-center gap-2">
                Maximum download speed: 
                <input 
                  type="number" 
                  className="border border-[#ccc] px-2 py-1 w-20 rounded disabled:opacity-50 focus:outline-none focus:border-brand-500" 
                  value={speedLimitStr}
                  min="1"
                  step="1"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || parseInt(val, 10) > 0) {
                      setSpeedLimitStr(val);
                    }
                  }}
                  disabled={!speedLimitEnabled}
                /> KB/s
              </div>
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
