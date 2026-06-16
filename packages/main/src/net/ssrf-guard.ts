import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * SSRF protection for URLs that originate from less-trusted sources (web pages
 * scanned by the grabber, the browser-extension bridge). It rejects non-HTTP(S)
 * schemes and any host that resolves to a loopback, private, or link-local
 * address — the ranges an attacker would target to reach internal services
 * (e.g. cloud metadata endpoints at 169.254.169.254).
 *
 * The main download engine deliberately does NOT use this: adding a download
 * there is an explicit user action, and LAN downloads are a legitimate use.
 */

function ipToBytes(ip: string): number[] | null {
  if (net.isIPv4(ip)) return ip.split('.').map((p) => parseInt(p, 10));
  return null;
}

/** True for loopback / private / link-local / reserved ranges. */
export function isPrivateAddress(ip: string): boolean {
  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) ip = mapped[1];

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;       // loopback / unspecified
    if (lower.startsWith('fe80')) return true;                // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    return false;
  }

  const b = ipToBytes(ip);
  if (!b) return true; // unparseable → treat as unsafe

  const [a, second] = b;
  if (a === 10) return true;                       // 10.0.0.0/8
  if (a === 127) return true;                      // 127.0.0.0/8 loopback
  if (a === 0) return true;                        // 0.0.0.0/8
  if (a === 169 && second === 254) return true;    // 169.254.0.0/16 link-local
  if (a === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12
  if (a === 192 && second === 168) return true;    // 192.168.0.0/16
  if (a >= 224) return true;                       // multicast / reserved
  return false;
}

/**
 * Resolve the URL's host and confirm it is a public HTTP(S) endpoint.
 * Returns true if safe to fetch, false otherwise. Never throws.
 */
export async function isPublicHttpUrl(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const host = parsed.hostname;

  // Literal IP host — check directly without DNS.
  if (net.isIP(host)) return !isPrivateAddress(host);

  // Block obvious local names early.
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return false;
  }

  try {
    // Check every resolved address; if any is private, reject (defends against
    // DNS rebinding to a private IP).
    const results = await lookup(host, { all: true });
    if (results.length === 0) return false;
    return results.every((r) => !isPrivateAddress(r.address));
  } catch {
    return false; // resolution failure → fail closed
  }
}
