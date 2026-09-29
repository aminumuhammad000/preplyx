import mongoose, { Document, Schema } from 'mongoose';

export interface IMistakeLog extends Document {
  user: mongoose.Types.ObjectId;
  exam: string;
  subject: string;
  topic: string;
  subtopic?: string;
  questionId: string;
  questionText: string;
  options: string[];
  selectedAnswer: string;
  correctAnswer: string;
  confidence?: 'very_sure' | 'somewhat_sure' | 'guessing';
  cognitiveTrap?: string; // Why the distractor was tempting / student misconception
  conceptSummary?: string; // Core theoretical concept
  difficulty?: 'easy' | 'medium' | 'hard';
  timeSpentSeconds?: number;
  attemptsCount: number;
  reviewStage: number; // 0, 1, 3, 7, 14 (spaced repetition days)
  nextReviewDate: Date;
  mastered: boolean;
  lastAttemptDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const mistakeLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    exam: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      default: 'General',
      index: true,
    },
    subtopic: {
      type: String,
      default: '',
    },
    questionId: {
      type: String,
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    options: [{ type: String }],
    selectedAnswer: {
      type: String,
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    confidence: {
      type: String,
      enum: ['very_sure', 'somewhat_sure', 'guessing', 'high', 'medium', 'low'],
      default: 'somewhat_sure',
    },
    cognitiveTrap: {
      type: String,
      default: '',
    },
    conceptSummary: {
      type: String,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    attemptsCount: {
      type: Number,
      default: 1,
    },
    reviewStage: {
      type: Number,
      default: 0, // 0 = initial mistake, 1 = 1 day, 3 = 3 days, 7 = 7 days, 14 = 14 days
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    mastered: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastAttemptDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user query efficiency
mistakeLogSchema.index({ user: 1, exam: 1, subject: 1, mastered: 1, nextReviewDate: 1 });

const MistakeLog = mongoose.model<IMistakeLog>('MistakeLog', mistakeLogSchema);

export default MistakeLog;
