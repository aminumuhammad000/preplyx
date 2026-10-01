import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  code: string; // e.g. 'monthly_pro', 'quarterly_pro', 'annual_pro'
  description: string;
  priceNgn: number;
  durationDays: number;
  features: string[];
  examType?: string; // 'ALL' or specific exam like 'JAMB'
  isActive: boolean;
  isPopular?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    priceNgn: {
      type: Number,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
      default: 30,
    },
    features: [{ type: String }],
    examType: {
      type: String,
      default: 'ALL',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  subscriptionPlanSchema
);

export default SubscriptionPlan;
