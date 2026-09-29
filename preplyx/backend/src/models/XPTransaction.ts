import mongoose, { Document, Schema } from 'mongoose';

export type XPSourceType =
  | 'question_answered'
  | 'quiz_completed'
  | 'perfect_quiz'
  | 'daily_challenge'
  | 'streak_milestone'
  | 'achievement_unlocked'
  | 'competition_reward'
  | 'referral_bonus'
  | 'admin_adjustment'
  | 'welcome_bonus';

export interface IXPTransaction extends Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  sourceType: XPSourceType;
  sourceId?: string; // session id, achievement id, challenge id, etc.
  reason: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const xpTransactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    sourceType: {
      type: String,
      required: true,
      index: true,
    },
    sourceId: {
      type: String,
    },
    reason: {
      type: String,
      required: true,
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

xpTransactionSchema.index({ user: 1, createdAt: -1 });

const XPTransaction = mongoose.model<IXPTransaction>('XPTransaction', xpTransactionSchema);

export default XPTransaction;
