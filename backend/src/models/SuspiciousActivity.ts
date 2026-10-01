import mongoose, { Document, Schema } from 'mongoose';

export type SuspiciousActivityType =
  | 'impossible_speed'
  | 'rapid_answering'
  | 'concurrent_sessions'
  | 'suspicious_ip_switch'
  | 'bot_pattern'
  | 'referral_fraud'
  | 'api_rate_abuse'
  | 'failed_login_spike';

export type ActivitySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ISuspiciousActivity extends Document {
  user?: mongoose.Types.ObjectId;
  type: SuspiciousActivityType;
  severity: ActivitySeverity;
  source: 'competition' | 'quiz' | 'auth' | 'referral' | 'api';
  referenceId?: string; // competition ID, session ID, user ID
  details: Record<string, any>;
  clientIp?: string;
  userAgent?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  adminNotes?: string;
  actionTaken?: 'none' | 'warning_sent' | 'score_invalidated' | 'user_suspended';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const suspiciousActivitySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    source: {
      type: String,
      enum: ['competition', 'quiz', 'auth', 'referral', 'api'],
      required: true,
    },
    referenceId: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    clientIp: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'dismissed', 'action_taken'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warning_sent', 'score_invalidated', 'user_suspended'],
      default: 'none',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const SuspiciousActivity = mongoose.model<ISuspiciousActivity>(
  'SuspiciousActivity',
  suspiciousActivitySchema
);

export default SuspiciousActivity;
