import { URL } from 'url';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  '169.254.169.254', // AWS/GCP cloud metadata endpoint
  'metadata.google.internal',
  'metadata',
]);

/** Returns true when an IPv4 literal falls inside a private / reserved range. */
function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => n > 255))
    return true; // malformed → block
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Blocks obvious private/loopback IPv6 forms. */
function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === '::1' || h === '::') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique local
  if (h.startsWith('fe80')) return true; // link-local
  if (h.startsWith('::ffff:')) return true; // IPv4-mapped
  return false;
}

/**
 * Validates and normalises a user-supplied target URL, rejecting non-HTTP
 * schemes and any address that resolves to an internal / reserved network
 * (defence-in-depth against SSRF). Returns the canonical URL or null.
 */
export function validateAndSanitizeUrl(inputUrl: string): string | null {
  try {
    if (!inputUrl || typeof inputUrl !== 'string') return null;
    let formatted = inputUrl.trim();
    if (formatted.length > 2048) return null;
    if (!/^https?:\/\//i.test(formatted)) formatted = `https://${formatted}`;

    const parsed = new URL(formatted);

    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null; // strip credential-embedding tricks

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) return null;
    if (BLOCKED_HOSTS.has(hostname)) return null;
    if (hostname.endsWith('.localhost') || hostname.endsWith('.internal'))
      return null;
    if (isPrivateIPv4(hostname)) return null;
    if (hostname.includes(':') && isPrivateIPv6(hostname)) return null;
    // Decimal/octal/hex-encoded IP obfuscation → reject anything numeric-only.
    if (/^(0x|0b)?\d+$/i.test(hostname.replace(/\./g, ''))) {
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
