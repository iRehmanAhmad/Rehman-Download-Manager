import { useState, useEffect, useCallback, useMemo } from 'react';
import { QueueSettings } from '@rdm/shared';
import { useDownloadStore } from '../stores/download-store';
import { NewQueueDialog } from '../components/scheduler/NewQueueDialog';
import { HelpDialog } from '../components/scheduler/HelpDialog';
import * as Dialog from '@radix-ui/react-dialog';
import { formatFileSize } from '@rdm/shared';

export function SchedulerPage() {
  const [queues, setQueues] = useState<QueueSettings[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'files'>('schedule');
  
  // Local state for the form
  const [formData, setFormData] = useState<Partial<QueueSettings> | null>(null);
  
  // Dialog state
  const [newQueueOpen, setNewQueueOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [unsavedTarget, setUnsavedTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  const originalData = useMemo(() => queues.find(q => q.id === selectedId), [queues, selectedId]);
  const isDirty = useMemo(() => {
    if (!formData || !originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  }, [formData, originalData]);

  // Downloads
  const downloadsMap = useDownloadStore(s => s.downloads);
  const [localQueueOrder, setLocalQueueOrder] = useState<string[]>([]);

  const queueDownloads = useMemo(() => {
    const dls = Array.from(downloadsMap.values()).filter(dl => 
      (dl.queueId || 'main') === selectedId
    );
    // Sort based on localQueueOrder if present
    if (localQueueOrder.length > 0) {
      dls.sort((a, b) => {
        const idxA = localQueueOrder.indexOf(a.id);
        const idxB = localQueueOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    return dls;
  }, [downloadsMap, selectedId, localQueueOrder]);

  useEffect(() => {
    // Keep local order synced when downloads change, but don't drop existing order
    const currentIds = Array.from(downloadsMap.values())
      .filter(dl => (dl.queueId || 'main') === selectedId)
      .map(dl => dl.id);
    setLocalQueueOrder(prev => {
      const validPrev = prev.filter(id => currentIds.includes(id));
      const newIds = currentIds.filter(id => !validPrev.includes(id));
      return [...validPrev, ...newIds];
    });
  }, [downloadsMap, selectedId]);

  const loadQueues = useCallback(async () => {
    try {
      const all = await window.api.queue.getAll();
      setQueues(all);
      if (!selectedId && all.length > 0) {
        setSelectedId(all[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedId]);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  useEffect(() => {
    const q = queues.find(q => q.id === selectedId);
    if (q) {
      setFormData(q);
    }
  }, [selectedId, queues]);

  const handleApply = async () => {
    if (!formData || !formData.id) return;
    try {
      await window.api.queue.update(formData as QueueSettings);
      await loadQueues();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleQueueClick = (id: string) => {
    if (id === selectedId) return;
    if (isDirty) {
      setUnsavedTarget(id);
    } else {
      setSelectedId(id);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setUnsavedTarget('#/');
    } else {
      window.location.hash = '#/';
    }
  };

  const handleDiscard = () => {
    if (originalData) setFormData(originalData);
    if (unsavedTarget === '#/') window.location.hash = '#/';
    else if (unsavedTarget) setSelectedId(unsavedTarget);
    setUnsavedTarget(null);
  };

  const handleApplyAndContinue = async () => {
    const success = await handleApply();
    if (success) {
      if (unsavedTarget === '#/') window.location.hash = '#/';
      else if (unsavedTarget) setSelectedId(unsavedTarget);
      setUnsavedTarget(null);
    }
  };

  const handleNewQueueClick = () => {
    setNewQueueOpen(true);
  };

  const handleCreateQueue = async (name: string) => {
    try {
      const q = await window.api.queue.create({
        name,
        scheduleType: 'one-time',
        startOnStartup: false,
        runDaily: false,
        daysOfWeek: [],
        retries: 10,
        hangUpModem: false,
        exitWhenDone: false,
        turnOffComputer: false,
        turnOffAction: 'shutdown',
        forceTerminate: false,
        limitEnabled: false,
        limitShowWarning: true
      });
      await loadQueues();
      setSelectedId(q.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQueue = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.queue.delete(deleteTarget);
      setSelectedId('main');
      await loadQueues();
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    }
  };

  const updateForm = (updates: Partial<QueueSettings>) => {
    setFormData(prev => prev ? { ...prev, ...updates } : null);
  };

  const renderQueueList = () => {
    return (
      <div className="w-64 border-r border-slate-300 dark:border-slate-700 flex flex-col bg-slate-100 dark:bg-white dark:bg-slate-900/50">
        <div className="p-3 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between font-medium text-slate-800 dark:text-slate-200">
          Queues
          <button onClick={handleNewQueueClick} className="px-2 py-0.5 bg-brand-600 hover:bg-brand-500 rounded text-xs text-white transition-colors">
            New
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-0.5">
          {queues.map(q => (
            <div 
              key={q.id}
              onClick={() => handleQueueClick(q.id)}
              className={`px-3 py-1.5 rounded cursor-pointer text-sm flex items-center gap-2 ${
                selectedId === q.id ? 'bg-brand-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-white/5'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              {q.name}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-300 dark:border-slate-700 flex flex-col gap-2">
          <div 
            onClick={() => handleQueueClick('limits')}
            className={`px-3 py-1.5 rounded cursor-pointer text-sm flex items-center gap-2 ${
              selectedId === 'limits' ? 'bg-brand-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-white/5'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
              <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Global limits
          </div>
          <button 
            onClick={() => setDeleteTarget(selectedId)}
            disabled={!selectedId || selectedId === 'main' || selectedId === 'sync' || selectedId === 'limits'}
            className="flex-1 px-3 py-1.5 bg-white dark:bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded text-xs text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  const renderScheduleTab = () => {
    if (!formData) return null;

    return (
      <div className="p-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
        {/* Top Type Toggles */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              checked={formData.scheduleType === 'one-time'} 
              onChange={() => updateForm({ scheduleType: 'one-time' })}
              className="accent-brand-500"
            />
            <span className={formData.scheduleType === 'one-time' ? 'text-white font-medium' : ''}>Run once / daily</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              checked={formData.scheduleType === 'periodic'} 
              onChange={() => updateForm({ scheduleType: 'periodic' })}
              className="accent-brand-500"
            />
            <span className={formData.scheduleType === 'periodic' ? 'text-white font-medium' : ''}>Repeat every</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-slate-200 dark:border-slate-300 dark:border-slate-700/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.startOnStartup} 
              onChange={(e) => updateForm({ startOnStartup: e.target.checked })}
              className="rounded accent-brand-500"
            />
            Start download on IDM startup
          </label>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-300 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!!formData.startAt} 
                onChange={(e) => updateForm({ startAt: e.target.checked ? '12:00' : undefined })}
                className="rounded accent-brand-500"
              />
              Start download at
            </label>
            <input 
              type="time" 
              value={formData.startAt || ''}
              onChange={(e) => updateForm({ startAt: e.target.value })}
              disabled={!formData.startAt}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 disabled:opacity-50"
            />
          </div>

          {formData.scheduleType === 'periodic' ? (
            <div className="flex items-center gap-2 pl-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!!formData.startEveryHours || !!formData.startEveryMinutes}
                  onChange={(e) => updateForm({ startEveryHours: e.target.checked ? 1 : undefined, startEveryMinutes: e.target.checked ? 0 : undefined })}
                  className="rounded accent-brand-500"
                />
                Start again every
              </label>
              <input 
                type="number" min="0" max="23"
                value={formData.startEveryHours || 0}
                onChange={(e) => updateForm({ startEveryHours: parseInt(e.target.value) || 0 })}
                disabled={!(!!formData.startEveryHours || !!formData.startEveryMinutes)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-16 text-center disabled:opacity-50 focus:outline-none focus:border-brand-500"
              />
              <span>hours</span>
              <input 
                type="number" min="0" max="59"
                value={formData.startEveryMinutes || 0}
                onChange={(e) => updateForm({ startEveryMinutes: parseInt(e.target.value) || 0 })}
                disabled={!(!!formData.startEveryHours || !!formData.startEveryMinutes)}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-16 text-center disabled:opacity-50 focus:outline-none focus:border-brand-500"
              />
              <span>minutes</span>
            </div>
          ) : (
            <div className="pl-4 space-y-1">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={!formData.runDaily} 
                    onChange={() => updateForm({ runDaily: false })}
                    className="accent-brand-500"
                  />
                  Once at
                </label>
                <input 
                  type="date" 
                  value={formData.runOnceAt || ''}
                  onChange={(e) => updateForm({ runOnceAt: e.target.value })}
                  disabled={formData.runDaily}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 disabled:opacity-50"
                />
              </div>
              <div className="flex items-start gap-2">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input 
                    type="radio" 
                    checked={formData.runDaily} 
                    onChange={() => updateForm({ runDaily: true })}
                    className="accent-brand-500"
                  />
                  Daily
                </label>
                <div className="grid grid-cols-4 gap-x-2 gap-y-1 flex-1">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 dark:text-slate-400">
                      <input 
                        type="checkbox"
                        checked={formData.daysOfWeek?.includes(idx)}
                        onChange={(e) => {
                          const days = formData.daysOfWeek || [];
                          if (e.target.checked) updateForm({ daysOfWeek: [...days, idx] });
                          else updateForm({ daysOfWeek: days.filter(d => d !== idx) });
                        }}
                        disabled={!formData.runDaily}
                        className="rounded accent-brand-500 disabled:opacity-50"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-300 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={!!formData.stopAt} 
                onChange={(e) => updateForm({ stopAt: e.target.checked ? '07:30' : undefined })}
                className="rounded accent-brand-500"
              />
              Stop download at
            </label>
            <input 
              type="time" 
              value={formData.stopAt || ''}
              onChange={(e) => updateForm({ stopAt: e.target.value })}
              disabled={!formData.stopAt}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={(formData.retries || 0) > 0} 
                onChange={(e) => updateForm({ retries: e.target.checked ? 10 : 0 })}
                className="rounded accent-brand-500"
              />
              Retries on failure:
            </label>
            <input 
              type="number" min="0" max="99"
              value={formData.retries}
              onChange={(e) => updateForm({ retries: parseInt(e.target.value) || 0 })}
              disabled={formData.retries === 0}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-16 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-300 dark:border-slate-700/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={!!formData.openFileWhenDone} 
              onChange={(e) => updateForm({ openFileWhenDone: e.target.checked ? 'C:\\' : undefined })}
              className="rounded accent-brand-500"
            />
            Open the following file when done:
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={formData.openFileWhenDone || ''}
              onChange={(e) => updateForm({ openFileWhenDone: e.target.value })}
              disabled={!formData.openFileWhenDone}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 disabled:opacity-50"
            />
            <button disabled={!formData.openFileWhenDone} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded disabled:opacity-50">...</button>
          </div>
          
          <div className="grid grid-cols-[1fr_1.5fr] gap-2 pt-0.5">
            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.hangUpModem} onChange={(e) => updateForm({ hangUpModem: e.target.checked })} className="rounded accent-brand-500" />
                Disconnect from internet
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.exitWhenDone} onChange={(e) => updateForm({ exitWhenDone: e.target.checked })} className="rounded accent-brand-500" />
                Exit app when done
              </label>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.turnOffComputer} onChange={(e) => updateForm({ turnOffComputer: e.target.checked })} className="rounded accent-brand-500" />
                  Turn off computer:
                </label>
                <select 
                  value={formData.turnOffAction} 
                  onChange={(e) => updateForm({ turnOffAction: e.target.value as any })}
                  disabled={!formData.turnOffComputer}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm disabled:opacity-50"
                >
                  <option value="shutdown">Shut down</option>
                  <option value="restart">Restart</option>
                  <option value="sleep">Sleep</option>
                  <option value="hibernate">Hibernate</option>
                </select>
              </div>
              <div className="pl-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.forceTerminate} onChange={(e) => updateForm({ forceTerminate: e.target.checked })} disabled={!formData.turnOffComputer} className="rounded accent-brand-500 disabled:opacity-50" />
                  <span className={!formData.turnOffComputer ? "opacity-50" : ""}>Force processes to terminate</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilesTab = () => {
    return (
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4 text-sm text-slate-700 dark:text-slate-300">
          <span>Download</span>
          <input 
            type="number" 
            min="1" max="32" 
            defaultValue="4" 
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-16 text-center focus:outline-none focus:border-brand-500" 
          />
          <span>files at the same time</span>
        </div>
        
        <div className="flex-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded overflow-hidden flex flex-col">
          <div className="grid grid-cols-[1fr_100px_100px_100px] gap-2 p-2 border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
            <div>File Name</div>
            <div>Size</div>
            <div>Status</div>
            <div>Time left</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {queueDownloads.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">Add downloads from the main list, then reorder them here.</div>
            ) : (
              queueDownloads.map((dl) => (
                <div key={dl.id} className="grid grid-cols-[1fr_100px_100px_100px] gap-2 p-2 border-b border-slate-200 dark:border-slate-800/50 hover:bg-white dark:bg-white/5 text-sm text-slate-700 dark:text-slate-300 items-center">
                  <div className="truncate" title={dl.filename}>{dl.filename}</div>
                  <div>{formatFileSize(dl.fileSize)}</div>
                  <div className="capitalize">{dl.status}</div>
                  <div>{dl.status === 'downloading' && dl.speed > 0 && dl.fileSize > 0 ? formatFileSize((dl.fileSize - dl.downloaded) / dl.speed) + 's' : '-'}</div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => {
              if (queueDownloads.length < 2) return;
              const ids = queueDownloads.map(d => d.id);
              // Move first selected item up (just visual for now if no selection, wait, we don't have row selection in this tab)
              // Wait, the UI doesn't have a selection state for rows in this tab. 
              // Without selection state, we can't really move anything specific. 
            }}
            className="px-2 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 flex items-center justify-center hidden" title="Move Up">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
          <button className="px-2 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300 flex items-center justify-center hidden" title="Move Down">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </button>
        </div>
      </div>
    );
  };

  const renderLimits = () => {
    return (
      <div className="p-4 space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
          <input type="checkbox" className="rounded accent-brand-500" />
          Download limits
        </label>
        <div className="pl-6 space-y-4">
          <div className="flex items-center gap-2">
            <span>Download no more than</span>
            <input type="number" defaultValue="200" className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-20 text-center" />
            <span>MBytes</span>
          </div>
          <div className="flex items-center gap-2 pl-12">
            <span>every</span>
            <input type="number" defaultValue="5" className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 w-16 text-center" />
            <span>hours</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-4">
            <input type="checkbox" defaultChecked className="rounded accent-brand-500" />
            Show warning before stopping downloads
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 flex overflow-hidden">
        {renderQueueList()}
        
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-white dark:bg-slate-900/30">
          {selectedId === 'limits' ? (
            renderLimits()
          ) : (
            <>
              <div className="p-4 flex items-center justify-center font-medium text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800">
                {formData?.name || 'Loading...'}
              </div>
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setActiveTab('schedule')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-brand-500 text-white' : 'border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                >
                  Schedule
                </button>
                <button 
                  onClick={() => setActiveTab('files')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'files' ? 'border-brand-500 text-white' : 'border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                >
                  Files in the queue
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'schedule' ? renderScheduleTab() : renderFilesTab()}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-white dark:bg-slate-900/50 flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={() => selectedId && window.api.queue.start(selectedId)} className="px-6 py-1.5 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-sm text-slate-800 dark:text-slate-200 transition-colors border border-slate-300 dark:border-white/10">Start now</button>
          <button onClick={() => selectedId && window.api.queue.stop(selectedId)} className="px-6 py-1.5 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-sm text-slate-800 dark:text-slate-200 transition-colors border border-slate-300 dark:border-white/10">Stop</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setHelpOpen(true)} className="px-6 py-1.5 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-sm text-slate-800 dark:text-slate-200 transition-colors border border-slate-300 dark:border-white/10">Help</button>
          <button onClick={handleApply} disabled={selectedId === 'limits'} className="px-6 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 disabled:cursor-not-allowed rounded text-sm text-white transition-colors">Apply</button>
          <button onClick={handleClose} className="px-6 py-1.5 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-sm text-slate-800 dark:text-slate-200 transition-colors border border-slate-300 dark:border-white/10">Close</button>
        </div>
      </div>
      <NewQueueDialog 
        open={newQueueOpen} 
        onOpenChange={setNewQueueOpen} 
        onSubmit={handleCreateQueue}
        existingQueueNames={queues.map(q => q.name)}
      />
      <HelpDialog 
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
      
      {/* Unsaved Changes Dialog */}
      <Dialog.Root open={!!unsavedTarget} onOpenChange={(open) => !open && setUnsavedTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[60] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg sm:rounded-lg text-slate-800 dark:text-slate-200">
            <Dialog.Title className="text-lg font-semibold text-white mb-2">Unsaved Changes</Dialog.Title>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6">You have unsaved changes to this queue. Would you like to apply them?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setUnsavedTarget(null)} className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded text-sm transition-colors">Cancel</button>
              <button onClick={handleDiscard} className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded text-sm text-red-400 transition-colors">Discard</button>
              <button onClick={handleApplyAndContinue} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded text-sm text-white transition-colors">Apply</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Queue Dialog */}
      <Dialog.Root open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-[60] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg sm:rounded-lg text-slate-800 dark:text-slate-200">
            <Dialog.Title className="text-lg font-semibold text-white mb-2">Delete Queue</Dialog.Title>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6">Are you sure you want to delete this queue? Any downloads currently assigned to it will be moved back to the main queue.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded text-sm transition-colors">Cancel</button>
              <button onClick={handleDeleteQueue} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm text-white transition-colors">Delete</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
