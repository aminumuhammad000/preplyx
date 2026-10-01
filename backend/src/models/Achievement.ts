import mongoose, { Document, Schema } from 'mongoose';

export type AchievementMetric =
  | 'sessions_completed'
  | 'questions_answered'
  | 'perfect_scores'
  | 'streak_days'
  | 'subject_mastery'
  | 'leaderboard_rank'
  | 'speed_minutes'
  | 'competition_won'
  | 'referrals_count';

export interface IAchievement extends Document {
  code: string; // e.g. 'first_quiz', 'questions_100', 'streak_7'
  name: string;
  description: string;
  category: 'practice' | 'streak' | 'mastery' | 'competition' | 'social';
  icon: string;
  color: string;
  xpReward: number;
  metric: AchievementMetric;
  targetValue: number;
  subject?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const achievementSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['practice', 'streak', 'mastery', 'competition', 'social'],
      default: 'practice',
    },
    icon: {
      type: String,
      default: 'Sparkles',
    },
    color: {
      type: String,
      default: '#7B2FF7',
    },
    xpReward: {
      type: Number,
      default: 100,
    },
    metric: {
      type: String,
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    subject: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Achievement = mongoose.model<IAchievement>('Achievement', achievementSchema);

export default Achievement;
