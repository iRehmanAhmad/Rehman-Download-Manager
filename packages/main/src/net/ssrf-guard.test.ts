import { describe, it, expect } from 'vitest';
import { isPrivateAddress } from './ssrf-guard';

describe('isPrivateAddress', () => {
  it('flags loopback addresses', () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true);
    expect(isPrivateAddress('127.255.255.255')).toBe(true);
    expect(isPrivateAddress('::1')).toBe(true);
  });

  it('flags link-local / metadata ranges', () => {
    expect(isPrivateAddress('169.254.169.254')).toBe(true); // cloud metadata
    expect(isPrivateAddress('fe80::1')).toBe(true);
  });

  it('flags private RFC1918 ranges', () => {
    expect(isPrivateAddress('10.0.0.5')).toBe(true);
    expect(isPrivateAddress('192.168.1.1')).toBe(true);
    expect(isPrivateAddress('172.16.0.1')).toBe(true);
    expect(isPrivateAddress('172.31.255.255')).toBe(true);
    expect(isPrivateAddress('fd00::1')).toBe(true);
  });

  it('treats 172.32+ as public (outside the /12)', () => {
    expect(isPrivateAddress('172.32.0.1')).toBe(false);
    expect(isPrivateAddress('172.15.0.1')).toBe(false);
  });

  it('allows ordinary public addresses', () => {
    expect(isPrivateAddress('8.8.8.8')).toBe(false);
    expect(isPrivateAddress('1.1.1.1')).toBe(false);
    expect(isPrivateAddress('2606:4700:4700::1111')).toBe(false);
  });

  it('handles IPv4-mapped IPv6 loopback', () => {
    expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true);
  });

  it('fails closed on unparseable input', () => {
    expect(isPrivateAddress('not-an-ip')).toBe(true);
  });
});
