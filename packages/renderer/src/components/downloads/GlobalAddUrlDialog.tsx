import { useState, useCallback, useEffect, useRef } from 'react';
import { extractFilename, type DownloadOptions } from '@rdm/shared';
import { useDownloadStore } from '../../stores/download-store';
import { useSettingsStore } from '../../stores/settings-store';
import { Folder, File as FileIcon, Music, Video, Archive, FileText } from 'lucide-react';

export function GlobalAddUrlDialog() {
  const addDownload = useDownloadStore((s) => s.addDownload);
  const categories = useSettingsStore((s) => s.categories);
  const updateCategory = useSettingsStore((s) => s.setCategories); // Wait, this doesn't exist, we'd need to use window.api.categories.update

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
  const submittedRef = useRef(false);

  // Initialize category to "other" or first available
  // Initialize category to "other" or first available, and auto-detect based on URL
  useEffect(() => {
    if (showDialog && url && categories.length > 0) {
      const filename = extractFilename(url);
      const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
      
      let detectedCatId = categoryId;
      
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
        }
      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) setFetchingSize(false);
      }
    }, 50); // fast fetch

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
    if (name === 'music') return <Music className="w-12 h-12 text-brand-400 mb-2" />;
    if (name === 'video') return <Video className="w-12 h-12 text-brand-400 mb-2" />;
    if (name === 'compressed') return <Archive className="w-12 h-12 text-brand-400 mb-2" />;
    if (name === 'documents') return <FileText className="w-12 h-12 text-brand-400 mb-2" />;
    if (name === 'programs') return <FileIcon className="w-12 h-12 text-brand-400 mb-2" />;
    return <FileIcon className="w-12 h-12 text-brand-400 mb-2" />;
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setCategoryId(newId);
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
      setShowDialog(true);
    };
    
    window.addEventListener('open-add-url-dialog', handleOpenAddUrl);

    return () => {
      window.removeEventListener('open-add-url-dialog', handleOpenAddUrl);
    };
  }, [showDialog]);

  const handleAdd = useCallback(
    async (paused: boolean) => {
      if (!url.trim() || adding) return;
      setAdding(true);
      try {
        if (rememberPath) {
          const cat = categories.find((c) => c.id === categoryId);
          if (cat) {
            // Very naive way to get directory, should ideally be backend logic or path.dirname
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
          metadata: { description: description.trim() },
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
    [url, filepath, categoryId, connections, checksum, description, rememberPath, adding, addDownload, categories, preId],
  );

  const handleClose = () => setShowDialog(false);

  if (!showDialog) return null;

  const currentCategoryName = categories.find((c) => c.id === categoryId)?.name || 'General';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onMouseDown={handleClose}>
      <div
        className="bg-[#f0f0f0] dark:bg-[#2b2b2b] border border-gray-400 dark:border-slate-700 rounded-md p-3 w-full max-w-[620px] shadow-2xl font-sans"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 border-b border-gray-400 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Icon" className="w-4 h-4 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
            <h2 className="text-[13px] text-black dark:text-slate-100 font-medium">Download File Info</h2>
          </div>
          <button onClick={handleClose} className="text-gray-600 dark:text-slate-400 hover:text-white px-1">✕</button>
        </div>

        <div className="flex gap-4">
          {/* Left Column */}
          <div className="flex-1 flex flex-col">
            <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="w-16 text-right text-[13px] text-black dark:text-slate-300">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-gray-400 dark:border-slate-600 rounded text-[13px] text-black dark:text-slate-200 focus:outline-none focus:border-brand-500"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="w-16 text-right text-[13px] text-black dark:text-slate-300">Category</label>
            <div className="flex-1 flex gap-2">
              <select
                value={categoryId}
                onChange={handleCategoryChange}
                className="flex-1 px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-gray-400 dark:border-slate-600 rounded text-[13px] text-black dark:text-slate-200 focus:outline-none focus:border-brand-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="px-2 py-0.5 bg-[#e1e1e1] dark:bg-[#3a3a3a] hover:bg-[#d1d1d1] dark:hover:bg-[#4a4a4a] border border-gray-400 dark:border-slate-600 rounded text-black dark:text-slate-200 text-[13px]">
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="w-16 text-right text-[13px] text-black dark:text-slate-300">Save As</label>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={filepath}
                onChange={(e) => setFilepath(e.target.value)}
                className="flex-1 px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-gray-400 dark:border-slate-600 rounded text-[13px] text-black dark:text-slate-200 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-1 bg-[#e1e1e1] dark:bg-[#3a3a3a] hover:bg-[#d1d1d1] dark:hover:bg-[#4a4a4a] border border-gray-400 dark:border-slate-600 rounded text-black dark:text-slate-200 text-[13px]"
              >
                Browse
              </button>
            </div>
          </div>

          <div className="flex">
            <div className="w-16 mr-2"></div>
            <fieldset className="flex-1 border border-slate-500 rounded px-2 pb-1.5 pt-0 mt-1">
              <legend className="px-1 ml-1 flex items-center gap-1.5 text-[12px] text-black dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberPath}
                  onChange={(e) => setRememberPath(e.target.checked)}
                  className="rounded border-gray-400 dark:border-slate-600 bg-white dark:bg-[#1e1e1e] text-brand-500 focus:ring-brand-500 scale-90"
                />
                Remember this path for "{currentCategoryName}" category
              </legend>
              <input 
                type="text" 
                value={(filepath.substring(0, Math.max(filepath.lastIndexOf('\\'), filepath.lastIndexOf('/'))) || filepath) + (filepath.includes('\\') ? '\\' : '/')} 
                readOnly 
                className="w-full bg-transparent border-none text-[13px] text-black dark:text-slate-300 focus:outline-none px-1" 
              />
            </fieldset>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <label className="w-16 text-right text-[13px] text-black dark:text-slate-300">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-gray-400 dark:border-slate-600 rounded text-[13px] text-black dark:text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => handleAdd(true)}
            disabled={!url.trim() || adding}
            className="px-4 py-1.5 bg-[#e1e1e1] dark:bg-[#3a3a3a] hover:bg-[#d1d1d1] dark:hover:bg-[#4a4a4a] border border-gray-400 dark:border-slate-600 text-black dark:text-slate-200 text-[13px] rounded transition-colors disabled:opacity-50"
          >
            Download Later
          </button>
          <button
            onClick={() => handleAdd(false)}
            disabled={!url.trim() || adding}
            className="px-4 py-1.5 bg-[#e1e1e1] dark:bg-[#3a3a3a] hover:bg-[#d1d1d1] dark:hover:bg-[#4a4a4a] border border-gray-400 dark:border-slate-600 text-black dark:text-slate-200 text-[13px] rounded transition-colors disabled:opacity-50"
          >
            Start Download
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-[#e1e1e1] dark:bg-[#3a3a3a] hover:bg-[#d1d1d1] dark:hover:bg-[#4a4a4a] border border-gray-400 dark:border-slate-600 text-black dark:text-slate-200 text-[13px] rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-[150px] flex flex-col items-center justify-start border-l border-gray-400 dark:border-slate-700 pl-4 py-1">
        {getCategoryIcon(currentCategoryName)}
        
        <div className="text-[13px] font-medium text-black dark:text-slate-200 mt-2 mb-1">
          {fetchingSize ? 'Fetching size...' : formatSize(fileSize)}
        </div>
        
        <div className="w-full h-px bg-gray-300 dark:bg-slate-700 my-2"></div>
        
        <div className="w-full text-center space-y-1">
          <div className="text-[11px] text-gray-600 dark:text-slate-400">Est. Time (5MB/s)</div>
          <div className="text-[12px] text-brand-400 font-medium">
            {fetchingSize ? '--' : getEstTime(fileSize, 5)}
          </div>
        </div>
        
        <div className="w-full h-px bg-gray-300 dark:bg-slate-700 my-2"></div>
        
        <div className="w-full text-center space-y-1">
          <div className="text-[11px] text-gray-600 dark:text-slate-400">Time Saved ({connections}x)</div>
          <div className="text-[12px] text-green-400 font-medium">
            {fetchingSize || fileSize <= 0 ? '--' : getEstTime(fileSize * (1 - 1/connections), 5)}
          </div>
        </div>
      </div>
      
      </div>
      </div>
    </div>
  );
}
