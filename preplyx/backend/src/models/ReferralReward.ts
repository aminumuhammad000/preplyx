import mongoose, { Document, Schema } from 'mongoose';

export interface IReferralReward extends Document {
  referral: mongoose.Types.ObjectId;
  recipientUser: mongoose.Types.ObjectId;
  recipientRole: 'referrer' | 'referee';
  xpAmount: number;
  cashAmountNgn: number;
  status: 'pending' | 'credited' | 'failed';
  walletTransactionId?: mongoose.Types.ObjectId;
  xpTransactionId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const referralRewardSchema = new Schema(
  {
    referral: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
      required: true,
      index: true,
    },
    recipientUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['referrer', 'referee'],
      required: true,
    },
    xpAmount: {
      type: Number,
      default: 0,
    },
    cashAmountNgn: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'credited', 'failed'],
      default: 'credited',
    },
    walletTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    xpTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'XPTransaction',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralReward = mongoose.model<IReferralReward>('ReferralReward', referralRewardSchema);

export default ReferralReward;
