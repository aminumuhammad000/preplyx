import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  eventName: string; // e.g. 'QUIZ_COMPLETED', 'USER_REGISTERED', 'STREAK_UPDATED'
  user?: mongoose.Types.ObjectId;
  sessionId?: string;
  payload: Record<string, any>;
  clientIp?: string;
  userAgent?: string;
  createdAt: Date;
}

const analyticsEventSchema = new Schema(
  {
    eventName: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    clientIp: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

analyticsEventSchema.index({ eventName: 1, createdAt: -1 });

const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
