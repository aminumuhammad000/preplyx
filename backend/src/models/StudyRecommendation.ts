import mongoose, { Document, Schema } from 'mongoose';

export interface IRecommendedQuizItem {
  quizId?: mongoose.Types.ObjectId;
  title: string;
  subject: string;
  topic: string;
  targetDifficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  reason: string;
}

export interface IStudyRecommendation extends Document {
  user: mongoose.Types.ObjectId;
  exam: string;
  weakTopics: {
    subject: string;
    topic: string;
    accuracy: number;
    recommendedPracticeCount: number;
  }[];
  recommendedQuizzes: IRecommendedQuizItem[];
  recommendedSubjects: {
    subject: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  studyStreakGoal: number;
  dailyTargetQuestions: number;
  aiStudyNotes?: string;
  lastGeneratedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studyRecommendationSchema = new Schema(
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
    weakTopics: [
      {
        subject: String,
        topic: String,
        accuracy: Number,
        recommendedPracticeCount: { type: Number, default: 15 },
      },
    ],
    recommendedQuizzes: [
      {
        quizId: { type: Schema.Types.ObjectId, ref: 'GeneratedQuiz' },
        title: String,
        subject: String,
        topic: String,
        targetDifficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
          default: 'medium',
        },
        questionCount: { type: Number, default: 15 },
        reason: String,
      },
    ],
    recommendedSubjects: [
      {
        subject: String,
        reason: String,
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
      },
    ],
    studyStreakGoal: {
      type: Number,
      default: 7,
    },
    dailyTargetQuestions: {
      type: Number,
      default: 30,
    },
    aiStudyNotes: {
      type: String,
    },
    lastGeneratedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const StudyRecommendation = mongoose.model<IStudyRecommendation>(
  'StudyRecommendation',
  studyRecommendationSchema
);

export default StudyRecommendation;
