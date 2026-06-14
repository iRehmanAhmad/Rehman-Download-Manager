import type { DownloadOptions, AutomationRule, RuleCondition, RuleAction } from '@rdm/shared';
import { getRules } from './index';

export function evaluateRules(options: DownloadOptions): DownloadOptions {
  const rules = getRules().filter((r) => r.enabled);
  let updatedOptions = { ...options };

  for (const rule of rules) {
    if (matchesConditions(updatedOptions, rule.conditions)) {
      updatedOptions = applyActions(updatedOptions, rule.actions);
      if (rule.stopProcessing) break;
    }
  }

  return updatedOptions;
}

function matchesConditions(options: DownloadOptions, conditions: RuleCondition[]): boolean {
  if (conditions.length === 0) return false;

  for (const cond of conditions) {
    switch (cond.type) {
      case 'url-matches':
        try {
          const regex = new RegExp(cond.pattern, cond.flags || 'i');
          if (!regex.test(options.url)) return false;
        } catch {
          return false;
        }
        break;
      case 'file-extension':
        if (!options.filename) return false;
        const ext = '.' + options.filename.split('.').pop()?.toLowerCase();
        if (!cond.extensions.map(e => e.toLowerCase()).includes(ext)) return false;
        break;
      case 'domain':
        try {
          const urlObj = new URL(options.url);
          if (!cond.domains.includes(urlObj.hostname)) return false;
        } catch {
          return false;
        }
        break;
      case 'always':
        break;
      // file-size-gt, file-size-lt, mime-type are not easily available before download starts
      // We will skip them or evaluate to false
      case 'file-size-gt':
      case 'file-size-lt':
      case 'mime-type':
        return false;
    }
  }
  return true;
}

function applyActions(options: DownloadOptions, actions: RuleAction[]): DownloadOptions {
  const result = { ...options };
  
  for (const action of actions) {
    switch (action.type) {
      case 'set-category':
        result.categoryId = action.categoryId;
        break;
      case 'set-priority':
        result.priority = action.priority;
        break;
      case 'set-speed-limit':
        result.speedLimit = action.bytesPerSecond;
        break;
      case 'set-connections':
        result.numConnections = action.count;
        break;
      case 'set-filename':
        result.filename = action.pattern; // simplified, doesn't handle template vars yet
        break;
      case 'set-headers':
        result.headers = { ...result.headers, ...action.headers };
        break;
    }
  }

  return result;
}
