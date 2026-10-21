import { NextResponse } from 'next/server';
import axios from 'axios';
import { connectToDatabase } from '@/lib/db';
import Transaction from '@/models/Transaction';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const amount = 5000 * 100; // Paystack expects amount in kobo (₦5,000)

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/success`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await connectToDatabase();
    await Transaction.create({
      reference: response.data.data.reference,
      email,
      amount: 5000,
      status: 'pending',
    });

    return NextResponse.json({
      authorization_url: response.data.data.authorization_url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.message || error.message },
      { status: 500 }
    );
  }
}
