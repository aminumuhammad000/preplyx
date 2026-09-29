import mongoose from 'mongoose';
import Achievement, { IAchievement } from '../models/Achievement';
import UserAchievement from '../models/UserAchievement';
import User from '../models/User';
import ExamSession from '../models/ExamSession';
import Streak from '../models/Streak';
import { XPService } from './xpService';
import { eventBus, EVENTS } from '../events/eventBus';

export const INITIAL_ACHIEVEMENTS: Partial<IAchievement>[] = [
  {
    code: 'first_quiz',
    name: 'First Steps',
    description: 'Complete your first practice exam',
    category: 'practice',
    icon: 'Star',
    color: '#f59e0b',
    xpReward: 100,
    metric: 'sessions_completed',
    targetValue: 1,
    order: 1,
  },
  {
    code: 'quick_learner',
    name: 'Quick Learner',
    description: 'Complete 10 practice exams',
    category: 'practice',
    icon: 'Zap',
    color: '#7B2FF7',
    xpReward: 200,
    metric: 'sessions_completed',
    targetValue: 10,
    order: 2,
  },
  {
    code: 'exam_champion',
    name: 'Exam Champion',
    description: 'Complete 50 practice exams',
    category: 'practice',
    icon: 'Trophy',
    color: '#f59e0b',
    xpReward: 600,
    metric: 'sessions_completed',
    targetValue: 50,
    order: 3,
  },
  {
    code: 'questions_100',
    name: 'Centurion',
    description: 'Answer 100 questions on Preplyx',
    category: 'practice',
    icon: 'Award',
    color: '#3b82f6',
    xpReward: 150,
    metric: 'questions_answered',
    targetValue: 100,
    order: 4,
  },
  {
    code: 'questions_500',
    name: 'Scholar',
    description: 'Answer 500 questions across any subject',
    category: 'practice',
    icon: 'BookOpen',
    color: '#10b981',
    xpReward: 400,
    metric: 'questions_answered',
    targetValue: 500,
    order: 5,
  },
  {
    code: 'questions_1000',
    name: 'Knowledge Giant',
    description: 'Answer 1,000 questions in total',
    category: 'practice',
    icon: 'Crown',
    color: '#7B2FF7',
    xpReward: 800,
    metric: 'questions_answered',
    targetValue: 1000,
    order: 6,
  },
  {
    code: 'streak_7',
    name: 'Streak Master',
    description: 'Maintain a 7-day continuous study streak',
    category: 'streak',
    icon: 'Flame',
    color: '#ef4444',
    xpReward: 300,
    metric: 'streak_days',
    targetValue: 7,
    order: 7,
  },
  {
    code: 'streak_30',
    name: 'Month Warrior',
    description: 'Maintain a 30-day continuous study streak',
    category: 'streak',
    icon: 'Flame',
    color: '#ef4444',
    xpReward: 700,
    metric: 'streak_days',
    targetValue: 30,
    order: 8,
  },
  {
    code: 'perfect_score',
    name: 'Flawless Victory',
    description: 'Achieve a 100% score on any exam session',
    category: 'mastery',
    icon: 'Sparkles',
    color: '#10b981',
    xpReward: 400,
    metric: 'perfect_scores',
    targetValue: 1,
    order: 9,
  },
  {
    code: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete an exam in under 30 minutes with over 70% score',
    category: 'practice',
    icon: 'Zap',
    color: '#3b82f6',
    xpReward: 500,
    metric: 'speed_minutes',
    targetValue: 30,
    order: 10,
  },
  {
    code: 'competition_winner',
    name: 'Grand Champion',
    description: 'Win 1st place in an official Preplyx competition',
    category: 'competition',
    icon: 'Trophy',
    color: '#f59e0b',
    xpReward: 1000,
    metric: 'competition_won',
    targetValue: 1,
    order: 11,
  },
];

export class AchievementService {
  /**
   * Seeds default achievements in database if not already present
   */
  public static async seedDefaultAchievements(): Promise<void> {
    for (const ach of INITIAL_ACHIEVEMENTS) {
      const exists = await Achievement.findOne({ code: ach.code });
      if (!exists) {
        await Achievement.create({ ...ach, isActive: true });
      }
    }
  }

  /**
   * Evaluates all achievement criteria for a user based on latest events
   */
  public static async evaluateUserAchievements(
    userId: string | mongoose.Types.ObjectId,
    context?: {
      session?: any;
      streak?: number;
      competitionWon?: boolean;
    }
  ): Promise<any[]> {
    await this.seedDefaultAchievements();

    const allAchievements = await Achievement.find({ isActive: true }).sort({ order: 1 });
    const user = await User.findById(userId);
    if (!user) return [];

    // Gather user stats
    const [totalSessions, totalQuestionsAggr, streakRecord] = await Promise.all([
      ExamSession.countDocuments({ user: userId }),
      ExamSession.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId.toString()) } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Streak.findOne({ user: userId }),
    ]);

    const totalQuestions = totalQuestionsAggr[0]?.total || 0;
    const currentStreak = context?.streak || streakRecord?.currentStreak || 0;

    const unlockedNow: any[] = [];

    for (const ach of allAchievements) {
      let userAch = await UserAchievement.findOne({
        user: userId,
        achievementCode: ach.code,
      });

      if (!userAch) {
        userAch = new UserAchievement({
          user: userId,
          achievement: ach._id,
          achievementCode: ach.code,
          progress: 0,
          unlocked: false,
          xpAwarded: 0,
        });
      }

      if (userAch.unlocked) {
        continue; // Already unlocked
      }

      let currentMetricValue = 0;
      let shouldUnlock = false;

      switch (ach.metric) {
        case 'sessions_completed':
          currentMetricValue = totalSessions;
          shouldUnlock = totalSessions >= ach.targetValue;
          break;

        case 'questions_answered':
          currentMetricValue = totalQuestions;
          shouldUnlock = totalQuestions >= ach.targetValue;
          break;

        case 'streak_days':
          currentMetricValue = currentStreak;
          shouldUnlock = currentStreak >= ach.targetValue;
          break;

        case 'perfect_scores':
          if (context?.session && context.session.percentage >= 100) {
            currentMetricValue = 1;
            shouldUnlock = true;
          }
          break;

        case 'speed_minutes':
          if (
            context?.session &&
            context.session.timeSpentSeconds > 0 &&
            context.session.timeSpentSeconds < ach.targetValue * 60 &&
            context.session.percentage >= 70
          ) {
            currentMetricValue = 1;
            shouldUnlock = true;
          }
          break;

        case 'competition_won':
          if (context?.competitionWon) {
            currentMetricValue = 1;
            shouldUnlock = true;
          }
          break;

        default:
          break;
      }

      const progress = Math.min(100, Math.round((currentMetricValue / ach.targetValue) * 100));
      userAch.progress = progress;

      if (shouldUnlock && !userAch.unlocked) {
        userAch.unlocked = true;
        userAch.unlockedAt = new Date();
        userAch.progress = 100;
        userAch.xpAwarded = ach.xpReward;

        await userAch.save();

        // Award XP
        await XPService.awardXP({
          userId,
          amount: ach.xpReward,
          sourceType: 'achievement_unlocked',
          sourceId: ach.code,
          reason: `Achievement Unlocked: "${ach.name}" 🏆`,
        });

        // Mirror into user document for legacy UI compatibility
        const notifObj = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          type: 'achievement',
          title: 'Achievement Unlocked! 🎉',
          message: `Congratulations! You unlocked "${ach.name}" and earned +${ach.xpReward} XP!`,
          time: 'Just now',
          unread: true,
        };

        if (!user.notifications) user.notifications = [];
        user.notifications.unshift(notifObj);

        // Update achievements array in User model if present
        if (!user.achievements) user.achievements = [];
        const existingLegacy = user.achievements.find((a: any) => a.name === ach.name || a.id === ach.order);
        if (existingLegacy) {
          existingLegacy.unlocked = true;
          existingLegacy.progress = 100;
          existingLegacy.date = new Date().toISOString().split('T')[0];
        } else {
          user.achievements.push({
            id: ach.order,
            name: ach.name,
            description: ach.description,
            icon: ach.icon,
            color: ach.color,
            unlocked: true,
            progress: 100,
            date: new Date().toISOString().split('T')[0],
            xp: ach.xpReward,
          });
        }

        await user.save();

        unlockedNow.push({
          code: ach.code,
          name: ach.name,
          description: ach.description,
          xpReward: ach.xpReward,
        });

        eventBus.emitEvent(EVENTS.ACHIEVEMENT_UNLOCKED, {
          userId,
          achievementCode: ach.code,
          name: ach.name,
          xpReward: ach.xpReward,
        });
      } else {
        await userAch.save();
      }
    }

    return unlockedNow;
  }

  /**
   * Retrieves all achievements with user unlock status
   */
  public static async getUserAchievements(userId: string | mongoose.Types.ObjectId): Promise<any> {
    await this.seedDefaultAchievements();

    const allAchievements = await Achievement.find({ isActive: true }).sort({ order: 1 });
    const userAchievements = await UserAchievement.find({ user: userId });

    const userMap = new Map(userAchievements.map((ua) => [ua.achievementCode, ua]));

    const enriched = allAchievements.map((ach) => {
      const userStatus = userMap.get(ach.code);
      return {
        id: ach.order,
        code: ach.code,
        name: ach.name,
        description: ach.description,
        category: ach.category,
        icon: ach.icon,
        color: ach.color,
        xp: ach.xpReward,
        unlocked: userStatus?.unlocked || false,
        progress: userStatus?.progress || 0,
        unlockedAt: userStatus?.unlockedAt,
      };
    });

    const user = await User.findById(userId);
    const totalXp = user?.xp || 100;
    const level = Math.floor(totalXp / 500) + 1;
    const unlockedCount = enriched.filter((e) => e.unlocked).length;

    return {
      achievements: enriched,
      progress: {
        totalAchievements: enriched.length,
        unlocked: unlockedCount,
        points: totalXp,
        level,
      },
    };
  }
}
