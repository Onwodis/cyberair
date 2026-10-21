import mongoose, { Schema, Document } from 'mongoose';

export interface IAccessCode extends Document {
  code: string;
  maxQueries: number;
  remainingQueries: number;
  boundDeviceId?: string;
  isRedeemed: boolean;
  createdAt: Date;
}

const AccessCodeSchema = new Schema<IAccessCode>({
  code: { type: String, required: true, unique: true },
  maxQueries: { type: Number, required: true },
  remainingQueries: { type: Number, required: true },
  boundDeviceId: { type: String, default: null },
  isRedeemed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.AccessCode ||
  mongoose.model<IAccessCode>('AccessCode', AccessCodeSchema);
