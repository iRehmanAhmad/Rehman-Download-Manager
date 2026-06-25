import { useState, useCallback, useEffect, useRef } from 'react';
import { extractFilename, type DownloadOptions } from '@rdm/shared';
import { useDownloadStore } from '../../stores/download-store';
import { useSettingsStore } from '../../stores/settings-store';
import { Folder, File as FileIcon, Music, Video, Archive, FileText, X, ChevronDown, ChevronUp, Loader2, Sparkles } from 'lucide-react';

export function GlobalAddUrlDialog() {
  const addDownload = useDownloadStore((s) => s.addDownload);
  const categories = useSettingsStore((s) => s.categories);
  const [showDialog, setShowDialog] = useState(false);
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filepath, setFilepath] = useState('');
  const [description, setDescription] = useState('');
  const [rememberPath, setRememberPath] = useState(false);
  const [connections, setConnections] = useState(8);
  const [checksum, setChecksum] = useState('');
  const [adding, setAdding] = useState(false);
  const [fileSize, setFileSize] = useState<number>(-1);
  const [fetchingSize, setFetchingSize] = useState(false);
  const [preId, setPreId] = useState<string | null>(null);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoDetectedCategory, setAutoDetectedCategory] = useState(false);
  
  const [availableFormats, setAvailableFormats] = useState<{ id: string, label: string, isAudioOnly: boolean }[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');

  const submittedRef = useRef(false);

  useEffect(() => {
    if (showDialog && url && categories.length > 0) {
      const filename = extractFilename(url);
      const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
      
      let detectedCatId = categoryId;
      setAutoDetectedCategory(false);
      
      // Auto-detect category
      if (!categoryId) {
        let foundCat = categories.find(c => c.name.toLowerCase() === 'other') || categories.find(c => c.name.toLowerCase() === 'general');
        if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
          foundCat = categories.find(c => c.name.toLowerCase() === 'compressed');
        } else if (['.mp3', '.wav', '.flac', '.aac'].includes(ext)) {
          foundCat = categories.find(c => c.name.toLowerCase() === 'music');
        } else if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext)) {
          foundCat = categories.find(c => c.name.toLowerCase() === 'video');
        } else if (['.exe', '.msi', '.apk'].includes(ext)) {
          foundCat = categories.find(c => c.name.toLowerCase() === 'programs');
        } else if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) {
          foundCat = categories.find(c => c.name.toLowerCase() === 'documents');
        }
        
        if (foundCat) {
          detectedCatId = foundCat.id;
          setCategoryId(foundCat.id);
          setAutoDetectedCategory(true);
        } else {
          detectedCatId = categories[0].id;
          setCategoryId(categories[0].id);
        }
      }

      // Auto-fill Save As path
      const currentCat = categories.find((c) => c.id === detectedCatId) || categories[0];
      if (currentCat) {
        const baseDir = (currentCat.defaultDir || 'Downloads').replace(/[\\/]$/, '');
        const sep = baseDir.includes('/') && !baseDir.includes('\\') ? '/' : '\\';
        setFilepath(`${baseDir}${sep}${filename}`);
      }
    } else if (showDialog && !url && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
      setFilepath(categories[0].defaultDir);
      setAutoDetectedCategory(false);
    }
  }, [showDialog, url, categories, categoryId]);

  useEffect(() => {
    if (!showDialog || !url || !window.api?.download?.getFileInfo) return;
    const isValid = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://');
    if (!isValid) return;

    let cancelled = false;
    setFetchingSize(true);
    setFileSize(-1);

    const timer = setTimeout(async () => {
      try {
        const info = await window.api.download.getFileInfo(url);
        if (!cancelled && info) {
          if (info.fileSize > 0) setFileSize(info.fileSize);
          if (info.preId) setPreId(info.preId);
          
          if (info.formats && info.formats.length > 0) {
            setAvailableFormats(info.formats);
            setSelectedFormatId(info.formats[0].id); // default to best available
          } else {
            setAvailableFormats([]);
            setSelectedFormatId('');
          }

          if (info.filename) {
            setFilepath((prev) => {
              const baseDir = prev.substring(0, Math.max(prev.lastIndexOf('\\'), prev.lastIndexOf('/')) + 1) || '';
              if (!baseDir) return info.filename as string;
              return `${baseDir}${info.filename}`;
            });
          }
        }
      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) setFetchingSize(false);
      }
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showDialog, url]);

  useEffect(() => {
    return () => {
      if (preId && !submittedRef.current) {
        window.api.download.discardPre(preId).catch(() => {});
      }
    };
  }, [preId]);

  const formatSize = (bytes: number) => {
    if (bytes <= 0) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const getEstTime = (bytes: number, speedMBps: number) => {
    if (bytes <= 0) return '--';
    const seconds = bytes / (speedMBps * 1024 * 1024);
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    return `${(seconds / 3600).toFixed(1)} hr`;
  };

  const getCategoryIcon = (catName: string) => {
    const name = catName.toLowerCase();
    const props = { size: 24, className: "text-brand-500 mb-2 opacity-80" };
    if (name === 'music') return <Music {...props} />;
    if (name === 'video') return <Video {...props} />;
    if (name === 'compressed') return <Archive {...props} />;
    if (name === 'documents') return <FileText {...props} />;
    if (name === 'programs') return <FileIcon {...props} />;
    return <FileIcon {...props} />;
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCategoryId(newId);
    setAutoDetectedCategory(false);
    const cat = categories.find((c) => c.id === newId);
    if (cat) {
      const filename = url ? extractFilename(url) : '';
      const baseDir = (cat.defaultDir || 'Downloads').replace(/[\\/]$/, '');
      const sep = baseDir.includes('/') && !baseDir.includes('\\') ? '/' : '\\';
      setFilepath(filename ? `${baseDir}${sep}${filename}` : (cat.defaultDir || `Downloads${sep}`));
    }
  };

  const handleBrowse = async () => {
    const selected = await window.api.system.selectSavePath(filepath);
    if (selected) {
      setFilepath(selected);
    }
  };

  useEffect(() => {
    const handleOpenAddUrl = async (e: Event) => {
      submittedRef.current = false;
      const customEvent = e as CustomEvent<{ url?: string }>;
      let initialUrl = customEvent.detail?.url;
      if (!initialUrl) {
        try {
          const clipText = await window.api.clipboard.readText();
          if (clipText && (clipText.startsWith('http://') || clipText.startsWith('https://') || clipText.startsWith('ftp://'))) {
            initialUrl = clipText.trim();
          }
        } catch (err) {}
      }
      if (initialUrl) {
        setUrl(initialUrl);
      }
      setAvailableFormats([]);
      setSelectedFormatId('');
      setShowDialog(true);
      setShowAdvanced(false);
    };
    window.addEventListener('open-add-url-dialog', handleOpenAddUrl);

    // Listen to IPC event from main process (intercepted by extension)
    const removeIpcListener = window.api.app?.onShowAddDownloadDialog?.((data) => {
      submittedRef.current = false;
      setUrl(data.url);
      
      // If we got a specific filename, we can try to set it, but usually the first useEffect 
      // will run and set the filepath based on extractFilename(url). 
      // If data.filename exists, we can let the UI logic handle it or override.
      // For now, setting the URL is enough to trigger the metadata fetch and category detection.
      
      setAvailableFormats([]);
      setSelectedFormatId('');
      setShowDialog(true);
      setShowAdvanced(false);
    });

    return () => {
      window.removeEventListener('open-add-url-dialog', handleOpenAddUrl);
      removeIpcListener?.();
    };
  }, [showDialog]);

  const handleAdd = useCallback(
    async (paused: boolean) => {
      if (!url.trim() || !filepath.trim() || adding) return;
      setAdding(true);
      try {
        if (rememberPath) {
          const cat = categories.find((c) => c.id === categoryId);
          if (cat) {
            const dir = filepath.substring(0, Math.max(filepath.lastIndexOf('\\'), filepath.lastIndexOf('/'))) || filepath;
            await window.api.categories.update({ ...cat, defaultDir: dir });
            const newCats = await window.api.categories.getAll();
            useSettingsStore.getState().setCategories(newCats);
          }
        }

        submittedRef.current = true;
        const options: DownloadOptions = {
          url: url.trim(),
          filepath: filepath.trim() || undefined,
          categoryId: categoryId || undefined,
          numConnections: connections,
          checksum: checksum.trim() || undefined,
          paused,
          metadata: { 
            description: description.trim(),
            ...(selectedFormatId ? { ytdlpFormat: selectedFormatId } : {})
          },
          ...(preId ? { preId } : {})
        };
        const dl = await window.api.download.add(options);
        addDownload(dl);
        setUrl('');
        setFilepath('');
        setDescription('');
        setChecksum('');
        setPreId(null);
        setShowDialog(false);
      } catch (err) {
        console.error('Failed to add download:', err);
        submittedRef.current = false;
      } finally {
        setAdding(false);
      }
    },
    [url, filepath, categoryId, connections, checksum, description, rememberPath, adding, addDownload, categories, preId, selectedFormatId],
  );

  const handleClose = () => setShowDialog(false);

  if (!showDialog) return null;

  const currentCategoryName = categories.find((c) => c.id === categoryId)?.name || 'General';
  
  const isValidUrl = url.trim().length > 0 && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://'));
  const isValidPath = filepath.trim().length > 0;
  const canAdd = isValidUrl && isValidPath && !adding;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110]" onMouseDown={handleClose}>
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl text-slate-800 dark:text-slate-200 font-sans flex flex-col relative transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Add New Download
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure download details and choose whether to start immediately or add to queue.
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              autoFocus
            />
            {url.trim().length > 0 && !isValidUrl && (
              <p className="text-xs text-red-500 mt-1">Please enter a valid HTTP, HTTPS, or FTP URL.</p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Save To</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={filepath}
                  onChange={(e) => setFilepath(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                />
                <button
                  onClick={handleBrowse}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 border border-transparent rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors shadow-sm"
                >
                  Browse
                </button>
              </div>
            </div>

            <div className="w-48 space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex justify-between">
                Category
                {autoDetectedCategory && <span className="text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400 px-1.5 py-0.5 rounded font-semibold tracking-wide flex items-center gap-1"><Sparkles size={10} /> Auto</span>}
              </label>
              <select
                value={categoryId}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {availableFormats.length > 0 && (
              <div className="w-48 space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Video Quality
                </label>
                <select
                  value={selectedFormatId}
                  onChange={(e) => setSelectedFormatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                >
                  {availableFormats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
             <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberPath}
                  onChange={(e) => setRememberPath(e.target.checked)}
                  className="accent-brand-600 w-4 h-4 rounded"
                />
                Use this folder as default for the <strong>{currentCategoryName}</strong> category
             </label>
          </div>
          
          {/* File Info Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center gap-4 mt-2">
            <div className="bg-white dark:bg-slate-900 p-2 rounded shadow-sm border border-slate-100 dark:border-slate-700/50">
              {getCategoryIcon(currentCategoryName)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {fetchingSize ? 'Fetching file details...' : (fileSize > 0 ? formatSize(fileSize) : 'Unknown Size')}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {fetchingSize ? 'Waiting for server response' : (fileSize > 0 ? 'Estimated from server response' : 'Server did not provide size')}
              </span>
            </div>
          </div>

          {/* Advanced Section */}
          <div className="mt-2">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Advanced options
            </button>
            
            {showAdvanced && (
              <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-lg grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description / Notes</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes about this file..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Checksum (SHA256/MD5)</label>
                  <input
                    type="text"
                    value={checksum}
                    onChange={(e) => setChecksum(e.target.value)}
                    placeholder="Optional verification hash..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Connections</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={connections}
                    onChange={(e) => setConnections(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                
                {/* Advanced Estimates */}
                <div className="col-span-2 flex justify-between border-t border-slate-200 dark:border-slate-700 pt-3 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500">Est. Time (5MB/s)</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {fetchingSize ? '--' : getEstTime(fileSize, 5)}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[11px] text-slate-500">Time Saved ({connections}x)</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      {fetchingSize || fileSize <= 0 ? '--' : getEstTime(fileSize * (1 - 1/connections), 5)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleAdd(true)}
            disabled={!canAdd}
            className="px-4 py-2 text-sm font-medium border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Add to Queue
          </button>
          <button
            onClick={() => handleAdd(false)}
            disabled={!canAdd}
            className="px-6 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
          >
            {adding ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : 'Download Now'}
          </button>
        </div>

      </div>
    </div>
  );
}
