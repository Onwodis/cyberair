import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { validateAndSanitizeUrl } from '@/lib/validateUrl';
import { analyzeTarget } from '@/lib/securityAnalyzer';

export const maxDuration = 30;

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-change-this'
);

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sec_session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { urlA, urlB } = await req.json();
    const cleanA = validateAndSanitizeUrl(urlA);
    const cleanB = urlB ? validateAndSanitizeUrl(urlB) : null;

    if (!cleanA) {
      return NextResponse.json(
        { error: 'Invalid or restricted Target URL A.' },
        { status: 400 }
      );
    }
    if (urlB && !cleanB) {
      return NextResponse.json(
        { error: 'Invalid or restricted Target URL B.' },
        { status: 400 }
      );
    }

    const [targetA, targetB] = await Promise.all([
      analyzeTarget(cleanA).catch((e) => ({ error: e.message, url: cleanA })),
      cleanB
        ? analyzeTarget(cleanB).catch((e) => ({ error: e.message, url: cleanB }))
        : Promise.resolve(null),
    ]);

    return NextResponse.json({ success: true, targetA, targetB });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Comparative audit failed.' },
      { status: 500 }
    );
  }
}
