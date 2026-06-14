import { describe, it, expect } from 'vitest';
import { formatFileSize, formatDuration } from '@rdm/shared';

describe('File size utils', () => {
  describe('formatFileSize', () => {
    it('formats bytes with 2 decimals', () => {
      expect(formatFileSize(500)).toBe('500.00 B');
    });
    it('formats kilobytes with 2 decimals', () => {
      expect(formatFileSize(1500)).toBe('1.46 KB');
    });
    it('formats megabytes with 2 decimals', () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
    });
    it('formats gigabytes with 2 decimals', () => {
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
    });
    it('handles zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
    it('returns Unknown for negative', () => {
      expect(formatFileSize(-1)).toBe('Unknown');
    });
    it('respects custom decimals', () => {
      expect(formatFileSize(1500, 1)).toBe('1.5 KB');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds', () => {
      expect(formatDuration(45)).toBe('45s');
    });
    it('formats minutes', () => {
      expect(formatDuration(125)).toBe('2m 5s');
    });
    it('formats hours', () => {
      expect(formatDuration(5000)).toBe('1h 23m 20s');
    });
  });
});
