import { useState, useEffect } from 'react';
import { useDownloadStore } from '../../stores/download-store';

export function ExportDialog() {
  const [show, setShow] = useState(false);
  const [format, setFormat] = useState<'ef2' | 'txt'>('ef2');
  const [mode, setMode] = useState<'queue' | 'selected' | 'all'>('queue');
  
  const selectedIds = useDownloadStore(s => s.selectedIds);
  const hasSelection = selectedIds && selectedIds.size > 0;

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const ce = e as CustomEvent<string>;
      setFormat(ce.detail as 'ef2' | 'txt');
      setMode('queue');
      setShow(true);
    };
    window.addEventListener('open-export-dialog', handleOpen);
    return () => window.removeEventListener('open-export-dialog', handleOpen);
  }, []);

  if (!show) return null;

  const handleExport = async () => {
    try {
      await window.api.download.export({
        format,
        mode,
        selectedIds: mode === 'selected' ? Array.from(selectedIds || []) : []
      });
      setShow(false);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f0f0f0] text-black w-[400px] shadow-2xl rounded-sm overflow-hidden flex flex-col border border-gray-400">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-gray-300 select-none">
          <div className="text-sm">Export download list</div>
          <button 
            onClick={() => setShow(false)}
            className="hover:bg-[#e81123] hover:text-white p-1 rounded-sm transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="export_mode" 
                value="queue"
                checked={mode === 'queue'}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-[13px]">Export download queue</span>
            </label>
            
            <label className={`flex items-center gap-2 ${!hasSelection ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input 
                type="radio" 
                name="export_mode" 
                value="selected"
                checked={mode === 'selected'}
                disabled={!hasSelection}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:cursor-not-allowed"
              />
              <span className="text-[13px]">Export selected files</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="export_mode" 
                value="all"
                checked={mode === 'all'}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-[13px]">Export all files</span>
            </label>
          </div>
          
          <div className="flex flex-col gap-2 w-[80px]">
            <button 
              onClick={handleExport}
              className="px-4 py-1 bg-white border border-blue-500 rounded text-sm hover:bg-blue-50 active:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              OK
            </button>
            <button 
              onClick={() => setShow(false)}
              className="px-4 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
