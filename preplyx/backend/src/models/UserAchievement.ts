import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAchievement extends Document {
  user: mongoose.Types.ObjectId;
  achievement: mongoose.Types.ObjectId;
  achievementCode: string;
  progress: number; // 0 - 100
  unlocked: boolean;
  unlockedAt?: Date;
  xpAwarded: number;
  createdAt: Date;
  updatedAt: Date;
}

const userAchievementSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    achievement: {
      type: Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true,
    },
    achievementCode: {
      type: String,
      required: true,
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
    },
    unlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    unlockedAt: {
      type: Date,
    },
    xpAwarded: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });
userAchievementSchema.index({ user: 1, achievementCode: 1 }, { unique: true });

const UserAchievement = mongoose.model<IUserAchievement>(
  'UserAchievement',
  userAchievementSchema
);

export default UserAchievement;
