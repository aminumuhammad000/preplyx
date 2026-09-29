import mongoose from 'mongoose';
import ExamSession from '../models/ExamSession';
import User from '../models/User';
import Streak from '../models/Streak';
import { getRedisClient } from '../config/redis';

export type LeaderboardFilter = 'daily' | 'weekly' | 'monthly' | 'global';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  points: number;
  examsCount: number;
  averageAccuracy: number;
  totalTimeSpent: number;
  streak: number;
  exam: string;
  isCurrentUser?: boolean;
}

export class LeaderboardService {
  /**
   * Retrieves deterministic leaderboard with Redis caching
   */
  public static async getLeaderboard(
    filter: LeaderboardFilter = 'weekly',
    subject?: string,
    currentUserId?: string,
    limit: number = 20
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${filter}:${subject || 'all'}:${limit}`;

    // Try Redis cache first
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: LeaderboardEntry[] = JSON.parse(cached);
        return parsed.map((entry) => ({
          ...entry,
          isCurrentUser: currentUserId ? entry.userId === currentUserId.toString() : false,
        }));
      }
    } catch (err) {
      // Redis cache miss or failure, proceed to live query
    }

    // Determine start date based on filter
    const now = new Date();
    let startDate: Date;

    if (filter === 'daily') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (filter === 'weekly') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (filter === 'monthly') {
      startDate = new Date(now.setDate(now.getDate() - 30));
    } else {
      startDate = new Date(0); // Global / All-time
    }

    const matchQuery: any = {
      createdAt: { $gte: startDate },
    };
    if (subject && subject !== 'All') {
      matchQuery.subject = subject;
    }

    // Aggregate sessions deterministically: Points (sum of score), TimeSpent (sum), total sessions
    const aggregated = await ExamSession.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$score' },
          totalQuestions: { $sum: '$total' },
          totalTimeSpent: { $sum: '$timeSpentSeconds' },
          examsCount: { $sum: 1 },
          lastExamDate: { $max: '$createdAt' },
          lastExamType: { $last: '$exam' },
        },
      },
      // Deterministic sort: Points DESC, TotalTimeSpent ASC, LastExamDate ASC
      {
        $sort: {
          totalPoints: -1,
          totalTimeSpent: 1,
          lastExamDate: 1,
        },
      },
      { $limit: limit },
    ]);

    if (aggregated.length === 0) {
      return [];
    }

    const userIds = aggregated.map((a) => a._id);
    const [users, streaks] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('name email exam_type xp'),
      Streak.find({ user: { $in: userIds } }),
    ]);

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const streakMap = new Map(streaks.map((s) => [s.user.toString(), s.currentStreak]));

    const leaderboard: LeaderboardEntry[] = aggregated.map((item, index) => {
      const uid = item._id.toString();
      const user = userMap.get(uid);
      const name = user?.name || 'Preplyx Student';
      const streak = streakMap.get(uid) || 1;
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      const avgAccuracy =
        item.totalQuestions > 0 ? Math.round((item.totalPoints / item.totalQuestions) * 100) : 0;

      return {
        rank: index + 1,
        userId: uid,
        name,
        email: user?.email || '',
        avatar: initials || 'PX',
        points: item.totalPoints,
        examsCount: item.examsCount,
        averageAccuracy: avgAccuracy,
        totalTimeSpent: item.totalTimeSpent,
        streak,
        exam: item.lastExamType || user?.exam_type || 'JAMB',
        isCurrentUser: currentUserId ? uid === currentUserId.toString() : false,
      };
    });

    // Cache in Redis for 60 seconds
    try {
      const redis = getRedisClient();
      await redis.set(cacheKey, JSON.stringify(leaderboard), 'EX', 60);
    } catch (err) {
      // Ignore cache write error
    }

    return leaderboard;
  }

  /**
   * Retrieves specific user rank and statistics
   */
  public static async getUserRank(
    userId: string | mongoose.Types.ObjectId,
    filter: LeaderboardFilter = 'weekly'
  ): Promise<{
    rank: number;
    points: number;
    examsCount: number;
    streak: number;
  }> {
    const userLeaderboard = await this.getLeaderboard(filter, undefined, userId.toString(), 1000);
    const userEntry = userLeaderboard.find((e) => e.userId === userId.toString());

    if (userEntry) {
      return {
        rank: userEntry.rank,
        points: userEntry.points,
        examsCount: userEntry.examsCount,
        streak: userEntry.streak,
      };
    }

    // If not in top 1000, fetch individual stats
    const streak = await Streak.findOne({ user: userId });
    return {
      rank: 0,
      points: 0,
      examsCount: 0,
      streak: streak?.currentStreak || 0,
    };
  }
}
