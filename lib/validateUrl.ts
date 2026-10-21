import { URL } from 'url';

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // Cloud Metadata Endpoint
];

export function validateAndSanitizeUrl(inputUrl: string): string | null {
  try {
    let formattedUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const parsed = new URL(formattedUrl);

    // Block non-HTTP protocols (e.g. file://, ftp://)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    // SSRF Guard: Block internal network loopbacks
    const hostname = parsed.hostname.toLowerCase();
    if (
      BLOCKED_HOSTS.includes(hostname) ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.')
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
