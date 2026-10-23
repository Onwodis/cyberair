import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import QueryLog from '@/models/QueryLog';
import Transaction from '@/models/Transaction';
import { connection } from 'next/server';

export async function GET() {
  await connection();
  await connectToDatabase();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [queriesToday, queriesMonth, queriesYear, transactions] =
    await Promise.all([
      QueryLog.countDocuments({ timestamp: { $gte: startOfDay } }),
      QueryLog.countDocuments({ timestamp: { $gte: startOfMonth } }),
      QueryLog.countDocuments({ timestamp: { $gte: startOfYear } }),
      Transaction.find().sort({ createdAt: -1 }).limit(20),
    ]);

  return NextResponse.json({
    analytics: {
      day: queriesToday,
      month: queriesMonth,
      year: queriesYear,
    },
    transactions,
  });
}
