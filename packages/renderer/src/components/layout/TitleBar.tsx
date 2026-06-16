import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  return (
    <div className="flex items-center justify-between h-8 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 drag-region select-none flex-shrink-0">
      <div className="flex items-center gap-2 pl-4">
        <span className="text-brand-400 font-bold text-sm">RDM</span>
        <span className="text-slate-500 text-xs">Reactive Download Manager</span>
      </div>
      <div className="flex no-drag">
        <button
          onClick={() => window.api.app.minimize()}
          className="h-8 w-11 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => window.api.app.maximize()}
          className="h-8 w-11 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
        >
          <Square size={14} />
        </button>
        <button
          onClick={() => window.api.app.close()}
          className="h-8 w-11 flex items-center justify-center hover:bg-red-600 text-slate-500 dark:text-slate-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
