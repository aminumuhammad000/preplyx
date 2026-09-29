import mongoose, { Document, Schema } from 'mongoose';

export type MasteryLevel = 'weak' | 'average' | 'strong';

export interface IStudentTopicPerformance extends Document {
  user: mongoose.Types.ObjectId;
  exam: string;
  subject: string;
  topic: string;
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number; // percentage
  masteryLevel: MasteryLevel;
  easyAccuracy: number;
  mediumAccuracy: number;
  hardAccuracy: number;
  lastPracticedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentTopicPerformanceSchema = new Schema(
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
      default: 'JAMB',
    },
    subject: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalCorrect: {
      type: Number,
      default: 0,
    },
    totalIncorrect: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
      index: true,
    },
    masteryLevel: {
      type: String,
      enum: ['weak', 'average', 'strong'],
      default: 'average',
      index: true,
    },
    easyAccuracy: {
      type: Number,
      default: 0,
    },
    mediumAccuracy: {
      type: Number,
      default: 0,
    },
    hardAccuracy: {
      type: Number,
      default: 0,
    },
    lastPracticedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

studentTopicPerformanceSchema.index({ user: 1, exam: 1, subject: 1, topic: 1 }, { unique: true });
studentTopicPerformanceSchema.index({ user: 1, masteryLevel: 1 });

const StudentTopicPerformance = mongoose.model<IStudentTopicPerformance>(
  'StudentTopicPerformance',
  studentTopicPerformanceSchema
);

export default StudentTopicPerformance;
