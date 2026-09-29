import mongoose, { Document, Schema } from 'mongoose';

export interface IBroadcastNotification extends Document {
  title: string;
  message: string;
  type: string;
  targetAudience: string;
  targetEmail?: string;
  createdAt: Date;
}

const broadcastNotificationSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'promo', 'achievement'],
      default: 'info',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'active', 'suspended', 'specific'],
      default: 'all',
    },
    targetEmail: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const BroadcastNotification = mongoose.model<IBroadcastNotification>('BroadcastNotification', broadcastNotificationSchema);

export default BroadcastNotification;
