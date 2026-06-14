import { useState, useEffect, useCallback } from 'react';
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react';
import type { AutomationRule, RuleCondition, RuleAction, DownloadPriority } from '@rdm/shared';

const COMMON_RULES = [
  {
    label: 'Videos → Videos folder',
    name: 'Video files → Videos',
    conditions: [{ type: 'file-extension' as const, extensions: ['.mp4', '.mkv', '.avi', '.mov', '.webm'] }],
    actions: [{ type: 'set-category' as const, categoryId: 'videos' }],
  },
  {
    label: 'Documents → Documents folder',
    name: 'Documents → Documents',
    conditions: [{ type: 'file-extension' as const, extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.pptx'] }],
    actions: [{ type: 'set-category' as const, categoryId: 'documents' }],
  },
  {
    label: 'Archives → Archives folder',
    name: 'Archives → Archives',
    conditions: [{ type: 'file-extension' as const, extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'] }],
    actions: [{ type: 'set-category' as const, categoryId: 'archives' }],
  },
  {
    label: 'Music → Music folder',
    name: 'Music → Music',
    conditions: [{ type: 'file-extension' as const, extensions: ['.mp3', '.flac', '.wav', '.aac', '.ogg'] }],
    actions: [{ type: 'set-category' as const, categoryId: 'music' }],
  },
];

export function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = useCallback(async () => {
    try {
      const all = await window.api.automation.getRules();
      setRules(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleCreate = useCallback(
    async (template: typeof COMMON_RULES[0]) => {
      try {
        await window.api.automation.createRule({
          name: template.name,
          enabled: true,
          priority: rules.length,
          conditions: template.conditions as RuleCondition[],
          actions: template.actions as RuleAction[],
          stopProcessing: false,
        });
        await loadRules();
      } catch (err) {
        console.error(err);
      }
    },
    [rules.length, loadRules],
  );

  const handleToggle = useCallback(
    async (rule: AutomationRule) => {
      try {
        await window.api.automation.updateRule({ ...rule, enabled: !rule.enabled });
        await loadRules();
      } catch (err) {
        console.error(err);
      }
    },
    [loadRules],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await window.api.automation.deleteRule(id);
        await loadRules();
      } catch (err) {
        console.error(err);
      }
    },
    [loadRules],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Automation</h1>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-slate-300 mb-3">Quick Templates</h2>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_RULES.map((template) => (
                  <button
                    key={template.label}
                    onClick={() => handleCreate(template)}
                    disabled={rules.some((r) => r.name === template.name)}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-800 hover:border-brand-700 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:border-slate-800"
                  >
                    <Plus size={14} className="text-brand-500" />
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {rules.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-300 mb-3">Active Rules</h2>
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      onToggle={() => handleToggle(rule)}
                      onDelete={() => handleDelete(rule.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {rules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                <Zap size={48} strokeWidth={1.5} className="text-slate-800" />
                <p className="mt-4 text-sm">No automation rules</p>
                <p className="text-xs mt-1">Use templates above to auto-categorize downloads</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getConditionLabel(condition: RuleCondition): string {
  switch (condition.type) {
    case 'file-extension':
      return `Extension: ${condition.extensions.join(', ')}`;
    case 'domain':
      return `Domain: ${condition.domains.join(', ')}`;
    case 'url-matches':
      return `URL matches: ${condition.pattern}`;
    case 'always':
      return 'Always';
    case 'file-size-gt':
      return `Size > ${condition.bytes} bytes`;
    case 'file-size-lt':
      return `Size < ${condition.bytes} bytes`;
    case 'mime-type':
      return `MIME: ${condition.mimeTypes.join(', ')}`;
    default:
      return 'Unknown';
  }
}

function getActionLabel(action: RuleAction): string {
  switch (action.type) {
    case 'set-category':
      return `Category: ${action.categoryId}`;
    case 'set-priority':
      return `Priority: ${action.priority}`;
    case 'set-speed-limit':
      return `Speed limit: ${action.bytesPerSecond} B/s`;
    case 'set-connections':
      return `Connections: ${action.count}`;
    case 'skip-download':
      return 'Skip download';
    case 'notify':
      return 'Notify';
    default:
      return 'Unknown';
  }
}

function RuleItem({
  rule,
  onToggle,
  onDelete,
}: {
  rule: AutomationRule;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.enabled ? 'bg-brand-500' : 'bg-slate-600'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200">{rule.name}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {rule.conditions.map((c, i) => (
              <span key={i} className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                IF {getConditionLabel(c)}
              </span>
            ))}
            {rule.actions.map((a, i) => (
              <span key={i} className="text-xs text-brand-400 bg-slate-800 px-1.5 py-0.5 rounded">
                THEN {getActionLabel(a)}
              </span>
            ))}
          </div>
        </div>
        <button onClick={onToggle} className="p-1.5 hover:bg-slate-800 rounded text-slate-400">
          {rule.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
