import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';

interface AddressExceptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddressExceptionsDialog({ open, onOpenChange }: AddressExceptionsDialogProps) {
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  const showDialog = settings.showAddressExceptionDialog !== 'false';
  
  const defaultAddresses = [
    'http://*.akamaihd.net/*.mp3',
    'http://*.akamaihd.net/*.zip',
    'http://*.appspot.com/*/audio/*.mp3',
    'http://*.appspot.com/*/Sounds/*',
    'http://*.ask.com/*toolbar/*config*.zip',
    'http://*.cloudfront.net/game/*/res/*.bin',
    'http://*.cloudfront.net/game/*/res/*.zip',
    'http://*.cox.com/*.gz',
    'http://*.download.windowsupdate.com/*',
    'http://*.farmville.com/*.gz',
    'http://*.farmville.com/*/sounds/*.mp3'
  ];

  const addresses = settings.noAutoDownloadAddresses 
    ? JSON.parse(settings.noAutoDownloadAddresses) 
    : defaultAddresses;

  const setAddresses = (val: string[]) => setValue('noAutoDownloadAddresses', JSON.stringify(val));

  const [adding, setAdding] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleAdd = () => {
    if (newAddress.trim()) {
      setAddresses([...addresses, newAddress.trim()]);
      setNewAddress('');
      setAdding(false);
    }
  };

  const handleDelete = () => {
    if (selectedIdx !== null) {
      const newList = [...addresses];
      newList.splice(selectedIdx, 1);
      setAddresses(newList);
      setSelectedIdx(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-[500px] translate-x-[-50%] translate-y-[-50%] bg-[#f0f0f0] shadow-lg border border-gray-400 p-0 text-black font-sans text-sm">
          
          <div className="flex items-center px-4 py-2 bg-white border-b border-gray-300 gap-2">
            <Dialog.Title className="text-sm font-normal">The list of address exceptions</Dialog.Title>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showDialog}
                onChange={(e) => setValue('showAddressExceptionDialog', String(e.target.checked))}
                className="mt-0.5 w-4 h-4 accent-blue-600 border border-gray-400 rounded-sm"
              />
              <span className="leading-tight">Show the dialog to add an address to the list of exceptions for a twice-cancelled download</span>
            </label>

            <div className="flex flex-col mt-2">
              <div className="mb-1">Don't start downloading automatically from the following addresses:</div>
              <div className="border border-gray-400 bg-white h-[200px] overflow-y-auto p-1 text-black">
                {addresses.map((address: string, idx: number) => (
                  <div 
                    key={idx} 
                    className={`py-0.5 px-1 cursor-pointer ${selectedIdx === idx ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    {address}
                  </div>
                ))}
                {adding && (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="text" 
                      value={newAddress} 
                      onChange={(e) => setNewAddress(e.target.value)} 
                      placeholder="http://*.example.com/*" 
                      className="border border-gray-400 px-1 py-0.5 rounded flex-1 outline-none text-black"
                      autoFocus
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter') handleAdd(); 
                        else if (e.key === 'Escape') setAdding(false); 
                      }}
                    />
                    <button onClick={handleAdd} className="text-xs px-2 bg-gray-200 border border-gray-400 rounded">OK</button>
                    <button onClick={() => setAdding(false)} className="text-xs px-2 bg-gray-200 border border-gray-400 rounded">X</button>
                  </div>
                )}
              </div>
              <div className="text-xs mt-1">You may use the asterisk wildcard for the address pattern.</div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => setAdding(true)} 
                  className="px-6 py-1 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors"
                >
                  Add
                </button>
                <button 
                  onClick={handleDelete} 
                  className={`px-6 py-1 border rounded transition-colors ${selectedIdx !== null ? 'bg-[#e1e1e1] border-gray-400 hover:bg-[#d1d1d1]' : 'bg-[#f0f0f0] border-gray-300 text-gray-400 cursor-not-allowed'}`}
                >
                  Delete
                </button>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="px-8 py-1.5 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
