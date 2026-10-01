import mongoose, { Document, Schema } from 'mongoose';

export interface IAdaptiveSubjectLevel {
  subject: string;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  consecutiveSuccessCount: number;
  consecutiveFailureCount: number;
  recentAccuracies: number[]; // rolling window of percentages
  lastAdjustedAt: Date;
}

export interface IAdaptiveProfile extends Document {
  user: mongoose.Types.ObjectId;
  exam: string;
  globalDifficulty: 'easy' | 'medium' | 'hard';
  subjectLevels: IAdaptiveSubjectLevel[];
  createdAt: Date;
  updatedAt: Date;
}

const adaptiveSubjectLevelSchema = new Schema(
  {
    subject: {
      type: String,
      required: true,
    },
    currentDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    consecutiveSuccessCount: {
      type: Number,
      default: 0,
    },
    consecutiveFailureCount: {
      type: Number,
      default: 0,
    },
    recentAccuracies: [
      {
        type: Number,
      },
    ],
    lastAdjustedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const adaptiveProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    exam: {
      type: String,
      required: true,
      default: 'JAMB',
    },
    globalDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    subjectLevels: [adaptiveSubjectLevelSchema],
  },
  {
    timestamps: true,
  }
);

const AdaptiveProfile = mongoose.model<IAdaptiveProfile>('AdaptiveProfile', adaptiveProfileSchema);

export default AdaptiveProfile;
