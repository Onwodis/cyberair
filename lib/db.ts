import mongoose from 'mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable , is =' + process.env.MONGODB_URI);
}

let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then(async (m) => {
        // Auto-seed Super Admin
        await seedAdminUser();
        return m;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

async function seedAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@meraki.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    await User.deleteOne({ email: 'admin@meraki.com' });
    console.log('Deleted existing Super Admin user (if any)');
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        email: adminEmail,
        passwordHash,
        role: 'admin',
        queryQuota: 999999,
      });
      console.log('🚀 Super Admin seeded successfully from .env');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
}
