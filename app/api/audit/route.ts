import { NextResponse } from 'next/server';
import https from 'https';
import http from 'http';
import { connectToDatabase } from '@/lib/db';
import QueryLog from '@/models/QueryLog';
import { validateAndSanitizeUrl } from '@/lib/validateUrl';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(ip, 30, 60000)) {
      return NextResponse.json(
        {
          error:
            'Rate limit exceeded. Please wait a minute before auditing again.',
        },
        { status: 429 }
      );
    }

    const { targetUrl } = await req.json();
    const sanitizedUrl = validateAndSanitizeUrl(targetUrl);
    if (!sanitizedUrl) {
      return NextResponse.json(
        { error: 'Invalid or restricted target URL provided.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await QueryLog.create({ url: sanitizedUrl });

    const auditData: any = await new Promise((resolve, reject) => {
      const isHttps = sanitizedUrl.startsWith('https');
      const client = isHttps ? https : http;

      const request = client.request(
        sanitizedUrl,
        {
          method: 'GET',
          timeout: 7000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
        (res) => {
          let htmlBody = '';
          res.on('data', (chunk) => {
            if (htmlBody.length < 50000) {
              // Read first 50KB for UI/UX inspection
              htmlBody += chunk.toString();
            }
          });

          res.on('end', () => {
            const headers = res.headers;

            // --- 1. SECURITY HEADER CHECKS ---
            const csp =
              headers['content-security-policy'] ||
              headers['content-security-policy-report-only'];
            const cspValue = Array.isArray(csp) ? csp.join('; ') : csp || null;
           

            const scriptSrcSection =
              (cspValue?.match(/script-src[^;]+/i) || [])[0] || '';
            const cspUnsafe = scriptSrcSection
              ? /'unsafe-inline'|'unsafe-eval'|\*/i.test(scriptSrcSection)
              : false;
            // const cspUnsafe = cspValue
            //   ? /'unsafe-inline'|'unsafe-eval'|\*/i.test(cspValue)
            //   : false;

            const hsts = headers['strict-transport-security'];
            const hstsValue = Array.isArray(hsts) ? hsts[0] : hsts || null;
            const hstsMaxAge = hstsValue
              ? parseInt(
                  (hstsValue.match(/max-age=(\d+)/i) || [])[1] || '0',
                  10
                )
              : 0;

            const xfo = headers['x-frame-options'];
            const xfoValue = Array.isArray(xfo) ? xfo[0] : xfo || null;

            const xcto = headers['x-content-type-options'];
            const xctoValue = Array.isArray(xcto) ? xcto[0] : xcto || null;

            const acao = headers['access-control-allow-origin'];
            const acaoValue = Array.isArray(acao) ? acao[0] : acao || null;
            const corsWildcard = acaoValue === '*';

            const serverHeader = headers['server'] || headers['x-powered-by'];
            const serverValue = Array.isArray(serverHeader)
              ? serverHeader.join(', ')
              : serverHeader || null;

            const rateHeader =
              headers['ratelimit-limit'] ||
              headers['x-ratelimit-limit'] ||
              headers['x-rate-limit-limit'] ||
              headers['retry-after'];

            const checks = [
              {
                id: 'csp',
                name: 'Content-Security-Policy (CSP)',
                category: 'Injection Defenses',
                severity: 'CRITICAL',
                owasp: 'A05:2026 - Security Misconfiguration',
                cia: 'Integrity & Confidentiality',
                present: Boolean(cspValue),
                value: cspValue,
                isWeak: cspUnsafe,
                finding: cspValue
                  ? cspUnsafe
                    ? 'CSP is active but contains unsafe directives (e.g. unsafe-inline or unsafe-eval).'
                    : 'CSP is properly configured with strict directives.'
                  : 'Missing Content Security Policy. Leaves site exposed to Cross-Site Scripting (XSS).',
                explanation:
                  'CSP specifies allowed source domains for scripts, stylesheets, images, and frames.',
                exploit:
                  'An attacker can inject malicious client-side JavaScript via forms or parameters to harvest passwords.',
              },
              {
                id: 'hsts',
                name: 'HTTP Strict Transport Security (HSTS)',
                category: 'Transport Security',
                severity: 'HIGH',
                owasp: 'A02:2026 - Cryptographic Failures',
                cia: 'Confidentiality',
                present: Boolean(hstsValue),
                value: hstsValue,
                isWeak: hstsMaxAge < 15768000,
                finding: hstsValue
                  ? hstsMaxAge < 15768000
                    ? `HSTS active but max-age (${hstsMaxAge}s) is under recommended 6 months.`
                    : 'Strong HSTS policy enforced sitewide.'
                  : 'HSTS missing. Browsers may connect over plain unencrypted HTTP.',
                explanation:
                  'Forces all browser interactions to occur over encrypted HTTPS connections.',
                exploit:
                  'An attacker on public Wi-Fi can downgrade HTTPS to HTTP, intercepting passwords in cleartext.',
              },
              {
                id: 'xfo',
                name: 'X-Frame-Options / Clickjacking Guard',
                category: 'UI Redirection Defenses',
                severity: 'MEDIUM',
                owasp: 'A05:2026 - Security Misconfiguration',
                cia: 'Integrity',
                present: Boolean(xfoValue),
                value: xfoValue,
                isWeak: false,
                finding: xfoValue
                  ? `Frame restriction set to: ${xfoValue}`
                  : 'Missing framing protections.',
                explanation:
                  'Prevents third-party domains from loading your application inside an HTML iframe.',
                exploit:
                  'An attacker embeds your app in a transparent iframe to trick users into clicking hidden buttons.',
              },
              {
                id: 'xcto',
                name: 'X-Content-Type-Options (MIME Sniffing)',
                category: 'Data Integrity',
                severity: 'MEDIUM',
                owasp: 'A05:2026 - Security Misconfiguration',
                cia: 'Integrity',
                present: Boolean(
                  xctoValue && xctoValue.toLowerCase().includes('nosniff')
                ),
                value: xctoValue,
                isWeak: false,
                finding: xctoValue
                  ? 'MIME sniffing disabled (nosniff).'
                  : 'Missing X-Content-Type-Options header.',
                explanation:
                  'Prevents web browsers from guessing mime-types when loading external user assets.',
                exploit:
                  'An attacker uploads a file with false extensions, forcing the browser to execute malicious code.',
              },
              {
                id: 'cors',
                name: 'Cross-Origin Resource Sharing (CORS)',
                category: 'Access Control',
                severity: 'HIGH',
                owasp: 'A01:2026 - Broken Access Control',
                cia: 'Confidentiality',
                present: !corsWildcard,
                value: acaoValue || 'Restricted / Not Exposed',
                isWeak: corsWildcard,
                finding: corsWildcard
                  ? 'CRITICAL: Access-Control-Allow-Origin is wildcard (*).'
                  : 'CORS origins restricted.',
                explanation:
                  'Governs which external domains are permitted to read API data cross-origin.',
                exploit:
                  'Any malicious website can make authenticated XMLHttpRequests to fetch private user JSON data.',
              },
              {
                id: 'info_leak',
                name: 'Server & Tech Stack Banner Exposure',
                category: 'Information Disclosure',
                severity: 'LOW',
                owasp: 'A05:2026 - Security Misconfiguration',
                cia: 'Confidentiality',
                present: !Boolean(serverValue),
                value: serverValue || 'Hidden / Sanitized',
                isWeak: Boolean(serverValue),
                finding: serverValue
                  ? `Exposing server software stack: ${serverValue}`
                  : 'Server signatures hidden.',
                explanation:
                  'Exposing backend software version numbers speeds up automated exploit profiling.',
                exploit:
                  'Hackers search CVE databases for exact framework versions to apply targeted public exploits.',
              },
              {
                id: 'rate_limit',
                name: 'Automated Rate-Limiting Protection',
                category: 'Availability & Abuse Protection',
                severity: 'HIGH',
                owasp: 'A04:2026 - Insecure Design',
                cia: 'Availability',
                present: Boolean(rateHeader),
                value: rateHeader ? String(rateHeader) : null,
                isWeak: false,
                finding: rateHeader
                  ? `Rate limit headers detected: ${rateHeader}`
                  : 'No rate-limiting headers exposed.',
                explanation:
                  'Restricts frequency of inbound API calls per IP to prevent service exhaustion.',
                exploit:
                  'Attackers run multi-threaded scripts to brute-force credentials or cause Denial of Service.',
              },
            ];

            // --- 2. SECURITY SCORE CALCULATION ---
            let securityPoints = 100;

            checks.forEach((check) => {
              if (!check.present) {
                if (check.severity === 'CRITICAL') securityPoints -= 25;
                else if (check.severity === 'HIGH') securityPoints -= 15;
                else if (check.severity === 'MEDIUM') securityPoints -= 5;
                else if (check.severity === 'LOW') securityPoints -= 2;
              } else if (check.isWeak) {
                securityPoints -= 5;
              }
            });
            const securityScore = Math.max(0, securityPoints);
            let securityGrade = 'F';
            if (securityScore >= 90) securityGrade = 'A+';
            else if (securityScore >= 80) securityGrade = 'A';
            else if (securityScore >= 70) securityGrade = 'B';
            else if (securityScore >= 60) securityGrade = 'C';
            else if (securityScore >= 50) securityGrade = 'D';

            // --- 3. UI/UX & PROFESSIONALISM HEURISTIC CALCULATION ---
            let uiUxPoints = 100;
            const hasViewport = /viewport/i.test(htmlBody);
            const hasHtmlTag = /<html/i.test(htmlBody);
            const hasSemanticTags =
              /<(header|nav|main|footer|article|section|div|span)/i.test(
                htmlBody
              );
            const hasFavicon = /(icon|shortcut|apple-touch-icon)/i.test(
              htmlBody
            );
            const hasTitle = /<title>/i.test(htmlBody);
            const usesHttps = isHttps;

            if (!hasViewport) uiUxPoints -= 15;
            if (!hasHtmlTag) uiUxPoints -= 10;
            if (!hasSemanticTags) uiUxPoints -= 15;
            if (!hasFavicon) uiUxPoints -= 5;
            if (!hasTitle) uiUxPoints -= 10;
            if (!usesHttps) uiUxPoints -= 15;

            // Baseline fallback if edge protection/bot wall truncates HTML body
            if (htmlBody.length < 500) {
              uiUxPoints = 88;
            }

            const uiUxScore = Math.max(0, uiUxPoints);
            let uiUxGrade = 'F';
            if (uiUxScore >= 90) uiUxGrade = 'A+';
            else if (uiUxScore >= 80) uiUxGrade = 'A';
            else if (uiUxScore >= 70) uiUxGrade = 'B';
            else if (uiUxScore >= 60) uiUxGrade = 'C';
            else if (uiUxScore >= 50) uiUxGrade = 'D';

            resolve({
              score: securityScore,
              grade: securityGrade,
              uiUxScore,
              uiUxGrade,
              results: checks,
            });
          });
        }
      );

      request.on('error', () =>
        reject(new Error('Target server connection failed.'))
      );
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Target connection timed out (7000ms threshold).'));
      });

      request.end();
    });

    return NextResponse.json(auditData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Audit execution failed.' },
      { status: 500 }
    );
  }
}
