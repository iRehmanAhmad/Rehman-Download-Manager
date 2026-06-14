import type { DownloadPriority } from './download';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  stopProcessing: boolean;
}

export type RuleCondition =
  | { type: 'url-matches'; pattern: string; flags?: string }
  | { type: 'file-extension'; extensions: string[] }
  | { type: 'file-size-gt'; bytes: number }
  | { type: 'file-size-lt'; bytes: number }
  | { type: 'domain'; domains: string[] }
  | { type: 'mime-type'; mimeTypes: string[] }
  | { type: 'always' };

export type RuleAction =
  | { type: 'set-category'; categoryId: string }
  | { type: 'set-priority'; priority: DownloadPriority }
  | { type: 'set-speed-limit'; bytesPerSecond: number }
  | { type: 'set-connections'; count: number }
  | { type: 'set-filename'; pattern: string }
  | { type: 'set-headers'; headers: Record<string, string> }
  | { type: 'run-script'; script: string; interpreter?: string }
  | { type: 'skip-download' }
  | { type: 'upload-to-cloud'; providerId: string; folder?: string }
  | { type: 'notify' };
