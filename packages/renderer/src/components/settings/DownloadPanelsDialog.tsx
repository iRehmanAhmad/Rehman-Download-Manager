import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { Check } from 'lucide-react';

interface DownloadPanelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DownloadPanelsDialog({ open, onOpenChange }: DownloadPanelsDialogProps) {
  const [activeTab, setActiveTab] = useState<'web-players' | 'selected-files'>('web-players');
  const settings = useSettingsStore((s) => s.settings);
  const setValue = useSettingsStore((s) => s.setValue);

  // Initialize defaults
  const panelMode = settings.panelMode || 'full'; // 'full' or 'mini'
  const dontCaptureWebPlayers = settings.dontCaptureWebPlayers === 'true';
  const showPanelProtected = settings.showPanelProtected === 'true';

  const defaultExtensions = [
    { type: 'FLV', size: '' },
    { type: 'MP3', size: '50.00 KB' },
    { type: 'MP4', size: '' },
    { type: 'M4A', size: '' },
    { type: 'MPG', size: '' },
    { type: 'MPEG', size: '' },
    { type: 'AVI', size: '' },
    { type: 'WMV', size: '' }
  ];
  const capturedExtensions = settings.capturedExtensions ? JSON.parse(settings.capturedExtensions) : defaultExtensions;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setCapturedExtensions = (val: any) => setValue('capturedExtensions', JSON.stringify(val));

  const linkPanelMode = settings.linkPanelMode || 'any'; // 'any', 'none', 'specific'
  const defaultSites = [
    'rapidshare.com', 'megaupload.com', 'depositfiles.com', 'filefactory.com',
    'mediafire.com', 'sendspace.com', 'uploading.com', 'uploaded.to'
  ];
  const specificSites = settings.specificSites ? JSON.parse(settings.specificSites) : defaultSites;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-[600px] translate-x-[-50%] translate-y-[-50%] bg-[#f0f0f0] shadow-lg border border-gray-400 p-0 text-black font-sans text-sm h-[580px]">
          
          <div className="flex items-center px-4 py-2 bg-white border-b border-gray-300 gap-2">
            <img src="/icons/icon.png" alt="" className="w-4 h-4 object-contain opacity-70" />
            <Dialog.Title className="text-sm font-normal">Customize IDM Download panels in browsers</Dialog.Title>
          </div>

          <div className="flex px-4 pt-4 border-b border-gray-300">
            <button
              onClick={() => setActiveTab('web-players')}
              className={`px-4 py-1.5 border border-b-0 rounded-t ${
                activeTab === 'web-players' ? 'bg-white border-gray-300 pb-[7px] mb-[-1px] z-10' : 'bg-[#e0e0e0] border-gray-300 text-gray-600'
              }`}
            >
              For web-players
            </button>
            <button
              onClick={() => setActiveTab('selected-files')}
              className={`px-4 py-1.5 border border-b-0 rounded-t ml-1 ${
                activeTab === 'selected-files' ? 'bg-white border-gray-300 pb-[7px] mb-[-1px] z-10' : 'bg-[#e0e0e0] border-gray-300 text-gray-600'
              }`}
            >
              For selected files
            </button>
          </div>

          <div className="flex-1 bg-white border-t-0 p-4 overflow-hidden flex flex-col">
            {activeTab === 'web-players' && (
              <div className="flex flex-col h-full gap-4">
                <p>IDM can show its Download panel on a web-player in a browser when IDM detects a multimedia request from the web-player</p>
                <hr className="border-gray-300" />
                
                <div>
                  <div className="mb-2">Panel view:</div>
                  <div className="flex items-center gap-10 ml-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="panelMode" 
                        value="full" 
                        checked={panelMode === 'full'} 
                        onChange={() => setValue('panelMode', 'full')}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span>Full mode</span>
                    </label>
                    
                    {/* Fake Full Mode Button */}
                    <div className="flex items-center gap-2 ml-10">
                      <div className="flex items-center bg-gradient-to-b from-[#e1e9f4] to-[#b7cce4] border border-[#7a9bbd] rounded px-2 py-1 shadow-sm opacity-90">
                        <span className="text-green-600 mr-1 text-[10px]">▶</span>
                        <span className="text-blue-800 font-semibold text-xs">Download this video</span>
                        <div className="ml-2 pl-2 border-l border-[#8baacd] flex gap-1">
                          <span className="w-4 h-4 flex items-center justify-center bg-gray-200 border border-gray-400 rounded-sm text-[10px]">?</span>
                          <span className="w-4 h-4 flex items-center justify-center bg-gray-200 border border-gray-400 rounded-sm text-[10px]">X</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-10 ml-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="panelMode" 
                        value="mini" 
                        checked={panelMode === 'mini'} 
                        onChange={() => setValue('panelMode', 'mini')}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span>Mini mode</span>
                    </label>
                    
                    {/* Fake Mini Mode Button */}
                    <div className="flex items-center gap-2 ml-[225px]">
                      <div className="flex items-center bg-gradient-to-b from-[#e1e9f4] to-[#b7cce4] border border-[#7a9bbd] rounded px-1 py-0.5 shadow-sm opacity-90">
                        <span className="text-green-600 text-[10px]">▶</span>
                        <div className="ml-1 pl-1 border-l border-[#8baacd]">
                          <span className="w-3.5 h-3.5 flex items-center justify-center bg-gray-200 border border-gray-400 rounded-sm text-[8px]">X</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col flex-1">
                  <div className="mb-2">Show IDM download panel for the following file types:</div>
                  <div className="flex gap-4 h-[160px]">
                    <div className="flex-1 border border-gray-400 bg-white overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f0f0f0] border-b border-gray-300">
                          <tr>
                            <th className="font-normal px-2 py-1 w-2/5 border-r border-gray-300">File Type</th>
                            <th className="font-normal px-2 py-1">Minimum size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {capturedExtensions.map((ext: any, idx: number) => (
                            <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-blue-50'}>
                              <td className="px-2 py-1 border-r border-gray-300 flex items-center gap-2">
                                <div className="w-4 h-4 border border-blue-500 bg-blue-500 rounded-sm flex items-center justify-center">
                                  <Check size={12} className="text-white" strokeWidth={3} />
                                </div>
                                {ext.type}
                              </td>
                              <td className="px-2 py-1">{ext.size}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-col gap-2 w-32">
                      <button className="px-4 py-1 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors">Add</button>
                      <button className="px-4 py-1 bg-[#f0f0f0] border border-gray-300 text-gray-400 rounded cursor-not-allowed">Minimum size</button>
                      <button className="px-4 py-1 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors mt-2">Check All</button>
                      <button className="px-4 py-1 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors">Clear All</button>
                      <button className="px-4 py-1 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors mt-2">Exceptions</button>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-600 mt-2">
                  Note: If you uncheck a file type on the list above and if the file type is in the list on "Options-&gt;File Types" tab, downloads of this file type are captured by IDM automatically and won't be played in the web-player. If you want to prevent it, check the box below:
                </div>
                
                <hr className="border-gray-300 my-1" />

                <div className="flex flex-col gap-2 pl-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={dontCaptureWebPlayers}
                      onChange={(e) => setValue('dontCaptureWebPlayers', String(e.target.checked))}
                      className="w-4 h-4 border border-gray-400 rounded-sm"
                    />
                    <span>Don't capture downloads from web-players automatically</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showPanelProtected}
                      onChange={(e) => setValue('showPanelProtected', String(e.target.checked))}
                      className="w-4 h-4 border border-gray-400 rounded-sm"
                    />
                    <span className="leading-tight">Show download panel for protected content<br/>which IDM may not download</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'selected-files' && (
              <div className="flex flex-col h-full gap-4">
                <p>IDM can show Download panel on a web-page when you select a text that contains download links.</p>
                <hr className="border-gray-300" />
                
                <div>
                  <div className="mb-2">Panel view:</div>
                  <div className="flex items-center gap-10 ml-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="panelMode2" 
                        value="full" 
                        checked={panelMode === 'full'} 
                        onChange={() => setValue('panelMode', 'full')}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span>Full mode</span>
                    </label>
                    <div className="flex items-center gap-2 ml-10">
                      <div className="flex items-center bg-gradient-to-b from-[#e1e9f4] to-[#b7cce4] border border-[#7a9bbd] rounded px-2 py-1 shadow-sm opacity-90">
                        <span className="text-green-600 mr-1 text-[10px]">▶</span>
                        <span className="text-blue-800 font-semibold text-xs">Download with IDM</span>
                        <div className="ml-2 pl-2 border-l border-[#8baacd] flex gap-1">
                          <span className="w-4 h-4 flex items-center justify-center bg-gray-200 border border-gray-400 rounded-sm text-[10px]">?</span>
                          <span className="w-4 h-4 flex items-center justify-center bg-gray-200 border border-gray-400 rounded-sm text-[10px]">X</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-10 ml-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="panelMode2" 
                        value="mini" 
                        checked={panelMode === 'mini'} 
                        onChange={() => setValue('panelMode', 'mini')}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span>Mini mode</span>
                    </label>
                    <div className="flex items-center gap-2 ml-[225px]">
                      <div className="flex items-center bg-gradient-to-b from-[#e1e9f4] to-[#b7cce4] border border-[#7a9bbd] rounded px-1 py-0.5 shadow-sm opacity-90">
                        <span className="text-green-600 text-[10px]">▶</span>
                        <div className="ml-1 pl-1 border-l border-[#8baacd]">
                          <span className="w-3.5 h-3.5 flex items-center justify-center bg-gray-200 border border-gray-400 rounded-sm text-[8px]">X</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="linkPanelMode" 
                      value="any" 
                      checked={linkPanelMode === 'any'} 
                      onChange={() => setValue('linkPanelMode', 'any')}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span>Show Download panel for any selected links</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="linkPanelMode" 
                      value="none" 
                      checked={linkPanelMode === 'none'} 
                      onChange={() => setValue('linkPanelMode', 'none')}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span>Don't show Download panel for selected links</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="linkPanelMode" 
                      value="specific" 
                      checked={linkPanelMode === 'specific'} 
                      onChange={() => setValue('linkPanelMode', 'specific')}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span>Show Download panel for selected links for the following sites only:</span>
                  </label>
                </div>

                <div className="flex gap-4 h-[160px] pl-6 mt-2">
                  <div className="flex-1 border border-gray-400 bg-white overflow-y-auto p-2">
                    {specificSites.map((site: string, idx: number) => (
                      <div key={idx} className="py-0.5">{site}</div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 w-32">
                    <button className="px-4 py-1 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors">Add</button>
                    <button className="px-4 py-1 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors">Delete</button>
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 bg-[#f0f0f0] border-t border-gray-300">
            <button
              onClick={() => onOpenChange(false)}
              className="px-8 py-1.5 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors min-w-[80px]"
            >
              OK
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="px-8 py-1.5 bg-[#e1e1e1] border border-gray-400 rounded hover:bg-[#d1d1d1] transition-colors min-w-[80px]"
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
