import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentSubjectPerformance extends Document {
  user: mongoose.Types.ObjectId;
  exam: string;
  subject: string;
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number; // percentage 0-100
  averageScore: number;
  averageTimePerQuestionSeconds: number;
  recentAccuracy: number; // accuracy over last 5-10 sessions
  recentScores: number[]; // rolling array of last 10 scores
  lastPracticedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentSubjectPerformanceSchema = new Schema(
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
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    averageTimePerQuestionSeconds: {
      type: Number,
      default: 0,
    },
    recentAccuracy: {
      type: Number,
      default: 0,
    },
    recentScores: [
      {
        type: Number,
      },
    ],
    lastPracticedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

studentSubjectPerformanceSchema.index({ user: 1, exam: 1, subject: 1 }, { unique: true });

const StudentSubjectPerformance = mongoose.model<IStudentSubjectPerformance>(
  'StudentSubjectPerformance',
  studentSubjectPerformanceSchema
);

export default StudentSubjectPerformance;
