import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOpen, Download, CheckCircle, Globe, List, PlusSquare, MinusSquare, File, FileArchive, FileMusic, AppWindow, Video, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../stores/settings-store';
import type { Category } from '@rdm/shared';

// Map category names to icons
function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('music')) return FileMusic;
  if (lower.includes('video')) return Video;
  if (lower.includes('document')) return File;
  if (lower.includes('archive') || lower.includes('compress')) return FileArchive;
  if (lower.includes('program')) return AppWindow;
  return HelpCircle;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const categories = useSettingsStore((s) => s.categories);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    all: true,
    unfinished: false,
    finished: false,
    grabber: false,
    queues: false,
  });

  const toggle = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-48 lg:w-64 flex-shrink-0 bg-slate-100/80 dark:bg-slate-900/40 backdrop-blur-md border-r border-slate-200 dark:border-white/5 flex flex-col shadow-2xl relative z-10 transition-all">
      <div className="flex-1 overflow-auto py-2">
        <div className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 mb-1 pb-1">
          {t('sidebar.categories')}
        </div>
        
        <div className="space-y-0.5 px-2">
          {/* All Downloads */}
          <CollapsibleNode
            id="all"
            icon={FolderOpen}
            label={t('sidebar.allDownloads')}
            path="/list/all"
            expanded={expanded.all}
            onToggle={(e) => toggle('all', e)}
            onClick={() => navigate('/list/all')}
            active={location.pathname === '/list/all'}
          >
            {categories.map((cat) => (
              <TreeItem
                key={cat.id}
                icon={getCategoryIcon(cat.name)}
                label={cat.name}
                active={location.pathname === `/list/all/${cat.id}`}
                onClick={() => navigate(`/list/all/${cat.id}`)}
                indentLevel={1}
              />
            ))}
          </CollapsibleNode>

          {/* Unfinished */}
          <CollapsibleNode
            id="unfinished"
            icon={Download}
            label={t('sidebar.unfinished')}
            path="/list/unfinished"
            expanded={expanded.unfinished}
            onToggle={(e) => toggle('unfinished', e)}
            onClick={() => navigate('/list/unfinished')}
            active={location.pathname === '/list/unfinished'}
          >
            {categories.map((cat) => (
              <TreeItem
                key={cat.id}
                icon={getCategoryIcon(cat.name)}
                label={cat.name}
                active={location.pathname === `/list/unfinished/${cat.id}`}
                onClick={() => navigate(`/list/unfinished/${cat.id}`)}
                indentLevel={1}
              />
            ))}
          </CollapsibleNode>

          {/* Finished */}
          <CollapsibleNode
            id="finished"
            icon={CheckCircle}
            label={t('sidebar.finished')}
            path="/list/finished"
            expanded={expanded.finished}
            onToggle={(e) => toggle('finished', e)}
            onClick={() => navigate('/list/finished')}
            active={location.pathname === '/list/finished'}
          >
            {categories.map((cat) => (
              <TreeItem
                key={cat.id}
                icon={getCategoryIcon(cat.name)}
                label={cat.name}
                active={location.pathname === `/list/finished/${cat.id}`}
                onClick={() => navigate(`/list/finished/${cat.id}`)}
                indentLevel={1}
              />
            ))}
          </CollapsibleNode>

          {/* Grabber projects */}
          <CollapsibleNode
            id="grabber"
            icon={Globe}
            label={t('sidebar.grabber')}
            path="/grabber"
            expanded={expanded.grabber}
            onToggle={(e) => toggle('grabber', e)}
            onClick={() => navigate('/grabber')}
            active={location.pathname === '/grabber'}
          />

          {/* Queues */}
          <CollapsibleNode
            id="queues"
            icon={FolderOpen}
            label={t('sidebar.queues')}
            path=""
            expanded={expanded.queues}
            onToggle={(e) => toggle('queues', e)}
            onClick={(e) => toggle('queues', e)}
            active={location.pathname.startsWith('/queue')}
          >
            <TreeItem
              icon={List}
              label={t('sidebar.mainQueue')}
              active={location.pathname === '/queue/main'}
              onClick={() => navigate('/queue/main')}
              indentLevel={1}
            />
            <TreeItem
              icon={List}
              label={t('sidebar.syncQueue')}
              active={location.pathname === '/queue/sync'}
              onClick={() => navigate('/queue/sync')}
              indentLevel={1}
            />
          </CollapsibleNode>
        </div>
      </div>
    </aside>
  );
}

function CollapsibleNode({
  icon: Icon,
  label,
  expanded,
  onToggle,
  onClick,
  active,
  children,
}: {
  id: string;
  icon: any;
  label: string;
  path: string;
  expanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  active: boolean;
  children?: React.ReactNode;
}) {
  const ToggleIcon = expanded ? MinusSquare : PlusSquare;

  return (
    <div>
      <div className="flex items-center group relative">
        <button
          onClick={onToggle}
          className="w-4 h-4 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 rounded mr-1 flex-shrink-0 transition-colors"
        >
          {children ? <ToggleIcon size={12} className="stroke-[1.5]" /> : null}
        </button>
        
        <button
          onClick={onClick}
          className={`flex items-center w-full px-2 py-1 cursor-pointer select-none transition-colors group text-xs ${
            active 
              ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-white font-medium' 
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 dark:hover:text-white'
          }`}
        >
          <Icon size={14} className={active ? 'text-brand-400' : 'text-yellow-500'} />
          <span className="ml-1.5">{label}</span>
        </button>
      </div>
      
      {expanded && children && (
        <div className="mt-0.5 relative before:absolute before:left-[9px] before:top-0 before:bottom-0 before:w-px before:bg-slate-300 dark:before:bg-slate-700/50">
          {children}
        </div>
      )}
    </div>
  );
}

function TreeItem({ icon: Icon, label, active, onClick, indentLevel = 0 }: { icon: any; label: string; active: boolean; onClick: () => void; indentLevel?: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 py-1 pr-3 rounded-sm text-[11px] transition-all relative ${
        active
          ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
      style={{ paddingLeft: `${1.5 + indentLevel * 1.5}rem` }}
    >
      <div className="absolute left-[9px] top-1/2 w-4 h-px bg-slate-300 dark:bg-slate-700/50" />
      <Icon size={13} className={active ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'text-slate-400'} />
      <span>{label}</span>
    </button>
  );
}
