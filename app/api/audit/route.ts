import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import QueryLog from '@/models/QueryLog';
import { validateAndSanitizeUrl } from '@/lib/validateUrl';
import { checkRateLimit } from '@/lib/rateLimit';
import { analyzeTarget } from '@/lib/securityAnalyzer';

export const maxDuration = 20;

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
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

    const auditData = await analyzeTarget(sanitizedUrl);
    return NextResponse.json(auditData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Audit execution failed.' },
      { status: 500 }
    );
  }
}
