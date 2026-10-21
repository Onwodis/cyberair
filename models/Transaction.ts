import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  reference: string;
  email: string;
  amount: number;
  status: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  reference: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
