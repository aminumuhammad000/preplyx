import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetitionAnswerItem {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface ICompetitionSubmission extends Document {
  competition: mongoose.Types.ObjectId;
  participant: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  answers: ICompetitionAnswerItem[];
  score: number;
  totalQuestions: number;
  percentage: number;
  totalTimeSpentSeconds: number;
  clientIp?: string;
  userAgent?: string;
  serverStartTime: Date;
  serverSubmitTime: Date;
  antiCheatMetrics: {
    averageTimePerQuestion: number;
    suspiciouslyFastCount: number;
    focusLostCount: number;
    multipleIpDetected: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const competitionSubmissionSchema = new Schema(
  {
    competition: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    participant: {
      type: Schema.Types.ObjectId,
      ref: 'CompetitionParticipant',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    answers: [
      {
        questionId: { type: String, required: true },
        userAnswer: { type: String, required: true },
        correctAnswer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        timeSpentSeconds: { type: Number, default: 0 },
      },
    ],
    score: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    totalTimeSpentSeconds: {
      type: Number,
      required: true,
    },
    clientIp: { type: String },
    userAgent: { type: String },
    serverStartTime: { type: Date, required: true },
    serverSubmitTime: { type: Date, required: true },
    antiCheatMetrics: {
      averageTimePerQuestion: { type: Number, default: 0 },
      suspiciouslyFastCount: { type: Number, default: 0 },
      focusLostCount: { type: Number, default: 0 },
      multipleIpDetected: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

competitionSubmissionSchema.index({ competition: 1, user: 1 }, { unique: true });

const CompetitionSubmission = mongoose.model<ICompetitionSubmission>(
  'CompetitionSubmission',
  competitionSubmissionSchema
);

export default CompetitionSubmission;
