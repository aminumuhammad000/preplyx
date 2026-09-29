import mongoose, { Document, Schema } from 'mongoose';

export interface IUserOnboarding extends Document {
  user: mongoose.Types.ObjectId;
  completedSteps: string[]; // 'profile_created', 'first_quiz_started', 'first_quiz_completed', 'wallet_viewed'
  isCompleted: boolean;
  remindersSent: {
    hourMark: number; // 24, 72, 168
    sentAt: Date;
  }[];
  recommendedFirstQuizId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const userOnboardingSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    completedSteps: [{ type: String }],
    isCompleted: {
      type: Boolean,
      default: false,
    },
    remindersSent: [
      {
        hourMark: Number,
        sentAt: { type: Date, default: Date.now },
      },
    ],
    recommendedFirstQuizId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedQuiz',
    },
  },
  {
    timestamps: true,
  }
);

const UserOnboarding = mongoose.model<IUserOnboarding>('UserOnboarding', userOnboardingSchema);

export default UserOnboarding;
