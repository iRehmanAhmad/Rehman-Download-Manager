import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import type { Category } from '@rdm/shared';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (category: Partial<Category>) => Promise<void>;
  title: string;
}

export function CategoryDialog({ open, onOpenChange, category, onSave, title }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [extensions, setExtensions] = useState('');
  const [sitesEnabled, setSitesEnabled] = useState(false);
  const [sites, setSites] = useState('');
  const [defaultDir, setDefaultDir] = useState('');
  const [saveLastFolder, setSaveLastFolder] = useState(false);

  // Sync state when opened
  useEffect(() => {
    if (open) {
      setName(category?.name || '');
      setExtensions(category?.extensions || '');
      setSitesEnabled(!!category?.sitesEnabled);
      setSites(category?.sites || '');
      setDefaultDir(category?.defaultDir || 'C:\\Users\\Default\\Downloads\\');
      setSaveLastFolder(!!category?.saveLastFolder);
    }
  }, [open, category]);

  const handleBrowse = async () => {
    const dirs = await window.api.system.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: defaultDir,
    });
    if (dirs && dirs.length > 0) {
      setDefaultDir(dirs[0]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return; // Name is required
    await onSave({
      ...(category ? { id: category.id } : {}),
      name: name.trim(),
      extensions: extensions.trim(),
      sitesEnabled,
      sites: sites.trim(),
      defaultDir: defaultDir.trim(),
      saveLastFolder,
    });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-[500px] translate-x-[-50%] translate-y-[-50%] bg-[#f0f0f0] shadow-lg border border-gray-400 p-0 text-black font-sans text-sm">
          
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-300 gap-2">
            <Dialog.Title className="text-sm font-normal">{title}</Dialog.Title>
            <Dialog.Close className="text-gray-500 hover:text-black">
              <span className="text-lg leading-none">&times;</span>
            </Dialog.Close>
          </div>

          <div className="p-4 flex flex-col gap-3">
            
            {/* Category Name */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col flex-1 mr-4">
                <label className="mb-1">Category name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-400 p-1 bg-white outline-none"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2 pt-5">
                <button 
                  onClick={handleSave}
                  className="px-6 py-1 bg-white border border-blue-500 rounded hover:bg-blue-50 w-24 border-2"
                >
                  OK
                </button>
                <Dialog.Close asChild>
                  <button className="px-6 py-1 bg-[#f0f0f0] border border-gray-400 rounded hover:bg-[#e0e0e0] w-24">
                    Cancel
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* File Types */}
            <div className="flex flex-col -mt-2">
              <label className="mb-1">Automatically put in this category the following file types:</label>
              <input 
                type="text" 
                value={extensions}
                onChange={(e) => setExtensions(e.target.value)}
                className="border border-gray-400 p-1 bg-white outline-none w-[340px]"
              />
              <div className="text-xs mt-1 text-gray-700">
                Note: type file extensions separated by space (e.g. avi mpg mpeg)
              </div>
            </div>

            <div className="border-b border-gray-300 my-1"></div>

            {/* Sites */}
            <div className="flex flex-col">
              <label className="flex items-center gap-2 cursor-pointer mb-1">
                <input 
                  type="checkbox" 
                  checked={sitesEnabled}
                  onChange={(e) => setSitesEnabled(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
                />
                <span>Automatically put in this category the files from the following sites only:</span>
              </label>
              <input 
                type="text" 
                value={sites}
                onChange={(e) => setSites(e.target.value)}
                disabled={!sitesEnabled}
                className={`border p-1 w-full outline-none ${sitesEnabled ? 'border-gray-400 bg-white' : 'border-gray-200 bg-[#f0f0f0] text-gray-400'}`}
              />
              <div className={`text-xs mt-1 ${sitesEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
                Separate sites by spaces. You may use asterisk as a wildcard pattern
              </div>
            </div>

            <div className="border-b border-gray-300 my-1"></div>

            {/* Save Directory */}
            <div className="flex flex-col">
              <label className="mb-1 text-blue-700">Save future downloads of this category to the following folder:</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={defaultDir}
                  onChange={(e) => setDefaultDir(e.target.value)}
                  className="border border-gray-400 p-1 bg-white flex-1 outline-none"
                />
              </div>
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={saveLastFolder}
                    onChange={(e) => setSaveLastFolder(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
                  />
                  <span>Remember last save path</span>
                </label>
                <button 
                  onClick={handleBrowse}
                  className="px-6 py-1 bg-white border border-gray-400 rounded hover:bg-[#e0e0e0] w-24"
                >
                  Browse...
                </button>
              </div>
            </div>

          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
