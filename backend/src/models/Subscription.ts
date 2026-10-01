import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'cancelled'
  | 'grace_period';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: mongoose.Types.ObjectId;
  planCode: string;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  paymentReference?: string;
  amountPaidNgn: number;
  autoRenew: boolean;
  remindersSent: {
    daysBefore: number; // 7, 3, 1
    sentAt: Date;
  }[];
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    planCode: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired', 'cancelled', 'grace_period'],
      default: 'active',
      index: true,
    },
    paymentReference: {
      type: String,
    },
    amountPaidNgn: {
      type: Number,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    remindersSent: [
      {
        daysBefore: Number,
        sentAt: { type: Date, default: Date.now },
      },
    ],
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });

const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export default Subscription;
