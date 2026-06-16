import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { formatFileSize, extractFilename } from '@rdm/shared';
import { FolderOpen, X, Download, Folder, HardDrive, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface BatchLink {
  id: string;
  url: string;
  filename: string;
  type: string;
  size: number;
  selected: boolean;
  loading: boolean;
}

export function BatchDownloadListDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [links, setLinks] = useState<BatchLink[]>([]);
  const [pattern, setPattern] = useState('');
  
  const [saveMode, setSaveMode] = useState<'category' | 'specific_category' | 'specific_directory'>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [adding, setAdding] = useState(false);

  const categories = useSettingsStore((s) => s.categories);
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    const defaultCat = categories.find((c) => c.name === 'General') || categories[0];
    if (defaultCat && !selectedCategoryId) {
      setSelectedCategoryId(defaultCat.id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ urls: string[], pattern: string }>;
      const { urls, pattern: initialPattern } = customEvent.detail;
      
      const newLinks = urls.map((url, i) => {
        let filename = extractFilename(url) || `download-${i}`;
        if (initialPattern) {
          filename = initialPattern.includes('*') 
            ? initialPattern.replace('*', (i + 1).toString())
            : `${i + 1}_${initialPattern}`;
        }
        return {
          id: i.toString(),
          url,
          filename,
          type: 'Unknown',
          size: -1,
          selected: true,
          loading: true,
        };
      });

      setLinks(newLinks);
      setPattern(initialPattern || '*.*');
      setShowDialog(true);
      
      // Start background fetching
      newLinks.forEach((link, idx) => {
        setTimeout(async () => {
          try {
            let info;
            if (typeof window.api.download.getFileInfoBasic === 'function') {
              info = await window.api.download.getFileInfoBasic(link.url);
            } else {
              info = await window.api.download.getFileInfo(link.url);
            }
            
            let friendlyType = 'Unknown File';
            if ('contentType' in info && info.contentType) {
              const mime = info.contentType.toLowerCase();
              if (mime.includes('image/jpeg')) friendlyType = 'JPG File';
              else if (mime.includes('image/png')) friendlyType = 'PNG File';
              else if (mime.includes('image/gif')) friendlyType = 'GIF File';
              else if (mime.includes('image/webp')) friendlyType = 'WEBP File';
              else if (mime.includes('video/mp4')) friendlyType = 'MP4 File';
              else if (mime.includes('video/webm')) friendlyType = 'WEBM File';
              else if (mime.includes('video/x-matroska')) friendlyType = 'MKV File';
              else if (mime.includes('application/pdf')) friendlyType = 'PDF Document';
              else if (mime.includes('application/zip')) friendlyType = 'ZIP Archive';
              else if (mime.includes('application/x-rar')) friendlyType = 'RAR Archive';
              else if (mime.includes('text/html')) friendlyType = 'HTML Document';
              else if (mime.includes('application/octet-stream')) friendlyType = 'Binary File';
              else friendlyType = mime.split(';')[0];
            }

            setLinks(prev => prev.map(l => 
              l.id === link.id 
                ? { ...l, size: info.fileSize, type: friendlyType, loading: false }
                : l
            ));
          } catch (err) {
            setLinks(prev => prev.map(l => 
              l.id === link.id ? { ...l, loading: false, type: 'Error' } : l
            ));
          }
        }, idx * 20); // 20ms stagger
      });
    };

    window.addEventListener('open-batch-download-list-dialog', handleOpen);
    return () => window.removeEventListener('open-batch-download-list-dialog', handleOpen);
  }, []);

  const handleClose = useCallback(() => {
    if (!adding) {
      setShowDialog(false);
      setLinks([]);
    }
  }, [adding]);

  const toggleAll = (checked: boolean) => {
    setLinks(links.map(l => ({ ...l, selected: checked })));
  };

  const toggleLink = (id: string, checked: boolean) => {
    setLinks(links.map(l => l.id === id ? { ...l, selected: checked } : l));
  };

  const handleBrowse = async () => {
    try {
      const result = await window.api.system.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
      });
      if (result && result.length > 0) {
        setSelectedDirectory(result[0]);
        setSaveMode('specific_directory');
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const handlePatternChange = (newPattern: string) => {
    setPattern(newPattern);
    
    setLinks(prev => prev.map((l, i) => {
      const idxStr = (i + 1).toString();
      const newFilename = newPattern.includes('*') 
        ? newPattern.replace('*', idxStr)
        : `${idxStr}_${newPattern}`;
      return { ...l, filename: newFilename };
    }));
  };

  const getSavePathForLink = (link: BatchLink) => {
    if (saveMode === 'specific_directory' && selectedDirectory) {
      return selectedDirectory + '\\' + link.filename;
    }
    return settings.defaultSavePath ? settings.defaultSavePath + '\\' + link.filename : 'Downloads\\' + link.filename;
  };

  const handleAdd = async () => {
    const selectedLinks = links.filter(l => l.selected);
    if (selectedLinks.length === 0) return;
    setAdding(true);
    
    try {
      for (const link of selectedLinks) {
        let targetCatId = undefined;
        let targetFilePath = undefined;

        if (saveMode === 'specific_category') {
          targetCatId = selectedCategoryId;
        } else if (saveMode === 'specific_directory') {
          targetFilePath = selectedDirectory;
        }
        
        await window.api.download.add({
          url: link.url,
          filename: link.filename,
          categoryId: targetCatId,
          filepath: targetFilePath,
        });
      }
      
      handleClose();
    } catch (err) {
      console.error('Failed to add batch downloads:', err);
    } finally {
      setAdding(false);
    }
  };

  if (!showDialog) return null;

  const selectedCount = links.filter(l => l.selected).length;
  const loadedCount = links.filter(l => !l.loading).length;
  const allSelected = links.length > 0 && selectedCount === links.length;
  
  // Validation
  let saveModeError = false;
  if (saveMode === 'specific_category' && !selectedCategoryId) saveModeError = true;
  if (saveMode === 'specific_directory' && !selectedDirectory) saveModeError = true;

  const canAdd = selectedCount > 0 && !saveModeError && !adding;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110]" onMouseDown={handleClose}>
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 w-full max-w-4xl shadow-2xl text-slate-800 dark:text-slate-200 font-sans flex flex-col h-[70vh] min-h-[500px] relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle2 size={14} />
              </span>
              Review Generated Links
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Step 2 of 2: Review the {links.length} generated links, then confirm to add them to your queue.
            </p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Progress and Selection Summary */}
        <div className="flex items-center justify-between mb-3 text-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="accent-brand-600 w-4 h-4 rounded" />
              {selectedCount} of {links.length} selected
            </label>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            {loadedCount < links.length ? (
              <><Loader2 size={14} className="animate-spin" /> Checking files: {loadedCount} / {links.length}</>
            ) : (
              <><CheckCircle2 size={14} className="text-green-500" /> All {links.length} files checked</>
            )}
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mb-4 rounded-lg shadow-inner">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 z-10 text-xs uppercase tracking-wider font-semibold shadow-sm">
              <tr>
                <th className="p-3 w-10 text-center border-r border-slate-200 dark:border-slate-700"></th>
                <th className="p-3 min-w-[200px] border-r border-slate-200 dark:border-slate-700">File Name</th>
                <th className="p-3 w-[120px] border-r border-slate-200 dark:border-slate-700">Type</th>
                <th className="p-3 w-[100px] border-r border-slate-200 dark:border-slate-700">Size</th>
                <th className="p-3 min-w-[200px] border-r border-slate-200 dark:border-slate-700">Source URL</th>
                <th className="p-3 min-w-[150px]">Save Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-white dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-2 text-center border-r border-slate-200 dark:border-slate-700/50">
                    <input 
                      type="checkbox" 
                      checked={link.selected} 
                      onChange={(e) => toggleLink(link.id, e.target.checked)} 
                      className="accent-brand-600 w-4 h-4 rounded" 
                    />
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-700/50 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                    <Download size={14} className="text-slate-400" />
                    <span className="truncate max-w-[250px]" title={link.filename}>{link.filename}</span>
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">
                    {link.loading ? <span className="flex items-center gap-1 opacity-70"><Loader2 size={12} className="animate-spin" /> Checking...</span> : 
                     link.type === 'Error' ? <span className="flex items-center gap-1 text-red-500"><AlertCircle size={12} /> Error</span> : link.type}
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400">
                    {link.size > 0 ? formatFileSize(link.size) : link.loading ? '' : '-'}
                  </td>
                  <td className="p-2 border-r border-slate-200 dark:border-slate-700/50 text-brand-600 dark:text-brand-400 font-mono text-xs">
                    <div className="truncate max-w-[250px]" title={link.url}>{link.url}</div>
                  </td>
                  <td className="p-2 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    <div className="truncate max-w-[200px]" title={getSavePathForLink(link)}>{getSavePathForLink(link)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Configuration Area */}
        <div className="flex gap-6 flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          
          {/* Save Target */}
          <div className="flex-1 space-y-3">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
              <HardDrive size={16} className="text-slate-400" /> Save Location
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300">
                <input type="radio" name="saveMode" checked={saveMode === 'category'} onChange={() => setSaveMode('category')} className="accent-brand-600" />
                <Folder size={14} className="text-slate-400" /> By Category (Auto-detect)
              </label>
              
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[160px]">
                  <input type="radio" name="saveMode" checked={saveMode === 'specific_category'} onChange={() => setSaveMode('specific_category')} className="accent-brand-600" />
                  <Folder size={14} className="text-slate-400" /> Single Category
                </label>
                <select
                  disabled={saveMode !== 'specific_category'}
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-sm py-1.5 px-2 rounded-md disabled:opacity-50 outline-none focus:border-brand-500 transition-colors"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[160px]">
                  <input type="radio" name="saveMode" checked={saveMode === 'specific_directory'} onChange={() => setSaveMode('specific_directory')} className="accent-brand-600" />
                  <FolderOpen size={14} className="text-slate-400" /> Custom Directory
                </label>
                <div className="flex flex-1 gap-2">
                  <input
                    type="text"
                    disabled={saveMode !== 'specific_directory'}
                    value={selectedDirectory}
                    onChange={(e) => setSelectedDirectory(e.target.value)}
                    placeholder="Select a folder..."
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-sm py-1.5 px-2 rounded-md disabled:opacity-50 outline-none focus:border-brand-500 transition-colors"
                  />
                  <button
                    disabled={saveMode !== 'specific_directory'}
                    onClick={handleBrowse}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm rounded-md disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Browse
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Rewrite */}
          <div className="w-[300px] space-y-3 flex flex-col">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
              <Download size={16} className="text-slate-400" /> Filename Pattern
            </h3>
            <div>
              <input
                type="text"
                value={pattern}
                onChange={(e) => handlePatternChange(e.target.value)}
                placeholder="e.g. image_*.jpg"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-sm py-1.5 px-3 rounded-md outline-none focus:border-brand-500 transition-colors mb-2"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Use <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-slate-700 dark:text-slate-300 font-mono">*</code> as a wildcard for the index. <br/>
                Example output: <span className="font-mono text-brand-600 dark:text-brand-400 font-medium">{links[0]?.filename || 'N/A'}</span>
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="text-sm text-red-500 font-medium flex items-center gap-1.5">
            {selectedCount === 0 && <><AlertCircle size={14} /> Select at least one link to continue.</>}
            {saveModeError && selectedCount > 0 && <><AlertCircle size={14} /> Please configure the target save location.</>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="px-6 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {adding ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : 'Confirm & Add Links'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
