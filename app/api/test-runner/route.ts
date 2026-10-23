import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { validateAndSanitizeUrl } from '@/lib/validateUrl';

export const maxDuration = 45;

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-change-this'
);

/**
 * Injection & input-handling robustness probe (authorized, non-destructive).
 *
 * This is a DETECTION harness, not an attack tool: it sends bounded, read-only
 * GET requests carrying classic probe strings and infers vulnerabilities from
 * the target's *responses* (reflected markers, database error signatures, 5xx
 * fragility). It never sends data-destroying payloads, never exceeds its caps,
 * is gated behind admin auth + an explicit authorization acknowledgement, and
 * refuses internal/again-SSRF targets.
 */

interface Probe {
  type: string;
  payload: string;
  // Returns a vulnerability note if the response indicates the probe landed.
  detect: (status: number, body: string, payload: string) => string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  remediation: string;
}

const XSS_MARKER = 'cyberair_xss_7731';
const SSTI_EXPR = '{{919*7}}';
const SSTI_RESULT = '6433'; // 919*7

const PROBES: Probe[] = [
  {
    type: 'SQL Injection',
    payload: "'",
    severity: 'CRITICAL',
    remediation:
      'Use parameterised queries / prepared statements; never concatenate user input into SQL. Validate and reject unexpected characters.',
    detect: (_s, body) =>
      /SQL syntax|mysql_fetch|ORA-\d{5}|SQLite3?::|PostgreSQL.*ERROR|unterminated quoted string|SQLSTATE|ODBC|syntax error at or near/i.test(
        body
      )
        ? 'Database error surfaced from a single-quote probe — strong SQL injection indicator.'
        : null,
  },
  {
    type: 'SQL Injection (boolean)',
    payload: "' OR '1'='1",
    severity: 'CRITICAL',
    remediation:
      'Parameterise queries and apply strict input validation; a tautology must never alter query results.',
    detect: (_s, body) =>
      /SQL syntax|SQLSTATE|PostgreSQL.*ERROR|mysql_fetch/i.test(body)
        ? 'SQL error triggered by a boolean tautology probe — SQL injection likely.'
        : null,
  },
  {
    type: 'Reflected XSS',
    payload: `<x>${XSS_MARKER}</x>`,
    severity: 'HIGH',
    remediation:
      'Context-encode all output and set a strict Content-Security-Policy; never reflect raw user input into HTML.',
    detect: (_s, body) =>
      body.includes(`<x>${XSS_MARKER}</x>`)
        ? 'Probe markup was reflected unescaped in the response — reflected XSS indicator.'
        : null,
  },
  {
    type: 'Server-Side Template Injection',
    payload: SSTI_EXPR,
    severity: 'HIGH',
    remediation:
      'Do not render user input through a template engine; use logic-less templates or escape/scrub inputs.',
    detect: (_s, body) =>
      body.includes(SSTI_RESULT)
        ? `Template expression was evaluated (${SSTI_EXPR} → ${SSTI_RESULT}) — server-side template injection.`
        : null,
  },
  {
    type: 'Path Traversal / LFI',
    payload: '../../../../etc/passwd',
    severity: 'HIGH',
    remediation:
      'Never build file paths from user input; use allow-lists and canonicalise + verify paths stay within an intended root.',
    detect: (_s, body) =>
      /root:.*:0:0:/.test(body)
        ? 'A system file signature appeared in the response — path traversal / local file inclusion.'
        : null,
  },
  {
    type: 'Oversized Input (robustness)',
    payload: 'A'.repeat(5000),
    severity: 'MEDIUM',
    remediation:
      'Enforce maximum input lengths and return a clean 400 for oversized input instead of a 5xx.',
    detect: (status) =>
      status >= 500
        ? 'Oversized input produced a 5xx — unbounded input handling / fragile endpoint.'
        : null,
  },
  {
    type: 'Type Confusion',
    payload: 'null',
    severity: 'LOW',
    remediation:
      'Validate and coerce types server-side; handle null/array inputs gracefully with a 400, not a crash.',
    detect: (status) =>
      status >= 500
        ? 'A null/type-mismatch value produced a 5xx — missing input type validation.'
        : null,
  },
];

export async function POST(req: Request) {
  try {
    // --- admin auth ---
    const cookieStore = await cookies();
    const token = cookieStore.get('sec_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      targetUrl,
      paramName = 'id',
      rounds = 2,
      authorized = false,
    } = await req.json();

    if (authorized !== true) {
      return NextResponse.json(
        {
          error:
            'Authorization required: confirm you own or are explicitly permitted to test this target.',
        },
        { status: 403 }
      );
    }

    const base = validateAndSanitizeUrl(targetUrl);
    if (!base) {
      return NextResponse.json(
        { error: 'Invalid or restricted target URL.' },
        { status: 400 }
      );
    }

    // Bounded: a handful of probe rounds, never a flood.
    const safeRounds = Math.min(Math.max(Number(rounds) || 2, 1), 5);
    const safeParam = String(paramName || 'id').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || 'id';

    const findingsMap = new Map<
      string,
      { type: string; severity: string; note: string; remediation: string; sample: string }
    >();
    let sent = 0;
    let errors = 0;
    let fragile = 0; // 5xx responses
    let totalLatency = 0;

    const runProbe = async (probe: Probe) => {
      const u = new URL(base);
      u.searchParams.set(safeParam, probe.payload);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const start = performance.now();
      try {
        const res = await fetch(u.toString(), {
          method: 'GET',
          headers: { 'User-Agent': 'cyberAir-InputProbe/1.0' },
          signal: controller.signal,
          redirect: 'follow',
        });
        totalLatency += performance.now() - start;
        sent++;
        const body = (await res.text()).slice(0, 60000);
        if (res.status >= 500) fragile++;
        const note = probe.detect(res.status, body, probe.payload);
        if (note && !findingsMap.has(probe.type)) {
          findingsMap.set(probe.type, {
            type: probe.type,
            severity: probe.severity,
            note,
            remediation: probe.remediation,
            sample: probe.payload.slice(0, 48),
          });
        }
      } catch {
        errors++;
      } finally {
        clearTimeout(timer);
      }
    };

    // Run probes in bounded rounds, small concurrency.
    for (let r = 0; r < safeRounds; r++) {
      for (let i = 0; i < PROBES.length; i += 3) {
        await Promise.all(PROBES.slice(i, i + 3).map(runProbe));
      }
    }

    const findings = Array.from(findingsMap.values());
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as Record<string, number>;
    findings.sort((a, b) => order[a.severity] - order[b.severity]);

    const verdict =
      findings.some((f) => f.severity === 'CRITICAL')
        ? 'CRITICAL'
        : findings.some((f) => f.severity === 'HIGH')
        ? 'HIGH'
        : findings.length > 0
        ? 'LOW'
        : 'CLEAN';

    return NextResponse.json({
      success: true,
      target: base,
      summary: {
        probesSent: sent,
        networkErrors: errors,
        serverErrors: fragile,
        avgLatencyMs: sent > 0 ? Math.round(totalLatency / sent) : 0,
        vulnerabilitiesFound: findings.length,
        verdict,
      },
      findings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Probe run failed.' },
      { status: 500 }
    );
  }
}
