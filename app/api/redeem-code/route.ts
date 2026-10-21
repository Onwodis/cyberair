import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AccessCode from '@/models/AccessCode';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
    }

    const trimmedCode = code.trim();
    const defaultBypass =
      process.env.DEFAULT_BYPASS_CODE || 'SUPER-BYPASS-2026';

    // 1. Check if input matches default env bypass code
    if (trimmedCode === defaultBypass) {
      return NextResponse.json({
        success: true,
        queriesGranted: 50,
        message: 'Master bypass code accepted! 50 scans granted.',
      });
    }

    // 2. Otherwise check database access passes
    await connectToDatabase();
    const accessPass = await AccessCode.findOne({
      code: trimmedCode,
      isUsed: false,
    });

    if (!accessPass) {
      return NextResponse.json(
        { error: 'Invalid or expired access pass code.' },
        { status: 400 }
      );
    }

    // Mark single-use pass as used
    accessPass.isUsed = true;
    await accessPass.save();

    return NextResponse.json({
      success: true,
      queriesGranted: accessPass.maxQueries || 25,
      message: `Pass redeemed! ${accessPass.maxQueries || 25} scans granted.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to redeem code.' },
      { status: 500 }
    );
  }
}
