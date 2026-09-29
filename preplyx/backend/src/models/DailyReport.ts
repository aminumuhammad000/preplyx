import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyReport extends Document {
  date: string; // YYYY-MM-DD
  newUsersCount: number;
  activeUsersCount: number;
  questionsAttemptedCount: number;
  quizzesCompletedCount: number;
  averageScorePercentage: number;
  mostPopularSubject: string;
  weakestTopic: string;
  competitionParticipantsCount: number;
  subscriptionsCount: number;
  revenueNgn: number;
  failedPaymentsCount: number;
  summary: Record<string, any>;
  createdAt: Date;
}

const dailyReportSchema = new Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    newUsersCount: { type: Number, default: 0 },
    activeUsersCount: { type: Number, default: 0 },
    questionsAttemptedCount: { type: Number, default: 0 },
    quizzesCompletedCount: { type: Number, default: 0 },
    averageScorePercentage: { type: Number, default: 0 },
    mostPopularSubject: { type: String, default: 'Mathematics' },
    weakestTopic: { type: String, default: 'General' },
    competitionParticipantsCount: { type: Number, default: 0 },
    subscriptionsCount: { type: Number, default: 0 },
    revenueNgn: { type: Number, default: 0 },
    failedPaymentsCount: { type: Number, default: 0 },
    summary: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const DailyReport = mongoose.model<IDailyReport>('DailyReport', dailyReportSchema);

export default DailyReport;
