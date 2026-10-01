import mongoose, { Document, Schema } from 'mongoose';

export type QuizType =
  | 'daily_jamb'
  | 'subject_quiz'
  | 'topic_quiz'
  | 'revision_quiz'
  | 'weekly_mock'
  | 'personalized_quiz';

export interface IGeneratedQuiz extends Document {
  title: string;
  description: string;
  type: QuizType;
  exam: string;
  subject?: string;
  topic?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive' | 'mixed';
  questions: mongoose.Types.ObjectId[];
  durationMinutes: number;
  passPercentage: number;
  targetDate?: string; // YYYY-MM-DD for daily/weekly quizzes
  forUser?: mongoose.Types.ObjectId; // For personalized/revision quizzes
  isActive: boolean;
  totalAttempts: number;
  averageScore: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const generatedQuizSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: [
        'daily_jamb',
        'subject_quiz',
        'topic_quiz',
        'revision_quiz',
        'weekly_mock',
        'personalized_quiz',
      ],
      required: true,
      index: true,
    },
    exam: {
      type: String,
      required: true,
      default: 'JAMB',
      index: true,
    },
    subject: {
      type: String,
      index: true,
    },
    topic: {
      type: String,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'adaptive', 'mixed'],
      default: 'medium',
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true,
      },
    ],
    durationMinutes: {
      type: Number,
      default: 20,
    },
    passPercentage: {
      type: Number,
      default: 50,
    },
    targetDate: {
      type: String,
      index: true,
    },
    forUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    averageScore: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find daily/subject quizzes by date and type
generatedQuizSchema.index({ type: 1, targetDate: 1, exam: 1, subject: 1 });

const GeneratedQuiz = mongoose.model<IGeneratedQuiz>('GeneratedQuiz', generatedQuizSchema);

export default GeneratedQuiz;
