import mongoose, { Document, Schema } from 'mongoose';

export interface IInactiveUserLog extends Document {
  user: mongoose.Types.ObjectId;
  lastActiveDate: Date;
  daysInactive: number;
  milestoneTriggered: number; // 3, 7, 14, 30
  messageSent: string;
  channel: 'email' | 'in_app';
  status: 'delivered' | 'failed';
  reEngaged: boolean;
  reEngagedAt?: Date;
  createdAt: Date;
}

const inactiveUserLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastActiveDate: {
      type: Date,
      required: true,
    },
    daysInactive: {
      type: Number,
      required: true,
    },
    milestoneTriggered: {
      type: Number,
      required: true,
    },
    messageSent: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'in_app'],
      default: 'email',
    },
    status: {
      type: String,
      enum: ['delivered', 'failed'],
      default: 'delivered',
    },
    reEngaged: {
      type: Boolean,
      default: false,
    },
    reEngagedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent duplicate messages for same user and milestone within 30 days
inactiveUserLogSchema.index({ user: 1, milestoneTriggered: 1, createdAt: -1 });

const InactiveUserLog = mongoose.model<IInactiveUserLog>('InactiveUserLog', inactiveUserLogSchema);

export default InactiveUserLog;
