import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyChallenge extends Document {
  date: string; // Format: YYYY-MM-DD
  question: mongoose.Types.ObjectId;
  exam: string;
  subject: string;
  topic: string;
  xpReward: number;
  participantsCount: number;
  correctAnswersCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dailyChallengeSchema = new Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true, // Idempotency: One challenge per calendar day
      index: true,
    },
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    exam: {
      type: String,
      required: true,
      default: 'JAMB',
    },
    subject: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      default: 'General',
    },
    xpReward: {
      type: Number,
      default: 20,
    },
    participantsCount: {
      type: Number,
      default: 0,
    },
    correctAnswersCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const DailyChallenge = mongoose.model<IDailyChallenge>('DailyChallenge', dailyChallengeSchema);

export default DailyChallenge;
