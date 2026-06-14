import { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ScheduleEntry } from '@rdm/shared';

export function SchedulerPage() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [cronExpression, setCron] = useState('0 0 * * *');
  const [startTime, setStartTime] = useState('');
  const [stopTime, setStopTime] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState('');

  const loadEntries = useCallback(async () => {
    try {
      const all = await window.api.schedule.getAll();
      setEntries(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleCreate = useCallback(async () => {
    if (!url.trim() || !cronExpression.trim()) return;
    try {
      await window.api.schedule.create({
        name: name.trim() || undefined,
        url: url.trim(),
        cronExpression: cronExpression.trim(),
        startTime: startTime || undefined,
        stopTime: stopTime || undefined,
        daysOfWeek: daysOfWeek || undefined,
        active: true,
      });
      await loadEntries();
      setShowForm(false);
      setName('');
      setUrl('');
      setCron('0 0 * * *');
      setStartTime('');
      setStopTime('');
      setDaysOfWeek('');
    } catch (err) {
      console.error(err);
    }
  }, [url, cronExpression, name, startTime, stopTime, daysOfWeek, loadEntries]);

  const handleToggle = useCallback(
    async (entry: ScheduleEntry) => {
      try {
        await window.api.schedule.update({ ...entry, active: !entry.active });
        await loadEntries();
      } catch (err) {
        console.error(err);
      }
    },
    [loadEntries],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await window.api.schedule.delete(id);
        await loadEntries();
      } catch (err) {
        console.error(err);
      }
    },
    [loadEntries],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Scheduler</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-md transition-colors"
        >
          <Plus size={14} />
          Add Schedule
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Clock size={48} strokeWidth={1.5} className="text-slate-800" />
            <p className="mt-4 text-sm">No scheduled downloads</p>
            <p className="text-xs mt-1">Create a schedule to automatically download at specific times</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <ScheduleItem
                key={entry.id}
                entry={entry}
                onToggle={() => handleToggle(entry)}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-100 mb-4">New Schedule</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nightly backup"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/file.zip"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cron Expression</label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 0 * * *"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 font-mono focus:outline-none focus:border-brand-500"
                />
                <p className="text-xs text-slate-600 mt-1">minute hour day-of-month month day-of-week</p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Stop Time</label>
                  <input
                    type="time"
                    value={stopTime}
                    onChange={(e) => setStopTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Days of Week (comma-separated, 0=Sun)</label>
                <input
                  type="text"
                  value={daysOfWeek}
                  onChange={(e) => setDaysOfWeek(e.target.value)}
                  placeholder="1,2,3,4,5"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!url.trim()}
                className="flex-1 px-3 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleItem({
  entry,
  onToggle,
  onDelete,
}: {
  entry: ScheduleEntry;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.active ? 'bg-brand-500' : 'bg-slate-600'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {entry.name || 'Unnamed'}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{entry.url}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <code className="text-xs text-brand-400 bg-slate-800 px-1.5 py-0.5 rounded">
              {entry.cronExpression}
            </code>
            {entry.nextRun && (
              <span className="text-xs text-slate-500">
                Next: {new Date(entry.nextRun).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <button onClick={onToggle} className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
          {entry.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
