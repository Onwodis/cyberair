import https from 'https';
import http from 'http';
import { validateAndSanitizeUrl } from './validateUrl';

/**
 * Non-destructive security posture analyzer.
 *
 * Performs a respectful GET against an authorized target (following redirects
 * so the *real* landing page is assessed, not an interim 301) and derives a
 * deep, OWASP-mapped assessment from the final response headers + a bounded
 * HTML sample. No fuzzing, no payloads, no state changes are ever sent. Every
 * redirect hop is re-validated against the SSRF guard.
 */

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface SecurityCheck {
  id: string;
  name: string;
  category: string;
  severity: Severity;
  owasp: string;
  cia: string;
  present: boolean;
  value: string | null;
  isWeak: boolean;
  status: 'SECURE' | 'WEAK' | 'VULNERABLE';
  finding: string;
  explanation: string;
  analogy: string;
  exploit: string;
  remediation: string;
  impact: number; // points this check costs the score in its current state
}

export interface SeoCheck {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  value: string | null;
  finding: string;
  explanation: string;
  recommendation: string;
}

export interface AnalyzerResult {
  url: string;
  finalUrl: string;
  score: number;
  grade: string;
  uiUxScore: number;
  uiUxGrade: string;
  seoScore: number;
  seoGrade: string;
  seo: SeoCheck[];
  results: SecurityCheck[];
  meta: {
    statusCode: number | null;
    protocol: string;
    server: string | null;
    redirectedToHttps: boolean;
    redirects: number;
    responseTimeMs: number;
    bodyBytesSampled: number;
    counts: { secure: number; weak: number; vulnerable: number };
  };
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 5,
  LOW: 2,
  INFO: 0,
};

function gradeFor(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function headerString(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value.join(', ') : value;
}

interface FetchResult {
  headers: http.IncomingHttpHeaders;
  body: string;
  statusCode: number | null;
  finalUrl: string;
  isHttps: boolean;
  redirects: number;
  redirectedToHttps: boolean;
  responseTimeMs: number;
}

function fetchFollowingRedirects(
  startUrl: string,
  maxRedirects = 5
): Promise<FetchResult> {
  const start = Date.now();

  const step = (
    currentUrl: string,
    redirects: number,
    startedHttp: boolean
  ): Promise<FetchResult> =>
    new Promise((resolve, reject) => {
      const isHttps = currentUrl.startsWith('https');
      const client = isHttps ? https : http;

      const request = client.request(
        currentUrl,
        {
          method: 'GET',
          timeout: 9000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          const location = headerString(res.headers.location);

          // Follow 3xx redirects to assess the real destination page.
          if (
            [301, 302, 303, 307, 308].includes(status) &&
            location &&
            redirects < maxRedirects
          ) {
            res.resume(); // discard body
            let nextUrl: string;
            try {
              nextUrl = new URL(location, currentUrl).toString();
            } catch {
              return reject(new Error('Invalid redirect location.'));
            }
            const safeNext = validateAndSanitizeUrl(nextUrl);
            if (!safeNext) {
              return reject(
                new Error('Redirect pointed to a restricted/internal address.')
              );
            }
            const nowHttps = safeNext.startsWith('https');
            step(
              safeNext,
              redirects + 1,
              startedHttp || !isHttps
            ).then(resolve, reject);
            return;
          }

          let body = '';
          res.on('data', (chunk) => {
            if (body.length < 80000) body += chunk.toString();
          });
          res.on('end', () => {
            resolve({
              headers: res.headers,
              body,
              statusCode: res.statusCode ?? null,
              finalUrl: currentUrl,
              isHttps,
              redirects,
              redirectedToHttps: startedHttp && isHttps,
              responseTimeMs: Date.now() - start,
            });
          });
        }
      );

      request.on('error', () =>
        reject(new Error('Target server connection failed.'))
      );
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Target connection timed out (9000ms threshold).'));
      });
      request.end();
    });

  return step(startUrl, 0, false);
}

export async function analyzeTarget(
  sanitizedUrl: string
): Promise<AnalyzerResult> {
  const r = await fetchFollowingRedirects(sanitizedUrl);
  const h = r.headers;
  const htmlBody = r.body;
  const isHttps = r.isHttps;

  // ---- raw header extraction (from the FINAL response) ----
  const csp =
    headerString(h['content-security-policy']) ||
    headerString(h['content-security-policy-report-only']);
  const scriptSrc = (csp?.match(/script-src[^;]+/i) || [])[0] || '';
  // A nonce / hash / strict-dynamic makes 'unsafe-inline' inert in modern
  // browsers, so only flag "unsafe" when there is no such safeguard.
  const hasNonceOrHash = /'nonce-|'sha(256|384|512)-|'strict-dynamic'/i.test(
    scriptSrc || csp || ''
  );
  const hasUnsafe = scriptSrc
    ? /'unsafe-inline'|'unsafe-eval'|(^|\s)\*/i.test(scriptSrc)
    : Boolean(csp && /default-src[^;]*\*/i.test(csp));
  const cspUnsafe = hasUnsafe && !hasNonceOrHash;

  const hstsValue = headerString(h['strict-transport-security']);
  const hstsMaxAge = hstsValue
    ? parseInt((hstsValue.match(/max-age=(\d+)/i) || [])[1] || '0', 10)
    : 0;

  const xfoValue = headerString(h['x-frame-options']);
  const xctoValue = headerString(h['x-content-type-options']);
  const acaoValue = headerString(h['access-control-allow-origin']);
  const corsWildcard = acaoValue === '*';
  const acacValue = headerString(h['access-control-allow-credentials']);

  const serverValue =
    headerString(h['server']) || headerString(h['x-powered-by']);
  const rateHeader =
    headerString(h['ratelimit-limit']) ||
    headerString(h['x-ratelimit-limit']) ||
    headerString(h['x-rate-limit-limit']) ||
    headerString(h['retry-after']);

  const referrerPolicy = headerString(h['referrer-policy']);
  const permissionsPolicy =
    headerString(h['permissions-policy']) || headerString(h['feature-policy']);
  const coop = headerString(h['cross-origin-opener-policy']);
  const corp = headerString(h['cross-origin-resource-policy']);

  const setCookie = h['set-cookie'] || [];
  const cookieArr = Array.isArray(setCookie) ? setCookie : [setCookie];
  const insecureCookies = cookieArr.filter((c) => {
    const lc = c.toLowerCase();
    return (
      !lc.includes('secure') ||
      !lc.includes('httponly') ||
      !lc.includes('samesite')
    );
  });

  const mixedContent = isHttps && /["'(]http:\/\/[^"')\s]+/i.test(htmlBody);
  const passwordOverHttp =
    !isHttps && /<input[^>]+type=["']?password/i.test(htmlBody);
  const inlineHandlers = (
    htmlBody.match(/\son(click|load|error|mouseover)=/gi) || []
  ).length;

  const checks: SecurityCheck[] = [
    {
      id: 'csp',
      name: 'Content-Security-Policy (CSP)',
      category: 'Injection Defenses',
      severity: 'CRITICAL',
      owasp: 'A03:2021 - Injection',
      cia: 'Integrity & Confidentiality',
      present: Boolean(csp),
      value: csp,
      isWeak: cspUnsafe,
      status: csp ? (cspUnsafe ? 'WEAK' : 'SECURE') : 'VULNERABLE',
      finding: csp
        ? cspUnsafe
          ? "CSP present but weakened by 'unsafe-inline'/'unsafe-eval' with no nonce or hash to offset it."
          : 'CSP is active with restrictive script sources.'
        : 'No Content-Security-Policy on the final page.',
      explanation:
        'CSP whitelists where scripts, styles, frames and connections may load from, neutralising most injected JavaScript.',
      analogy:
        'Think of CSP as a strict guest list for a private party: only people (code) on the list get in. Without it, anyone who sneaks a note (script) through the door gets to act as if they belong — including thieves.',
      exploit:
        'An attacker who lands reflected or stored markup can execute script to steal sessions, keylog forms, or take over accounts.',
      remediation:
        "Serve a strict policy, e.g. `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<random>'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`. Use nonces/hashes instead of 'unsafe-inline'.",
      impact: 0,
    },
    {
      id: 'hsts',
      name: 'HTTP Strict Transport Security (HSTS)',
      category: 'Transport Security',
      severity: 'HIGH',
      owasp: 'A02:2021 - Cryptographic Failures',
      cia: 'Confidentiality',
      present: Boolean(hstsValue),
      value: hstsValue,
      isWeak: Boolean(hstsValue) && hstsMaxAge < 15768000,
      status: hstsValue
        ? hstsMaxAge < 15768000
          ? 'WEAK'
          : 'SECURE'
        : 'VULNERABLE',
      finding: hstsValue
        ? hstsMaxAge < 15768000
          ? `HSTS present but max-age (${hstsMaxAge}s) is below the recommended 6 months.`
          : 'Strong HSTS policy enforced.'
        : 'HSTS missing — the first request can be downgraded to plaintext HTTP.',
      explanation:
        'HSTS tells browsers to only ever reach the origin over TLS, defeating SSL-strip downgrade attacks.',
      analogy:
        'It is like telling the post office "only ever deliver my mail in a sealed, tamper-proof envelope." Without that rule, someone can intercept the first postcard and read everything on it.',
      exploit:
        'On a hostile network an attacker strips TLS on the first hop and reads credentials/cookies in cleartext.',
      remediation:
        'Return `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` on all HTTPS responses, then submit to hstspreload.org.',
      impact: 0,
    },
    {
      id: 'xfo',
      name: 'Clickjacking Protection (XFO / frame-ancestors)',
      category: 'UI Redressing Defenses',
      severity: 'MEDIUM',
      owasp: 'A05:2021 - Security Misconfiguration',
      cia: 'Integrity',
      present: Boolean(xfoValue || (csp && /frame-ancestors/i.test(csp))),
      value:
        xfoValue || (csp && /frame-ancestors[^;]*/i.exec(csp)?.[0]) || null,
      isWeak: false,
      status:
        xfoValue || (csp && /frame-ancestors/i.test(csp))
          ? 'SECURE'
          : 'VULNERABLE',
      finding: xfoValue
        ? `Frame restriction set to: ${xfoValue}`
        : csp && /frame-ancestors/i.test(csp)
        ? 'Framing controlled via CSP frame-ancestors.'
        : 'No framing protection — the app can be embedded by any site.',
      explanation:
        'Prevents the page being loaded in a hostile iframe and overlaid with decoy UI (clickjacking).',
      analogy:
        'Imagine a scammer putting a see-through sheet over a real bank form, so when you think you are clicking "check balance" you are actually signing a transfer. Framing protection forbids anyone from putting that sheet over your page.',
      exploit:
        'A transparent iframe overlays invisible controls so victims click "transfer funds" while thinking they click elsewhere.',
      remediation:
        "Set `X-Frame-Options: DENY` and, preferably, `Content-Security-Policy: frame-ancestors 'none'`.",
      impact: 0,
    },
    {
      id: 'xcto',
      name: 'X-Content-Type-Options (MIME Sniffing)',
      category: 'Data Integrity',
      severity: 'MEDIUM',
      owasp: 'A05:2021 - Security Misconfiguration',
      cia: 'Integrity',
      present: Boolean(
        xctoValue && xctoValue.toLowerCase().includes('nosniff')
      ),
      value: xctoValue,
      isWeak: false,
      status:
        xctoValue && xctoValue.toLowerCase().includes('nosniff')
          ? 'SECURE'
          : 'VULNERABLE',
      finding: xctoValue
        ? 'MIME sniffing disabled (nosniff).'
        : 'Missing X-Content-Type-Options header.',
      explanation:
        'Stops the browser second-guessing declared content types and executing uploads as script.',
      analogy:
        'It is like a customs officer who trusts the label on a box instead of guessing what is inside. Without it, a box labelled "photo" that actually contains a tool gets used as a tool.',
      exploit:
        'A user-uploaded "image" sniffed as HTML/JS runs in the victim origin.',
      remediation: 'Set `X-Content-Type-Options: nosniff` globally.',
      impact: 0,
    },
    {
      id: 'cors',
      name: 'Cross-Origin Resource Sharing (CORS)',
      category: 'Access Control',
      severity: 'HIGH',
      owasp: 'A01:2021 - Broken Access Control',
      cia: 'Confidentiality',
      present: !corsWildcard,
      value: acaoValue || 'Not exposed on this response',
      isWeak:
        corsWildcard && Boolean(acacValue && acacValue.toLowerCase() === 'true'),
      status: corsWildcard
        ? acacValue?.toLowerCase() === 'true'
          ? 'VULNERABLE'
          : 'WEAK'
        : 'SECURE',
      finding: corsWildcard
        ? acacValue?.toLowerCase() === 'true'
          ? 'Critical: wildcard origin combined with Allow-Credentials:true.'
          : 'Wildcard Access-Control-Allow-Origin (*).'
        : 'CORS origin restricted or not exposed.',
      explanation:
        'CORS decides which foreign origins may read authenticated responses from your API.',
      analogy:
        'Picture your house key working in any lock in the city. A wildcard CORS policy lets any website use a logged-in visitor to quietly open your door and copy their private papers.',
      exploit:
        'A wildcard with credentials lets any site read a logged-in user’s private JSON via their browser.',
      remediation:
        'Reflect only an explicit allowlist of trusted origins; never combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`.',
      impact: 0,
    },
    {
      id: 'cookies',
      name: 'Session Cookie Hardening',
      category: 'Session Management',
      severity: 'HIGH',
      owasp: 'A07:2021 - Identification & Authentication Failures',
      cia: 'Confidentiality',
      present: cookieArr.length === 0 || insecureCookies.length === 0,
      value:
        cookieArr.length === 0
          ? 'No Set-Cookie on this response'
          : `${cookieArr.length} cookie(s), ${insecureCookies.length} missing flags`,
      isWeak: insecureCookies.length > 0,
      status:
        cookieArr.length === 0
          ? 'SECURE'
          : insecureCookies.length > 0
          ? 'VULNERABLE'
          : 'SECURE',
      finding:
        cookieArr.length === 0
          ? 'No cookies set on the landing response.'
          : insecureCookies.length > 0
          ? `${insecureCookies.length} cookie(s) missing Secure / HttpOnly / SameSite.`
          : 'All cookies carry Secure, HttpOnly and SameSite.',
      explanation:
        'Secure, HttpOnly and SameSite flags keep session tokens off plaintext links, out of JavaScript, and immune to most CSRF.',
      analogy:
        'A session cookie is your "I am logged in" wristband. These flags make the wristband invisible to pickpockets (HttpOnly), only valid inside the venue (Secure), and non-transferable to other venues (SameSite).',
      exploit:
        'A cookie readable by JS is exfiltrated by injected script; one without SameSite rides along in cross-site requests.',
      remediation:
        'Issue session cookies as `Set-Cookie: id=…; Secure; HttpOnly; SameSite=Lax`, scoped with a sensible Path and short Max-Age.',
      impact: 0,
    },
    {
      id: 'referrer',
      name: 'Referrer-Policy',
      category: 'Information Disclosure',
      severity: 'MEDIUM',
      owasp: 'A05:2021 - Security Misconfiguration',
      cia: 'Confidentiality',
      present: Boolean(referrerPolicy),
      value: referrerPolicy,
      isWeak: Boolean(referrerPolicy && /unsafe-url/i.test(referrerPolicy)),
      status: referrerPolicy
        ? /unsafe-url/i.test(referrerPolicy)
          ? 'WEAK'
          : 'SECURE'
        : 'VULNERABLE',
      finding: referrerPolicy
        ? `Referrer-Policy: ${referrerPolicy}`
        : 'No Referrer-Policy — full URLs (with tokens) may leak to third parties.',
      explanation:
        'Controls how much of the originating URL is sent when users navigate or load cross-origin assets.',
      analogy:
        'When you walk from one shop to another, this decides whether you hand the next shopkeeper your full receipt (with your address and card number) or just the shop name. "unsafe-url" hands over everything.',
      exploit:
        'Session tokens or reset links embedded in URLs leak to analytics/ad origins via the Referer header.',
      remediation:
        'Set `Referrer-Policy: strict-origin-when-cross-origin` (or `no-referrer` for sensitive apps).',
      impact: 0,
    },
    {
      id: 'permissions',
      name: 'Permissions-Policy',
      category: 'Attack Surface Reduction',
      severity: 'LOW',
      owasp: 'A05:2021 - Security Misconfiguration',
      cia: 'Integrity',
      present: Boolean(permissionsPolicy),
      value: permissionsPolicy,
      isWeak: false,
      status: permissionsPolicy ? 'SECURE' : 'VULNERABLE',
      finding: permissionsPolicy
        ? `Permissions-Policy: ${permissionsPolicy}`
        : 'No Permissions-Policy — powerful browser features are not explicitly disabled.',
      explanation:
        'Explicitly switches off camera, microphone, geolocation, payment and other sensitive APIs the app does not use.',
      analogy:
        'It is the set of app permissions you grant on your phone. Leaving them all on means any rogue component can quietly turn on the camera or track location.',
      exploit:
        'Injected or embedded content silently requests camera/geolocation under the trusted origin.',
      remediation:
        'Set `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` and enable only what is needed.',
      impact: 0,
    },
    {
      id: 'coop',
      name: 'Cross-Origin-Opener-Policy (COOP)',
      category: 'Isolation',
      severity: 'MEDIUM',
      owasp: 'A05:2021 - Security Misconfiguration',
      cia: 'Confidentiality',
      present: Boolean(coop),
      value: coop,
      isWeak: false,
      status: coop ? 'SECURE' : 'VULNERABLE',
      finding: coop
        ? `COOP: ${coop}`
        : 'No COOP — the window can share a browsing-context group with cross-origin openers.',
      explanation:
        'Process-isolates your window so cross-origin pages cannot reference it — a defence against XS-Leaks/Spectre.',
      analogy:
        'It gives your page its own private room instead of an open-plan desk, so a stranger at the next desk cannot peek at what you are doing.',
      exploit:
        'A malicious opener probes window references to infer cross-origin state (login status, counts).',
      remediation:
        'Set `Cross-Origin-Opener-Policy: same-origin` (pair with COEP for full isolation).',
      impact: 0,
    },
    {
      id: 'corp',
      name: 'Cross-Origin-Resource-Policy (CORP)',
      category: 'Isolation',
      severity: 'LOW',
      owasp: 'A05:2021 - Security Misconfiguration',
      cia: 'Confidentiality',
      present: Boolean(corp),
      value: corp,
      isWeak: false,
      status: corp ? 'SECURE' : 'VULNERABLE',
      finding: corp
        ? `CORP: ${corp}`
        : 'No CORP — resources may be embedded by arbitrary cross-origin documents.',
      explanation:
        'Restricts which origins may embed your resources, limiting speculative side-channel leaks.',
      analogy:
        'It is a "do not photocopy" stamp on your documents, so other sites cannot pull in your files to measure or misuse them.',
      exploit:
        'Cross-origin pages embed your resources to time/measure responses in XS-Leak attacks.',
      remediation:
        'Set `Cross-Origin-Resource-Policy: same-origin` on responses that need not be shared.',
      impact: 0,
    },
    {
      id: 'info_leak',
      name: 'Server & Tech-Stack Banner Exposure',
      category: 'Information Disclosure',
      severity: 'LOW',
      owasp: 'A05:2021 - Security Misconfiguration',
      cia: 'Confidentiality',
      present: !serverValue,
      value: serverValue || 'Hidden / sanitised',
      isWeak: Boolean(serverValue && /\d/.test(serverValue)),
      status: serverValue ? (/\d/.test(serverValue) ? 'WEAK' : 'SECURE') : 'SECURE',
      finding: serverValue
        ? `Stack disclosed: ${serverValue}`
        : 'Server/framework signatures suppressed.',
      explanation:
        'Precise version banners let attackers map your stack straight to public CVEs.',
      analogy:
        'It is like a shop posting the exact model and year of its alarm system on the front door — burglars just look up that model’s known weaknesses.',
      exploit:
        'The disclosed version is matched against an exploit database and a targeted public PoC is fired.',
      remediation:
        'Strip or genericise `Server` and remove `X-Powered-By` (`poweredByHeader: false` in Next.js, `server_tokens off` in nginx).',
      impact: 0,
    },
    {
      id: 'rate_limit',
      name: 'Rate-Limiting / Abuse Protection Signal',
      category: 'Availability & Abuse Protection',
      severity: 'INFO',
      owasp: 'A04:2021 - Insecure Design',
      cia: 'Availability',
      present: Boolean(rateHeader),
      value: rateHeader || 'No rate-limit headers advertised',
      isWeak: false,
      status: rateHeader ? 'SECURE' : 'WEAK',
      finding: rateHeader
        ? `Rate-limit signalling present: ${rateHeader}`
        : 'No rate-limit headers advertised (may still be enforced at the edge).',
      explanation:
        'Per-client request ceilings blunt brute-force, credential-stuffing and layer-7 floods.',
      analogy:
        'It is the bouncer who stops the same person running in and out of the door a thousand times a minute. No bouncer means bots can hammer the entrance unchecked.',
      exploit:
        'Without throttling, a script brute-forces logins or exhausts the service with high-concurrency requests.',
      remediation:
        'Enforce per-IP/user rate limits at the edge/WAF and expose `RateLimit-*` headers; add backoff + lockout on auth.',
      impact: 0,
    },
    {
      id: 'mixed_content',
      name: 'Mixed Content',
      category: 'Transport Security',
      severity: 'MEDIUM',
      owasp: 'A02:2021 - Cryptographic Failures',
      cia: 'Integrity',
      present: !mixedContent,
      value: mixedContent
        ? 'http:// references found in HTTPS page'
        : isHttps
        ? 'No obvious insecure references'
        : 'N/A (page served over HTTP)',
      isWeak: mixedContent,
      status: mixedContent ? 'VULNERABLE' : 'SECURE',
      finding: mixedContent
        ? 'HTTPS page references resources over plaintext http://.'
        : isHttps
        ? 'No plaintext sub-resources detected in the sampled HTML.'
        : 'Served over HTTP; upgrade the origin to HTTPS first.',
      explanation:
        'Insecure sub-resources on a secure page can be tampered with in transit and void the TLS guarantee.',
      analogy:
        'It is a bank vault with one cardboard wall. The strong TLS lock on the rest of the page does not matter if an attacker can walk through the plain-HTTP side.',
      exploit:
        'A network attacker rewrites an http:// script tag to inject code into the otherwise-secure page.',
      remediation:
        'Load every sub-resource over HTTPS and add `Content-Security-Policy: upgrade-insecure-requests`.',
      impact: 0,
    },
  ];

  if (passwordOverHttp) {
    checks.push({
      id: 'password_http',
      name: 'Password Field Over Plaintext HTTP',
      category: 'Transport Security',
      severity: 'HIGH',
      owasp: 'A02:2021 - Cryptographic Failures',
      cia: 'Confidentiality',
      present: false,
      value: 'Password input detected on an HTTP page',
      isWeak: false,
      status: 'VULNERABLE',
      finding: 'A password field is served over unencrypted HTTP.',
      explanation:
        'Credentials typed into an HTTP page travel in cleartext across the network.',
      analogy:
        'It is like shouting your password across a crowded room — anyone nearby simply writes it down.',
      exploit: 'Anyone on-path captures the submitted username and password verbatim.',
      remediation:
        'Serve all authentication pages exclusively over HTTPS and redirect HTTP→HTTPS with HSTS.',
      impact: 0,
    });
  }

  if (inlineHandlers > 0) {
    checks.push({
      id: 'inline_handlers',
      name: 'Inline Event Handlers',
      category: 'Injection Defenses',
      severity: 'INFO',
      owasp: 'A03:2021 - Injection',
      cia: 'Integrity',
      present: false,
      value: `${inlineHandlers} inline on* handler(s) in sampled HTML`,
      isWeak: true,
      status: 'WEAK',
      finding: `${inlineHandlers} inline event handler(s) detected — these force CSP to allow 'unsafe-inline'.`,
      explanation:
        'Inline handlers prevent a strict CSP and widen the XSS sink surface.',
      analogy:
        'They are sticky notes with instructions taped all over the walls. To keep them working you must leave the doors unlocked (unsafe-inline), which also lets intruders leave their own notes.',
      exploit:
        'Reliance on unsafe-inline (to keep handlers working) re-enables the very XSS CSP is meant to stop.',
      remediation:
        'Move handlers into external scripts with addEventListener so a nonce/hash-based CSP can drop unsafe-inline.',
      impact: 0,
    });
  }

  // ---- scoring + per-check impact ----
  let points = 100;
  for (const c of checks) {
    let cost = 0;
    if (c.status === 'VULNERABLE') cost = SEVERITY_WEIGHT[c.severity];
    else if (c.status === 'WEAK')
      cost = Math.ceil(SEVERITY_WEIGHT[c.severity] / 3) || 2;
    c.impact = cost;
    points -= cost;
  }
  const score = Math.max(0, Math.min(100, points));

  // ---- UI/UX heuristic ----
  let uiUxPoints = 100;
  if (!/viewport/i.test(htmlBody)) uiUxPoints -= 15;
  if (!/<html/i.test(htmlBody)) uiUxPoints -= 10;
  if (!/<(header|nav|main|footer|article|section)/i.test(htmlBody))
    uiUxPoints -= 15;
  if (!/(icon|shortcut|apple-touch-icon)/i.test(htmlBody)) uiUxPoints -= 5;
  if (!/<title>/i.test(htmlBody)) uiUxPoints -= 10;
  if (!isHttps) uiUxPoints -= 15;
  if (htmlBody.length < 500) uiUxPoints = 88;
  const uiUxScore = Math.max(0, uiUxPoints);

  const counts = {
    secure: checks.filter((c) => c.status === 'SECURE').length,
    weak: checks.filter((c) => c.status === 'WEAK').length,
    vulnerable: checks.filter((c) => c.status === 'VULNERABLE').length,
  };

  // ---- SEO & discoverability ----
  const seo = buildSeoChecks(htmlBody, h);
  let seoPoints = 100;
  for (const s of seo) {
    if (s.status === 'FAIL') seoPoints -= 12;
    else if (s.status === 'WARN') seoPoints -= 5;
  }
  const seoScore = Math.max(0, Math.min(100, seoPoints));

  return {
    url: sanitizedUrl,
    finalUrl: r.finalUrl,
    score,
    grade: gradeFor(score),
    uiUxScore,
    uiUxGrade: gradeFor(uiUxScore),
    seoScore,
    seoGrade: gradeFor(seoScore),
    seo,
    results: checks,
    meta: {
      statusCode: r.statusCode,
      protocol: isHttps ? 'https' : 'http',
      server: serverValue,
      redirectedToHttps: r.redirectedToHttps,
      redirects: r.redirects,
      responseTimeMs: r.responseTimeMs,
      bodyBytesSampled: htmlBody.length,
      counts,
    },
  };
}
