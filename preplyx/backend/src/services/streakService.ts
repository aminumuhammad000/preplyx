import mongoose from 'mongoose';
import Streak, { IStreak } from '../models/Streak';
import { AUTOMATION_CONFIG } from '../config/automationConfig';
import { XPService } from './xpService';
import { eventBus, EVENTS } from '../events/eventBus';

export class StreakService {
  /**
   * Returns current calendar date string (YYYY-MM-DD) in Nigeria (Africa/Lagos) timezone
   */
  public static getLagosDateString(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: AUTOMATION_CONFIG.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Output format: YYYY-MM-DD
  }

  /**
   * Calculates difference in calendar days between two YYYY-MM-DD strings
   */
  public static getDaysDifference(dateStr1: string, dateStr2: string): number {
    const d1 = new Date(`${dateStr1}T00:00:00Z`);
    const d2 = new Date(`${dateStr2}T00:00:00Z`);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Records a user learning activity and updates streak idempotently
   */
  public static async recordActivity(
    userId: string | mongoose.Types.ObjectId,
    activityType: string = 'quiz',
    questionsCount: number = 1
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    isNewDayActivity: boolean;
    milestoneReached?: number;
  }> {
    const today = this.getLagosDateString();
    let streak = await Streak.findOne({ user: userId });

    if (!streak) {
      streak = new Streak({
        user: userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        streakHistory: [{ date: today, activityType, questionsCount }],
      });
      await streak.save();

      eventBus.emitEvent(EVENTS.STREAK_UPDATED, {
        userId,
        currentStreak: 1,
        date: today,
      });

      return {
        currentStreak: 1,
        longestStreak: 1,
        isNewDayActivity: true,
      };
    }

    const lastDate = streak.lastActivityDate;

    // If activity was already recorded today, update history without incrementing streak
    if (lastDate === today) {
      const existingHistory = streak.streakHistory.find((h) => h.date === today);
      if (existingHistory) {
        existingHistory.questionsCount += questionsCount;
      } else {
        streak.streakHistory.push({ date: today, activityType, questionsCount });
      }
      await streak.save();

      return {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isNewDayActivity: false,
      };
    }

    // New day activity: evaluate consecutive days
    const diff = lastDate ? this.getDaysDifference(lastDate, today) : 999;
    let newStreakCount = 1;
    let milestoneReached: number | undefined;

    if (diff === 1) {
      // Exactly consecutive day
      newStreakCount = streak.currentStreak + 1;
    } else if (diff === 2 && streak.freezeDaysLeft > 0) {
      // Used streak freeze protection
      streak.freezeDaysLeft -= 1;
      newStreakCount = streak.currentStreak + 1;
      console.log(`[Streak Engine] Used 1 streak freeze for user ${userId}. Freezes left: ${streak.freezeDaysLeft}`);
    } else {
      // Streak broken, reset to 1
      newStreakCount = 1;
    }

    streak.currentStreak = newStreakCount;
    if (newStreakCount > streak.longestStreak) {
      streak.longestStreak = newStreakCount;
    }
    streak.lastActivityDate = today;
    streak.streakHistory.push({ date: today, activityType, questionsCount });

    // Keep history limited to last 60 days
    if (streak.streakHistory.length > 60) {
      streak.streakHistory = streak.streakHistory.slice(-60);
    }

    await streak.save();

    eventBus.emitEvent(EVENTS.STREAK_UPDATED, {
      userId,
      currentStreak: newStreakCount,
      longestStreak: streak.longestStreak,
      date: today,
    });

    // Check for streak milestones (3, 7, 14, 30, 50, 100 days)
    const milestones = [3, 7, 14, 30, 50, 100];
    if (milestones.includes(newStreakCount)) {
      milestoneReached = newStreakCount;
      let milestoneXp = 50;
      if (newStreakCount === 7) milestoneXp = AUTOMATION_CONFIG.xp.streakMilestone7;
      if (newStreakCount === 30) milestoneXp = AUTOMATION_CONFIG.xp.streakMilestone30;
      if (newStreakCount === 100) milestoneXp = AUTOMATION_CONFIG.xp.streakMilestone100;

      await XPService.awardXP({
        userId,
        amount: milestoneXp,
        sourceType: 'streak_milestone',
        sourceId: `streak_${newStreakCount}`,
        reason: `${newStreakCount}-Day Study Streak Milestone Reward! 🔥`,
      });

      eventBus.emitEvent(EVENTS.STREAK_MILESTONE, {
        userId,
        milestone: newStreakCount,
        xpAwarded: milestoneXp,
      });
    }

    return {
      currentStreak: newStreakCount,
      longestStreak: streak.longestStreak,
      isNewDayActivity: true,
      milestoneReached,
    };
  }

  /**
   * Retrieves active streaks for a user
   */
  public static async getUserStreak(userId: string | mongoose.Types.ObjectId): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    isActiveToday: boolean;
    freezeDaysLeft: number;
  }> {
    const today = this.getLagosDateString();
    const streak = await Streak.findOne({ user: userId });

    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: '',
        isActiveToday: false,
        freezeDaysLeft: 1,
      };
    }

    const lastDate = streak.lastActivityDate;
    const diff = lastDate ? this.getDaysDifference(lastDate, today) : 999;
    const isActiveToday = lastDate === today;

    // If more than 1 day missed and not active today, streak is technically 0 until renewed
    const effectiveStreak = diff <= 1 ? streak.currentStreak : 0;

    return {
      currentStreak: effectiveStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: streak.lastActivityDate,
      isActiveToday,
      freezeDaysLeft: streak.freezeDaysLeft,
    };
  }

  /**
   * Finds all users whose streaks are at risk today (studied yesterday, but have not studied today by 8 PM)
   */
  public static async findStreaksAtRisk(): Promise<IStreak[]> {
    const today = this.getLagosDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = this.getLagosDateString(yesterdayDate);

    return Streak.find({
      currentStreak: { $gte: 2 },
      lastActivityDate: yesterday,
      atRiskNotifiedDate: { $ne: today },
    });
  }
}
