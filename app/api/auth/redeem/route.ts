import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AccessCode from '@/models/AccessCode';
import { signToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const { code, deviceId } = await req.json();
    await connectToDatabase();

    const accessCode = await AccessCode.findOne({ code });

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Invalid activation code' },
        { status: 400 }
      );
    }

    if (accessCode.remainingQueries <= 0) {
      return NextResponse.json(
        { error: 'Code usage limit exhausted' },
        { status: 400 }
      );
    }

    // Lock code to first device that redeems it
    if (!accessCode.boundDeviceId) {
      accessCode.boundDeviceId = deviceId;
      accessCode.isRedeemed = true;
      await accessCode.save();
    } else if (accessCode.boundDeviceId !== deviceId) {
      return NextResponse.json(
        { error: 'Code is locked to another device' },
        { status: 403 }
      );
    }

    const token = await signToken({
      type: 'code',
      codeId: accessCode._id,
      deviceId: accessCode.boundDeviceId,
    });

    const response = NextResponse.json({
      success: true,
      remaining: accessCode.remainingQueries,
    });
    response.cookies.set('sec_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
