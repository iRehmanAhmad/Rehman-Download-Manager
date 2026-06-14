import { describe, it, expect } from 'vitest';

describe('DownloadStatusEnum', () => {
  it('has all 8 statuses', async () => {
    const { DownloadStatusEnum } = await import('@rdm/shared');
    expect(DownloadStatusEnum.QUEUED).toBe('queued');
    expect(DownloadStatusEnum.DOWNLOADING).toBe('downloading');
    expect(DownloadStatusEnum.PAUSED).toBe('paused');
    expect(DownloadStatusEnum.COMPLETING).toBe('completing');
    expect(DownloadStatusEnum.COMPLETED).toBe('completed');
    expect(DownloadStatusEnum.ERROR).toBe('error');
    expect(DownloadStatusEnum.CANCELLED).toBe('cancelled');
    expect(DownloadStatusEnum.MERGING).toBe('merging');
  });
});
