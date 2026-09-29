import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionDetail {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface IExamSession extends Document {
  user: mongoose.Types.ObjectId;
  exam: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  timeSpentSeconds: number;
  status: 'in_progress' | 'completed' | 'abandoned' | 'timed_out';
  startedAt: Date;
  submittedAt?: Date;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  questionIds?: string[];
  details: IQuestionDetail[];
  createdAt: Date;
  updatedAt: Date;
}

const questionDetailSchema = new Schema({
  questionId: {
    type: String,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  userAnswer: {
    type: String,
    default: '',
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  explanation: {
    type: String,
  },
});

const examSessionSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    exam: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    timeSpentSeconds: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned', 'timed_out'],
      default: 'in_progress',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    incorrectCount: {
      type: Number,
      default: 0,
    },
    unansweredCount: {
      type: Number,
      default: 0,
    },
    questionIds: [
      {
        type: String,
      },
    ],
    details: [{
      type: questionDetailSchema,
    }],
  },
  {
    timestamps: true,
  }
);

// Compound index for user query performance and analytics
examSessionSchema.index({ user: 1, status: 1, createdAt: -1 });

const ExamSession = mongoose.model<IExamSession>('ExamSession', examSessionSchema);

export default ExamSession;
