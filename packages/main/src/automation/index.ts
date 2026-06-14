import { ipcMain } from 'electron';
import { IPC_CHANNELS, type AutomationRule, type RuleCondition, type RuleAction } from '@rdm/shared';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../storage/database';

function rowToRule(row: Record<string, unknown>): AutomationRule {
  let conditions: RuleCondition[] = [];
  let actions: RuleAction[] = [];
  try {
    conditions = JSON.parse(row.conditions as string);
  } catch { /* ignore */ }
  try {
    actions = JSON.parse(row.actions as string);
  } catch { /* ignore */ }
  return {
    id: row.id as string,
    name: row.name as string,
    enabled: !!(row.enabled as number),
    priority: (row.priority as number) || 0,
    conditions,
    actions,
    stopProcessing: !!(row.stop_processing as number),
  };
}

export function getRules(): AutomationRule[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM automation_rules ORDER BY priority ASC')
    .all() as Record<string, unknown>[];
  return rows.map(rowToRule);
}

export function registerAutomationIpc(): void {
  const db = getDatabase();

  ipcMain.handle(IPC_CHANNELS.AUTOMATION_GET_RULES, (): AutomationRule[] => {
    return getRules();
  });

  ipcMain.handle(
    IPC_CHANNELS.AUTOMATION_CREATE_RULE,
    (_event, data: Omit<AutomationRule, 'id'>): AutomationRule => {
      const id = uuid();
      db.prepare(
        `INSERT INTO automation_rules (id, name, enabled, priority, conditions, actions, stop_processing)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        data.name,
        data.enabled !== false ? 1 : 0,
        data.priority || 0,
        JSON.stringify(data.conditions),
        JSON.stringify(data.actions),
        data.stopProcessing ? 1 : 0,
      );
      return { id, ...data };
    },
  );

  ipcMain.handle(IPC_CHANNELS.AUTOMATION_UPDATE_RULE, (_event, rule: AutomationRule): boolean => {
    const result = db
      .prepare(
        `UPDATE automation_rules SET name=?, enabled=?, priority=?, conditions=?, actions=?, stop_processing=? WHERE id=?`,
      )
      .run(
        rule.name,
        rule.enabled ? 1 : 0,
        rule.priority,
        JSON.stringify(rule.conditions),
        JSON.stringify(rule.actions),
        rule.stopProcessing ? 1 : 0,
        rule.id,
      );
    return result.changes > 0;
  });

  ipcMain.handle(IPC_CHANNELS.AUTOMATION_DELETE_RULE, (_event, id: string): boolean => {
    const result = db.prepare('DELETE FROM automation_rules WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

export { evaluateRules } from './evaluator';
