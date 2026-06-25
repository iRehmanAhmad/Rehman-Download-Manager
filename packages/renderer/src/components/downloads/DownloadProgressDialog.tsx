import { useState, useEffect } from 'react';
import { X, Minus, Activity } from 'lucide-react';
import type { Download } from '@rdm/shared';
import { formatFileSize } from '@rdm/shared';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  const [speedHistory, setSpeedHistory] = useState<{time: string, speedMB: number}[]>(() => {
    const init = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 1000);
      init.push({ 
        time: t.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }), 
        speedMB: 0 
      });
    }
    return init;
  });

  useEffect(() => {
    if (download.status === 'downloading') {
      setSpeedHistory(prev => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
        
        // Prevent adding duplicate identical timestamps in the exact same second to avoid Recharts glitches
        if (prev.length > 0 && prev[prev.length - 1].time === timeStr) {
           const updated = [...prev];
           updated[updated.length - 1].speedMB = Number((download.speed / (1024 * 1024)).toFixed(2));
           return updated;
        }

        const newEntry = { time: timeStr, speedMB: Number((download.speed / (1024 * 1024)).toFixed(2)) };
        const next = [...prev, newEntry];
        if (next.length > 30) return next.slice(next.length - 30);
        return next;
      });
    }
  }, [download.speed, download.status]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-[550px] shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Activity size={14} className="text-brand-500" />
            <span className="text-xs font-semibold">{Math.round(download.progress)}% {download.filename}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="hover:bg-slate-200 dark:hover:bg-slate-800 rounded px-1.5 py-0.5 text-slate-500 dark:text-slate-400 transition-colors" onClick={onClose}><Minus size={14} /></button>
            <button className="hover:bg-red-500 rounded px-1.5 py-0.5 text-slate-500 dark:text-slate-400 hover:text-white dark:hover:text-white transition-colors" onClick={onClose}><X size={14} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pt-2 gap-0 border-b border-slate-300 dark:border-slate-700 text-xs">
          <button 
            className={`px-4 py-1.5 border border-b-0 translate-y-px rounded-t-sm transition-colors ${activeTab === 'status' ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white z-10 font-medium' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
            onClick={() => setActiveTab('status')}
          >
            Status
          </button>
          <button 
            className={`px-4 py-1.5 border border-b-0 translate-y-px rounded-t-sm transition-colors ${activeTab === 'speed' ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white z-10 font-medium' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}`}
            onClick={() => setActiveTab('speed')}
          >
            Speed Limit
          </button>
        </div>

        {/* Content */}
        <div className={`p-4 mx-2 mb-2 min-h-[140px] flex flex-col ${activeTab === 'status' ? 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-b-lg rounded-tr-lg shadow-inner dark:shadow-2xl relative overflow-hidden border border-slate-300 dark:border-slate-700/50' : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 border-t-0 shadow-inner'}`}>
          {activeTab === 'status' && (
            <div className="flex-1 relative z-10 flex flex-col">
              <style>{`
                @keyframes liquidGradient {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
                }
                .animate-liquid {
                  background-size: 200% 200%;
                  animation: liquidGradient 3s ease infinite;
                }
                .glow-pulse {
                  animation: pulseGlow 2s infinite alternate;
                }
                @keyframes pulseGlow {
                  from { box-shadow: 0 0 5px rgba(0, 229, 255, 0.5); }
                  to { box-shadow: 0 0 15px rgba(0, 229, 255, 0.8), 0 0 5px rgba(138, 43, 226, 0.8); }
                }
              `}</style>
              
              {/* Decorative Ambient Background Glow */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 rounded-lg">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 dark:bg-purple-600/20 blur-[60px] rounded-full mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 dark:bg-cyan-500/20 blur-[60px] rounded-full mix-blend-screen"></div>
              </div>

              <div className="flex justify-between items-end mb-4">
                <div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">{download.url}</div>
                  <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400">
                    {Number.isNaN(download.progress) ? 0 : download.progress.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatFileSize(download.downloaded)} / {formatFileSize(download.fileSize)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.3)] dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                    {isDownloading ? `${formatFileSize(download.speed)}/s` : '--'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isDownloading ? formatEta(download.eta) : isPaused ? 'Paused' : download.status}
                  </div>
                </div>
              </div>

              {/* Liquid Progress Bar */}
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden mb-4 border border-slate-300 dark:border-slate-700/50 relative shadow-inner">
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 dark:from-cyan-500 dark:via-purple-500 dark:to-cyan-500 animate-liquid glow-pulse rounded-full"
                  style={{ width: `${Number.isNaN(download.progress) ? 0 : download.progress}%` }}
                />
              </div>

              {/* Glowing Connections Map (LEDs) */}
              {download.fileSize > 0 && download.chunks && download.chunks.length > 0 && (
                <div className="mb-4">
                  <div className="text-[9px] text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Connection Streams</div>
                  <div className="flex gap-1 h-1.5">
                    {download.chunks.map((chunk) => {
                      const isActive = chunk.status === 'downloading';
                      const isComplete = chunk.status === 'completed';
                      return (
                        <div 
                          key={chunk.id} 
                          className={`flex-1 rounded-full transition-all duration-300 ${isComplete ? 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.6)]' : isActive ? 'bg-purple-500 animate-pulse shadow-[0_0_5px_rgba(168,85,247,0.6)]' : 'bg-slate-300 dark:bg-slate-800'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Neon Speed Graph */}
              <div className="w-full h-[80px] bg-white/50 dark:bg-slate-800/40 rounded-lg border border-slate-300 dark:border-slate-700/50 relative overflow-hidden flex items-end">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={speedHistory} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="neonSpeed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6}/>
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.0}/>
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.3} />
                    <XAxis dataKey="time" hide={true} />
                    <YAxis 
                      tick={{fontSize: 9, fill: '#64748b'}} 
                      tickFormatter={(val) => `${val}`}
                      domain={[0, 'auto']}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: '11px', borderRadius: '6px', padding: '6px 10px', backgroundColor: 'var(--tooltip-bg, rgba(15, 23, 42, 0.9))', border: '1px solid #334155', color: '#e2e8f0', backdropFilter: 'blur(4px)' }}
                      formatter={(value: number) => [`${value} MB/s`, 'Bandwidth']}
                      labelStyle={{ color: '#94a3b8', marginBottom: '2px' }}
                      itemStyle={{ color: '#22d3ee' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="speedMB" 
                      stroke="#06b6d4" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#neonSpeed)" 
                      isAnimationActive={false} 
                      style={{ filter: 'url(#glow)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'speed' && (
            <div className="text-xs text-slate-800 dark:text-slate-200 flex-1 flex flex-col justify-center items-center">
              <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={speedLimitEnabled} 
                  onChange={(e) => setSpeedLimitEnabled(e.target.checked)} 
                  className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-brand-500 focus:ring-brand-500"
                /> 
                <span className="font-medium">Use Speed Limiter</span>
              </label>
              <div className="flex items-center gap-2">
                Maximum download speed: 
                <input 
                  type="number" 
                  className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1 w-20 rounded disabled:opacity-50 focus:outline-none focus:border-brand-500" 
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
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-200 dark:border-slate-800">
            <button className="px-5 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors">
              Options
            </button>
            <div className="flex items-center gap-2">
              {download.status === 'completed' ? (
                <>
                  <button 
                    onClick={() => { window.api.download.openFile(download.id); onClose(); }}
                    className="px-4 py-0.5 bg-brand-50 dark:bg-brand-500/20 hover:bg-brand-100 dark:hover:bg-brand-500/30 border border-brand-200 dark:border-brand-500/50 text-brand-700 dark:text-brand-300 font-medium rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
                  >
                    Open
                  </button>
                  <button 
                    onClick={() => { window.api.download.openFolder(download.id); onClose(); }}
                    className="px-4 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
                  >
                    Open Folder
                  </button>
                  <button 
                    onClick={onClose}
                    className="px-4 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={isDownloading ? onPause : isPaused ? onResume : undefined}
                    className="px-5 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs min-w-[75px] focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
                    disabled={download.status !== 'downloading' && download.status !== 'paused'}
                  >
                    {isDownloading ? 'Pause' : 'Resume'}
                  </button>
                  <button 
                    onClick={onCancel}
                    className="px-5 py-0.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs min-w-[75px] focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
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
