import mongoose from 'mongoose';
import DailyReport, { IDailyReport } from '../models/DailyReport';
import WeeklyReport, { IWeeklyReport } from '../models/WeeklyReport';
import User from '../models/User';
import ExamSession from '../models/ExamSession';
import Transaction from '../models/Transaction';
import CompetitionParticipant from '../models/CompetitionParticipant';
import Subscription from '../models/Subscription';
import StudentTopicPerformance from '../models/StudentTopicPerformance';
import { StreakService } from './streakService';

export class AnalyticsReportService {
  /**
   * Generates and stores daily admin summary report for a given date
   */
  public static async generateDailyReport(targetDate?: string): Promise<IDailyReport> {
    const dateStr = targetDate || StreakService.getLagosDateString();

    const startOfDay = new Date(`${dateStr}T00:00:00Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // Run parallel metric queries
    const [
      newUsersCount,
      activeUserIds,
      sessionStats,
      subjectStats,
      weakestTopicRecord,
      competitionParticipantsCount,
      subscriptionsCount,
      revenueAggr,
      failedPaymentsCount,
    ] = await Promise.all([
      // 1. New users created today
      User.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),

      // 2. Unique active users with sessions today
      ExamSession.distinct('user', { createdAt: { $gte: startOfDay, $lte: endOfDay } }),

      // 3. Quizzes completed, questions attempted, avg score
      ExamSession.aggregate([
        { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
        {
          $group: {
            _id: null,
            totalQuizzes: { $sum: 1 },
            totalQuestions: { $sum: '$total' },
            avgScore: { $avg: '$percentage' },
          },
        },
      ]),

      // 4. Most popular subject today
      ExamSession.aggregate([
        { $match: { createdAt: { $gte: startOfDay, $lte: endOfDay } } },
        { $group: { _id: '$subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),

      // 5. Weakest topic today
      StudentTopicPerformance.findOne({ masteryLevel: 'weak' })
        .sort({ accuracy: 1 })
        .select('topic subject accuracy'),

      // 6. Competition participants today
      CompetitionParticipant.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),

      // 7. New subscriptions today
      Subscription.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),

      // 8. Total funding revenue today
      Transaction.aggregate([
        { $match: { type: 'funding', status: 'completed', createdAt: { $gte: startOfDay, $lte: endOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // 9. Failed transactions today
      Transaction.countDocuments({ status: 'failed', createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    ]);

    const questionsAttemptedCount = sessionStats[0]?.totalQuestions || 0;
    const quizzesCompletedCount = sessionStats[0]?.totalQuizzes || 0;
    const averageScorePercentage = Math.round(sessionStats[0]?.avgScore || 0);
    const mostPopularSubject = subjectStats[0]?._id || 'Mathematics';
    const weakestTopic = weakestTopicRecord ? `${weakestTopicRecord.topic} (${weakestTopicRecord.subject})` : 'General';
    const revenueNgn = revenueAggr[0]?.total || 0;

    let report = await DailyReport.findOne({ date: dateStr });
    if (!report) {
      report = new DailyReport({ date: dateStr });
    }

    report.newUsersCount = newUsersCount;
    report.activeUsersCount = activeUserIds.length;
    report.questionsAttemptedCount = questionsAttemptedCount;
    report.quizzesCompletedCount = quizzesCompletedCount;
    report.averageScorePercentage = averageScorePercentage;
    report.mostPopularSubject = mostPopularSubject;
    report.weakestTopic = weakestTopic;
    report.competitionParticipantsCount = competitionParticipantsCount;
    report.subscriptionsCount = subscriptionsCount;
    report.revenueNgn = revenueNgn;
    report.failedPaymentsCount = failedPaymentsCount;
    report.summary = {
      activeRatio: newUsersCount > 0 ? Math.round((activeUserIds.length / newUsersCount) * 100) : 0,
      generatedAt: new Date(),
    };

    await report.save();
    console.log(`[Analytics Report] Aggregated Daily Report for ${dateStr}: ${quizzesCompletedCount} quizzes, ₦${revenueNgn} revenue.`);
    return report;
  }

  /**
   * Generates and stores weekly summary report
   */
  public static async generateWeeklyReport(): Promise<IWeeklyReport> {
    const now = new Date();
    const endStr = StreakService.getLagosDateString(now);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const startStr = StreakService.getLagosDateString(sevenDaysAgo);
    const weekIdentifier = `WEEK-${startStr}_${endStr}`;

    const [
      totalNewUsers,
      activeUsersWeeklyList,
      totalUsersCount,
      subjectPerfAggr,
      revenueAggr,
      compCount,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo, $lte: now } }),
      ExamSession.distinct('user', { createdAt: { $gte: sevenDaysAgo, $lte: now } }),
      User.countDocuments(),
      ExamSession.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo, $lte: now } } },
        {
          $group: {
            _id: '$subject',
            averageScore: { $avg: '$percentage' },
            totalAttempts: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { type: 'funding', status: 'completed', createdAt: { $gte: sevenDaysAgo, $lte: now } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CompetitionParticipant.countDocuments({ createdAt: { $gte: sevenDaysAgo, $lte: now } }),
    ]);

    const activeUsersWeekly = activeUsersWeeklyList.length;
    const userGrowthPercentage = totalUsersCount > 0 ? Math.round((totalNewUsers / totalUsersCount) * 100) : 0;
    const engagementRatePercentage = totalUsersCount > 0 ? Math.round((activeUsersWeekly / totalUsersCount) * 100) : 0;
    const totalRevenueNgn = revenueAggr[0]?.total || 0;

    let report = await WeeklyReport.findOne({ weekIdentifier });
    if (!report) {
      report = new WeeklyReport({ weekIdentifier });
    }

    report.startDate = startStr;
    report.endDate = endStr;
    report.userGrowthPercentage = userGrowthPercentage;
    report.totalNewUsers = totalNewUsers;
    report.activeUsersWeekly = activeUsersWeekly;
    report.retentionRatePercentage = engagementRatePercentage;
    report.engagementRatePercentage = engagementRatePercentage;
    report.subjectPerformance = subjectPerfAggr.map((s) => ({
      subject: s._id || 'General',
      averageScore: Math.round(s.averageScore || 0),
      totalAttempts: s.totalAttempts,
    }));
    report.topicPerformance = [];
    report.competitionSummary = {
      totalCompetitions: 1,
      totalParticipants: compCount,
      totalPrizesDistributedNgn: 0,
    };
    report.totalRevenueNgn = totalRevenueNgn;

    await report.save();
    console.log(`[Analytics Report] Aggregated Weekly Report ${weekIdentifier}: ${totalNewUsers} new users, ₦${totalRevenueNgn} revenue.`);
    return report;
  }
}
