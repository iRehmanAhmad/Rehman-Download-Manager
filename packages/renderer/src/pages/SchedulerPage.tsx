import { useState, useEffect, useCallback, useMemo } from 'react';
import { QueueSettings } from '@rdm/shared';
import { useDownloadStore } from '../stores/download-store';

export function SchedulerPage() {
  const [queues, setQueues] = useState<QueueSettings[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'files'>('schedule');
  
  // Local state for the form
  const [formData, setFormData] = useState<Partial<QueueSettings> | null>(null);

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleNewQueue = async () => {
    const name = prompt('Enter new queue name:');
    if (!name) return;
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
    if (!selectedId || selectedId === 'main' || selectedId === 'sync') return;
    if (confirm('Are you sure you want to delete this queue?')) {
      try {
        await window.api.queue.delete(selectedId);
        setSelectedId('main');
        await loadQueues();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const updateForm = (updates: Partial<QueueSettings>) => {
    setFormData(prev => prev ? { ...prev, ...updates } : null);
  };

  const renderQueueList = () => {
    return (
      <div className="w-64 border-r border-slate-700 flex flex-col bg-slate-900/50">
        <div className="p-3 border-b border-slate-700 flex items-center justify-center font-medium text-slate-200">
          Queues
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-0.5">
          {queues.map(q => (
            <div 
              key={q.id}
              onClick={() => setSelectedId(q.id)}
              className={`px-3 py-1.5 rounded cursor-pointer text-sm flex items-center gap-2 ${
                selectedId === q.id ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              {q.name}
            </div>
          ))}
          <div 
            onClick={() => setSelectedId('limits')}
            className={`px-3 py-1.5 rounded cursor-pointer text-sm flex items-center gap-2 ${
              selectedId === 'limits' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
              <circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Download limits
          </div>
        </div>
        <div className="p-3 border-t border-slate-700 flex gap-2">
          <button onClick={handleNewQueue} className="flex-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-slate-200 transition-colors">
            New queue
          </button>
          <button 
            onClick={handleDeleteQueue}
            disabled={!selectedId || selectedId === 'main' || selectedId === 'sync' || selectedId === 'limits'}
            className="flex-1 px-3 py-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded text-xs text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="p-6 space-y-6 text-sm text-slate-300">
        {/* Top Type Toggles */}
        <div className="flex gap-8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              checked={formData.scheduleType === 'one-time'} 
              onChange={() => updateForm({ scheduleType: 'one-time' })}
              className="accent-brand-500"
            />
            <span className={formData.scheduleType === 'one-time' ? 'text-white font-medium' : ''}>One-time downloading</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              checked={formData.scheduleType === 'periodic'} 
              onChange={() => updateForm({ scheduleType: 'periodic' })}
              className="accent-brand-500"
            />
            <span className={formData.scheduleType === 'periodic' ? 'text-white font-medium' : ''}>Periodic synchronization</span>
          </label>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-700/50">
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

        <div className="space-y-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-4">
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
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 disabled:opacity-50"
            />
          </div>

          {formData.scheduleType === 'periodic' ? (
            <div className="flex items-center gap-4 pl-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={!!formData.startEveryHours || !!formData.startEveryMinutes}
                  onChange={(e) => updateForm({ startEveryHours: e.target.checked ? 1 : undefined })}
                  className="rounded accent-brand-500"
                />
                Start again every
              </label>
              <input 
                type="number" min="0" max="23"
                value={formData.startEveryHours || ''}
                onChange={(e) => updateForm({ startEveryHours: parseInt(e.target.value) || 0 })}
                disabled={!(!!formData.startEveryHours || !!formData.startEveryMinutes)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-16 disabled:opacity-50"
              />
              <span>hours</span>
            </div>
          ) : (
            <div className="pl-6 space-y-3">
              <div className="flex items-center gap-4">
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
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 disabled:opacity-50"
                />
              </div>
              <div className="flex items-start gap-4">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input 
                    type="radio" 
                    checked={formData.runDaily} 
                    onChange={() => updateForm({ runDaily: true })}
                    className="accent-brand-500"
                  />
                  Daily
                </label>
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                    <label key={day} className="flex items-center gap-2 cursor-pointer text-slate-400">
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

        <div className="space-y-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-4">
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
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 disabled:opacity-50"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.retries > 0} 
                onChange={(e) => updateForm({ retries: e.target.checked ? 10 : 0 })}
                className="rounded accent-brand-500"
              />
              Number of retries for each file if downloading failed:
            </label>
            <input 
              type="number" min="0" max="99"
              value={formData.retries}
              onChange={(e) => updateForm({ retries: parseInt(e.target.value) || 0 })}
              disabled={formData.retries === 0}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-16 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-700/50">
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
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 disabled:opacity-50"
            />
            <button disabled={!formData.openFileWhenDone} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded disabled:opacity-50">...</button>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.hangUpModem} onChange={(e) => updateForm({ hangUpModem: e.target.checked })} className="rounded accent-brand-500" />
            Hang up modem when done
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.exitWhenDone} onChange={(e) => updateForm({ exitWhenDone: e.target.checked })} className="rounded accent-brand-500" />
            Exit Internet Download Manager when done
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.turnOffComputer} onChange={(e) => updateForm({ turnOffComputer: e.target.checked })} className="rounded accent-brand-500" />
              Turn off computer when done
            </label>
            <select 
              value={formData.turnOffAction} 
              onChange={(e) => updateForm({ turnOffAction: e.target.value as any })}
              disabled={!formData.turnOffComputer}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm disabled:opacity-50"
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
    );
  };

  const renderFilesTab = () => {
    // We would render the list of files assigned to `selectedId` here
    return (
      <div className="p-6">
        <p className="text-slate-400 text-sm">Files assigned to this queue will appear here.</p>
      </div>
    );
  };

  const renderLimits = () => {
    return (
      <div className="p-6 space-y-6 text-sm text-slate-300">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
          <input type="checkbox" className="rounded accent-brand-500" />
          Download limits
        </label>
        <div className="pl-6 space-y-4">
          <div className="flex items-center gap-2">
            <span>Download no more than</span>
            <input type="number" defaultValue="200" className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-20 text-center" />
            <span>MBytes</span>
          </div>
          <div className="flex items-center gap-2 pl-12">
            <span>every</span>
            <input type="number" defaultValue="5" className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-16 text-center" />
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
        
        <div className="flex-1 flex flex-col bg-slate-900/30">
          {selectedId === 'limits' ? (
            renderLimits()
          ) : (
            <>
              <div className="p-4 flex items-center justify-center font-medium text-slate-100 border-b border-slate-800">
                {formData?.name || 'Loading...'}
              </div>
              <div className="flex border-b border-slate-800">
                <button 
                  onClick={() => setActiveTab('schedule')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                  Schedule
                </button>
                <button 
                  onClick={() => setActiveTab('files')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'files' ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
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

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="flex gap-2">
          <button className="px-6 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-slate-200 transition-colors border border-white/10">Start now</button>
          <button className="px-6 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-slate-200 transition-colors border border-white/10">Stop</button>
        </div>
        <div className="flex gap-2">
          <button className="px-6 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-slate-200 transition-colors border border-white/10">Help</button>
          <button onClick={handleApply} disabled={selectedId === 'limits'} className="px-6 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 disabled:cursor-not-allowed rounded text-sm text-white transition-colors">Apply</button>
          <button onClick={() => window.location.hash = '#/'} className="px-6 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm text-slate-200 transition-colors border border-white/10">Close</button>
        </div>
      </div>
    </div>
  );
}
