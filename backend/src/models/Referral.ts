import mongoose, { Document, Schema } from 'mongoose';

export type ReferralStatus = 'pending' | 'qualified' | 'rewarded' | 'rejected';

export interface IReferral extends Document {
  referrer: mongoose.Types.ObjectId;
  referee: mongoose.Types.ObjectId;
  referralCode: string;
  status: ReferralStatus;
  qualifiedAt?: Date;
  qualificationCriteriaMet?: string; // e.g. 'first_exam_completed', 'wallet_funded'
  rewardProcessed: boolean;
  rewardProcessedAt?: Date;
  clientIp?: string;
  userAgent?: string;
  isFlaggedAsFraud: boolean;
  fraudReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One user can only be referred once
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'qualified', 'rewarded', 'rejected'],
      default: 'pending',
      index: true,
    },
    qualifiedAt: {
      type: Date,
    },
    qualificationCriteriaMet: {
      type: String,
    },
    rewardProcessed: {
      type: Boolean,
      default: false,
    },
    rewardProcessedAt: {
      type: Date,
    },
    clientIp: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    isFlaggedAsFraud: {
      type: Boolean,
      default: false,
    },
    fraudReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Referral = mongoose.model<IReferral>('Referral', referralSchema);

export default Referral;
