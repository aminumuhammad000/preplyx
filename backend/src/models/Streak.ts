import mongoose, { Document, Schema } from 'mongoose';

export interface IStreak extends Document {
  user: mongoose.Types.ObjectId;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string; // YYYY-MM-DD in Africa/Lagos
  streakHistory: {
    date: string; // YYYY-MM-DD
    activityType: string; // 'exam_session', 'daily_challenge', 'quiz'
    questionsCount: number;
  }[];
  freezeDaysLeft: number;
  atRiskNotifiedDate?: string; // YYYY-MM-DD of last risk reminder
  createdAt: Date;
  updatedAt: Date;
}

const streakSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    currentStreak: {
      type: Number,
      default: 0,
      index: true,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastActivityDate: {
      type: String,
      default: '',
    },
    streakHistory: [
      {
        date: { type: String, required: true },
        activityType: { type: String, default: 'quiz' },
        questionsCount: { type: Number, default: 1 },
      },
    ],
    freezeDaysLeft: {
      type: Number,
      default: 1,
    },
    atRiskNotifiedDate: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Streak = mongoose.model<IStreak>('Streak', streakSchema);

export default Streak;
