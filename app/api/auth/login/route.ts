import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    await connectToDatabase();

    let admin = await User.findOne({ email });

    // Seed default admin if none exists
    if (!admin && email === process.env.ADMIN_EMAIL) {
      const passwordHash = await bcrypt.hash(password, 10);
      admin = await User.create({
        email,
        passwordHash,
        role: 'admin',
        queryQuota: 999999,
      });
    }

    if (!admin || !admin.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch || admin.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const token = await signToken({
      userId: admin._id,
      role: 'admin',
      email: admin.email,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Admin authenticated',
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
