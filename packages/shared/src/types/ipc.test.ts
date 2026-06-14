import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS } from '@rdm/shared';

describe('IPC Channels', () => {
  it('all channel values are unique', () => {
    const values = Object.values(IPC_CHANNELS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('contains all phase 1-9 channels', () => {
    expect(IPC_CHANNELS.DOWNLOAD_ADD).toBeDefined();
    expect(IPC_CHANNELS.QUEUE_REORDER).toBeDefined();
    expect(IPC_CHANNELS.SCHEDULE_GET_ALL).toBeDefined();
    expect(IPC_CHANNELS.AUTOMATION_GET_RULES).toBeDefined();
    expect(IPC_CHANNELS.PLUGIN_GET_ALL).toBeDefined();
    expect(IPC_CHANNELS.GRABBER_DETECT_VIDEOS).toBeDefined();
    expect(IPC_CHANNELS.CLIPBOARD_URL).toBeDefined();
    expect(IPC_CHANNELS.APP_GET_VERSION).toBeDefined();
  });
});
