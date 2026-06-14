import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowDown,
  CheckCircle,
  Settings,
  Clock,
  Globe,
  Zap,
  Puzzle,
  Cloud,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Downloads', icon: ArrowDown },
  { path: '/completed', label: 'Completed', icon: CheckCircle },
  { path: '/scheduler', label: 'Scheduler', icon: Clock },
  { path: '/grabber', label: 'Grabber', icon: Globe, disabled: true },
  { path: '/automation', label: 'Automation', icon: Zap },
  { path: '/plugins', label: 'Plugins', icon: Puzzle },
  { path: '/cloud', label: 'Cloud', icon: Cloud, disabled: true },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-52 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => !item.disabled && navigate(item.path)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-brand-500/10 text-brand-400 border-r-2 border-brand-500'
                  : item.disabled
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="text-xs text-slate-600 text-center">RDM v0.1.0</div>
      </div>
    </aside>
  );
}
