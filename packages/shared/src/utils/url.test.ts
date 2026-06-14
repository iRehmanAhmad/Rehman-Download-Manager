import { describe, it, expect } from 'vitest';
import { isValidUrl, extractFilename, getDomain, getExtension } from '@rdm/shared';

describe('URL utils', () => {
  describe('isValidUrl', () => {
    it('accepts HTTP URLs', () => {
      expect(isValidUrl('http://example.com/file.zip')).toBe(true);
    });
    it('accepts HTTPS URLs', () => {
      expect(isValidUrl('https://example.com/file.zip')).toBe(true);
    });
    it('rejects non-URL strings', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });
    it('rejects empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('extractFilename', () => {
    it('extracts filename from URL path', () => {
      expect(extractFilename('https://example.com/path/to/file.zip')).toBe('file.zip');
    });
    it('handles root path', () => {
      const result = extractFilename('https://example.com/');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDomain', () => {
    it('returns hostname', () => {
      expect(getDomain('https://www.example.com/path')).toBe('www.example.com');
    });
    it('returns empty for bad URL', () => {
      expect(getDomain('not-a-url')).toBe('');
    });
  });

  describe('getExtension', () => {
    it('returns lowercase extension from URL', () => {
      expect(getExtension('https://example.com/file.ZIP')).toBe('.zip');
    });
    it('returns empty for no extension', () => {
      expect(getExtension('https://example.com/README')).toBe('');
    });
  });
});
