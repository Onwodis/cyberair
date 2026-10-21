import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AccessCode from '@/models/AccessCode';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // FIX: Await cookies() here
    const cookieStore = await cookies();
    const token = cookieStore.get('sec_session')?.value;
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload: any = await verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }

    const { maxQueries } = await req.json();
    await connectToDatabase();

    const generatedCode =
      'PASS-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const newCode = await AccessCode.create({
      code: generatedCode,
      maxQueries: maxQueries || 25,
      remainingQueries: maxQueries || 25,
    });

    return NextResponse.json({ success: true, code: newCode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
