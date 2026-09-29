import mongoose, { Document, Schema } from 'mongoose';

export type NotificationChannel = 'in_app' | 'email' | 'push';
export type NotificationEventType =
  | 'WELCOME'
  | 'DAILY_CHALLENGE'
  | 'QUIZ_COMPLETED'
  | 'STREAK'
  | 'STREAK_AT_RISK'
  | 'ACHIEVEMENT'
  | 'COMPETITION_START'
  | 'COMPETITION_RESULT'
  | 'SUBSCRIPTION_EXPIRING'
  | 'SUBSCRIPTION_EXPIRED'
  | 'REFERRAL_REWARD'
  | 'STUDY_RECOMMENDATION'
  | 'INACTIVE_REMINDER'
  | 'SECURITY_ALERT';

export interface INotificationLog extends Document {
  user: mongoose.Types.ObjectId;
  eventType: NotificationEventType;
  deduplicationKey: string; // e.g. "DAILY_CHALLENGE:user123:2026-08-14"
  title: string;
  message: string;
  channels: NotificationChannel[];
  emailStatus?: 'sent' | 'failed' | 'skipped';
  pushStatus?: 'sent' | 'failed' | 'skipped';
  inAppStatus: 'saved' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
}

const notificationLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    deduplicationKey: {
      type: String,
      required: true,
      unique: true, // Idempotency: Prevents duplicate notifications
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    channels: [
      {
        type: String,
        enum: ['in_app', 'email', 'push'],
      },
    ],
    emailStatus: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
    },
    pushStatus: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
    },
    inAppStatus: {
      type: String,
      enum: ['saved', 'failed'],
      default: 'saved',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const NotificationLog = mongoose.model<INotificationLog>('NotificationLog', notificationLogSchema);

export default NotificationLog;
