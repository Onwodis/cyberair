import mongoose, { Schema, Document } from 'mongoose';

export interface IQueryLog extends Document {
  url: string;
  userId?: string;
  deviceId?: string;
  timestamp: Date;
}

const QueryLogSchema = new Schema<IQueryLog>({
  url: { type: String, required: true },
  userId: { type: String },
  deviceId: { type: String },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.QueryLog ||
  mongoose.model<IQueryLog>('QueryLog', QueryLogSchema);
