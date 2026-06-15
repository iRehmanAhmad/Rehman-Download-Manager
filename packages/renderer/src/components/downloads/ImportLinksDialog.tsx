import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { formatFileSize, extractFilename } from '@rdm/shared';

interface ImportLink {
  id: string;
  url: string;
  filename: string;
  type: string;
  size: number;
  selected: boolean;
  loading: boolean;
  linkText: string;
}

export function ImportLinksDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [links, setLinks] = useState<ImportLink[]>([]);
  
  const [saveMode, setSaveMode] = useState<'category' | 'specific_category' | 'specific_directory'>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [adding, setAdding] = useState(false);

  const [hideHtml, setHideHtml] = useState(false);
  const [hideRepeated, setHideRepeated] = useState(false);

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
      const customEvent = e as CustomEvent<{ urls?: string[], prefilled?: ImportLink[] }>;
      const { urls, prefilled } = customEvent.detail;
      
      let newLinks: ImportLink[] = [];
      
      if (prefilled) {
        newLinks = prefilled;
        setLinks(newLinks);
        setShowDialog(true);
        // Pre-filled links from .ef2 already have filenames and sizes, we just need to get friendly types if missing, 
        // but to be fast we can just assume they are loaded.
      } else if (urls) {
        newLinks = urls.map((url, i) => {
          let filename = extractFilename(url) || `download-${i}`;
          return {
            id: i.toString(),
            url,
            filename,
            type: 'Unknown',
            size: -1,
            selected: true,
            loading: true,
            linkText: '',
          };
        });

        setLinks(newLinks);
        setShowDialog(true);
        
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
              if (info.contentType) {
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
          }, idx * 20);
        });
      }
    };

    window.addEventListener('open-import-links-dialog', handleOpen);
    return () => window.removeEventListener('open-import-links-dialog', handleOpen);
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
      const result = await window.api.system.selectSavePath({
        properties: ['openDirectory', 'createDirectory']
      });
      if (!result.canceled && result.filePaths.length > 0) {
        setSelectedDirectory(result.filePaths[0]);
        setSaveMode('specific_directory');
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  const getSavePathForLink = (link: ImportLink) => {
    if (saveMode === 'specific_directory' && selectedDirectory) {
      return selectedDirectory + '\\' + link.filename;
    }
    return settings.defaultSavePath ? settings.defaultSavePath + '\\' + link.filename : 'Downloads\\' + link.filename;
  };

  const visibleLinks = useMemo(() => {
    let result = links;
    if (hideHtml) {
      result = result.filter(l => !l.type.toLowerCase().includes('html') && l.type !== 'HTML Document');
    }
    if (hideRepeated) {
      const seen = new Set<string>();
      result = result.filter(l => {
        if (seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
      });
    }
    return result;
  }, [links, hideHtml, hideRepeated]);

  const handleAdd = async () => {
    const selectedLinks = visibleLinks.filter(l => l.selected);
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
      console.error('Failed to add import downloads:', err);
    } finally {
      setAdding(false);
    }
  };

  if (!showDialog) return null;

  const allSelected = visibleLinks.length > 0 && visibleLinks.every(l => l.selected);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110]" onMouseDown={handleClose}>
      <div
        className="bg-[#2b2d31] border border-[#1e1f22] rounded-md p-4 w-full max-w-[850px] shadow-2xl text-[#dbdee1] font-sans flex flex-col h-[600px] relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[16px] text-white flex items-center gap-2">
            <span className="w-5 h-5 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center text-black text-[10px] font-bold shadow shadow-blue-500/50">⬇</span>
            Import links to IDM
          </h2>
          <div className="flex gap-2">
            <button className="text-slate-400 hover:text-white leading-none">—</button>
            <button className="text-slate-400 hover:text-white leading-none">□</button>
            <button onClick={handleClose} className="text-slate-400 hover:text-red-400 leading-none">✕</button>
          </div>
        </div>

        <p className="text-[13px] text-[#b5bac1] leading-snug mb-4">
          Please check the links, which you want to add to the download list of IDM, and click OK button.<br/>
          You may wait until IDM checks and fills all file types.
        </p>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto border border-[#1e1f22] bg-[#313338] mb-4 relative rounded-sm">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="sticky top-0 bg-[#2b2d31] text-[#949ba4] border-b border-[#1e1f22] z-10">
              <tr>
                <th className="font-normal border-r border-[#1e1f22] p-1 w-8 text-center">
                  <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="accent-[#0078d7]" />
                </th>
                <th className="font-normal border-r border-[#1e1f22] p-1.5 min-w-[120px]">File Name</th>
                <th className="font-normal border-r border-[#1e1f22] p-1.5 w-[90px]">File Type</th>
                <th className="font-normal border-r border-[#1e1f22] p-1.5 w-[80px]">Size</th>
                <th className="font-normal border-r border-[#1e1f22] p-1.5 w-[200px]">Download from</th>
                <th className="font-normal border-r border-[#1e1f22] p-1.5 w-[150px]">Save to</th>
                <th className="font-normal p-1.5">Link Text</th>
              </tr>
            </thead>
            <tbody>
              {visibleLinks.map((link) => (
                <tr key={link.id} className="border-b border-[#1e1f22]/50 hover:bg-[#35373c]">
                  <td className="border-r border-[#1e1f22]/50 p-1 text-center">
                    <input 
                      type="checkbox" 
                      checked={link.selected} 
                      onChange={(e) => toggleLink(link.id, e.target.checked)} 
                      className="accent-[#0078d7]" 
                    />
                  </td>
                  <td className="border-r border-[#1e1f22]/50 p-1.5 flex items-center gap-1.5">
                    <span className="text-white">📄</span>
                    <span className="truncate" title={link.filename}>{link.filename}</span>
                  </td>
                  <td className="border-r border-[#1e1f22]/50 p-1.5 truncate" title={link.type}>
                    {link.loading ? <span className="animate-pulse">Checking...</span> : link.type}
                  </td>
                  <td className="border-r border-[#1e1f22]/50 p-1.5 truncate">
                    {link.size > 0 ? formatFileSize(link.size) : link.loading ? '' : 'Unknown'}
                  </td>
                  <td className="border-r border-[#1e1f22]/50 p-1.5 truncate text-[#00b0f4]" title={link.url}>
                    {link.url}
                  </td>
                  <td className="border-r border-[#1e1f22]/50 p-1.5 truncate" title={getSavePathForLink(link)}>
                    {getSavePathForLink(link)}
                  </td>
                  <td className="p-1.5 truncate">
                    {link.linkText}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Area */}
        <div className="flex gap-4 mb-2">
          {/* Save To Group */}
          <fieldset className="flex-1 border border-[#404249] rounded-sm p-3 pt-2 max-w-[400px]">
            <legend className="text-[12px] px-1 text-[#b5bac1]">Save To</legend>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[12px] cursor-pointer text-white">
                <input
                  type="radio"
                  name="importSaveMode"
                  checked={saveMode === 'category'}
                  onChange={() => setSaveMode('category')}
                  className="accent-[#0078d7]"
                />
                Every file to the directory according to the category of the file
              </label>
              
              <div className="flex items-center gap-2 pl-[22px]">
                <label className="flex items-center gap-2 text-[12px] cursor-pointer text-white w-36">
                  <input
                    type="radio"
                    name="importSaveMode"
                    checked={saveMode === 'specific_category'}
                    onChange={() => setSaveMode('specific_category')}
                    className="accent-[#0078d7] -ml-[22px]"
                  />
                  All files to one category
                </label>
                <select
                  disabled={saveMode !== 'specific_category'}
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="flex-1 bg-[#1e1f22] border border-[#1e1f22] text-[12px] p-1 text-white disabled:opacity-50 outline-none focus:border-[#0078d7]"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 pl-[22px]">
                <label className="flex items-center gap-2 text-[12px] cursor-pointer text-white">
                  <input
                    type="radio"
                    name="importSaveMode"
                    checked={saveMode === 'specific_directory'}
                    onChange={() => setSaveMode('specific_directory')}
                    className="accent-[#0078d7] -ml-[22px]"
                  />
                  All files to one directory
                </label>
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    disabled={saveMode !== 'specific_directory'}
                    value={selectedDirectory}
                    onChange={(e) => setSelectedDirectory(e.target.value)}
                    className="flex-1 bg-[#1e1f22] border border-[#1e1f22] text-[12px] p-1 px-2 text-[#949ba4] disabled:opacity-50 outline-none focus:border-[#0078d7]"
                  />
                  <button
                    disabled={saveMode !== 'specific_directory'}
                    onClick={handleBrowse}
                    className="px-3 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[12px] rounded-sm disabled:opacity-50 transition-colors"
                  >
                    Browse...
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Controls Group */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)} className="flex-1 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[12px] rounded-sm transition-colors border border-transparent hover:border-[#8e9297]">
                Check All
              </button>
              <button onClick={() => toggleAll(false)} className="flex-1 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[12px] rounded-sm transition-colors border border-transparent hover:border-[#8e9297]">
                Uncheck All
              </button>
              <button className="flex-1 py-1 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[12px] rounded-sm transition-colors border border-transparent hover:border-[#8e9297] opacity-50 cursor-not-allowed">
                Edit...
              </button>
            </div>
            
            <div className="space-y-3 pl-2 mt-4">
              <label className="flex items-center gap-2 text-[12px] text-[#dbdee1] cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hideHtml} 
                  onChange={(e) => setHideHtml(e.target.checked)} 
                  className="accent-[#0078d7] w-3 h-3" 
                />
                Hide HTML files
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[#dbdee1] cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={hideRepeated} 
                  onChange={(e) => setHideRepeated(e.target.checked)} 
                  className="accent-[#0078d7] w-3 h-3" 
                />
                Hide repeated files
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-auto">
              <button
                onClick={handleAdd}
                disabled={adding || visibleLinks.filter(l => l.selected).length === 0}
                className="w-24 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[12px] rounded-sm transition-colors disabled:opacity-50 border border-transparent hover:border-[#8e9297]"
              >
                OK
              </button>
              <button
                onClick={handleClose}
                className="w-24 py-1.5 bg-[#4e5058] hover:bg-[#6d6f78] text-white text-[12px] rounded-sm transition-colors border border-transparent hover:border-[#8e9297]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
