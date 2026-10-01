import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyChallengeSubmission extends Document {
  user: mongoose.Types.ObjectId;
  dailyChallenge: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  userAnswer: string;
  isCorrect: boolean;
  xpEarned: number;
  timeSpentSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const dailyChallengeSubmissionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dailyChallenge: {
      type: Schema.Types.ObjectId,
      ref: 'DailyChallenge',
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    userAnswer: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    xpEarned: {
      type: Number,
      default: 0,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate submission per user per day
dailyChallengeSubmissionSchema.index({ user: 1, date: 1 }, { unique: true });

const DailyChallengeSubmission = mongoose.model<IDailyChallengeSubmission>(
  'DailyChallengeSubmission',
  dailyChallengeSubmissionSchema
);

export default DailyChallengeSubmission;
