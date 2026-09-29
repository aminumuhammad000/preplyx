import mongoose, { Document, Schema } from 'mongoose';

export interface IWeeklyReport extends Document {
  weekIdentifier: string; // e.g. "2026-W32"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  userGrowthPercentage: number;
  totalNewUsers: number;
  activeUsersWeekly: number;
  retentionRatePercentage: number;
  engagementRatePercentage: number;
  subjectPerformance: {
    subject: string;
    averageScore: number;
    totalAttempts: number;
  }[];
  topicPerformance: {
    topic: string;
    subject: string;
    averageScore: number;
    totalAttempts: number;
  }[];
  competitionSummary: {
    totalCompetitions: number;
    totalParticipants: number;
    totalPrizesDistributedNgn: number;
  };
  totalRevenueNgn: number;
  summary: Record<string, any>;
  createdAt: Date;
}

const weeklyReportSchema = new Schema(
  {
    weekIdentifier: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    userGrowthPercentage: { type: Number, default: 0 },
    totalNewUsers: { type: Number, default: 0 },
    activeUsersWeekly: { type: Number, default: 0 },
    retentionRatePercentage: { type: Number, default: 0 },
    engagementRatePercentage: { type: Number, default: 0 },
    subjectPerformance: [
      {
        subject: String,
        averageScore: Number,
        totalAttempts: Number,
      },
    ],
    topicPerformance: [
      {
        topic: String,
        subject: String,
        averageScore: Number,
        totalAttempts: Number,
      },
    ],
    competitionSummary: {
      totalCompetitions: { type: Number, default: 0 },
      totalParticipants: { type: Number, default: 0 },
      totalPrizesDistributedNgn: { type: Number, default: 0 },
    },
    totalRevenueNgn: { type: Number, default: 0 },
    summary: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const WeeklyReport = mongoose.model<IWeeklyReport>('WeeklyReport', weeklyReportSchema);

export default WeeklyReport;
