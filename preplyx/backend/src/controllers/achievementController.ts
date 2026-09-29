import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// Default achievements that can be unlocked (Only Welcome Scholar is unlocked initially with 100 XP)
export const DEFAULT_ACHIEVEMENTS = [
  { id: 1, name: 'Welcome Scholar', description: 'Join Preplyx platform and begin your learning journey', icon: 'Sparkles', color: '#7B2FF7', unlocked: true, progress: 100, date: new Date().toISOString().split('T')[0], xp: 100 },
  { id: 2, name: 'First Steps', description: 'Complete your first practice exam', icon: 'Star', color: '#f59e0b', unlocked: false, progress: 0, xp: 100 },
  { id: 3, name: 'Quick Learner', description: 'Complete 10 practice exams', icon: 'Zap', color: '#7B2FF7', unlocked: false, progress: 0, xp: 200 },
  { id: 4, name: 'Streak Master', description: 'Maintain a 7-day study streak', icon: 'Flame', color: '#ef4444', unlocked: false, progress: 0, xp: 300 },
  { id: 5, name: 'Perfect Score', description: 'Score 100% on any exam', icon: 'Crown', color: '#10b981', unlocked: false, progress: 0, xp: 400 },
  { id: 6, name: 'Subject Expert', description: 'Master 5 subjects', icon: 'Target', color: '#3b82f6', unlocked: false, progress: 0, xp: 500 },
  { id: 7, name: 'Exam Champion', description: 'Complete 50 practice exams', icon: 'Trophy', color: '#f59e0b', unlocked: false, progress: 0, xp: 600 },
  { id: 8, name: 'Month Warrior', description: 'Maintain a 30-day study streak', icon: 'Flame', color: '#ef4444', unlocked: false, progress: 0, xp: 700 },
  { id: 9, name: 'Top Ranker', description: 'Reach top 10 on leaderboard', icon: 'Medal', color: '#7B2FF7', unlocked: false, progress: 0, xp: 800 },
  { id: 10, name: 'Speed Demon', description: 'Complete exam under 30 minutes', icon: 'Zap', color: '#3b82f6', unlocked: false, progress: 0, xp: 1000 },
];

/**
 * @desc    Get user achievements
 * @route   GET /api/achievements
 * @access  Private
 */
export const getUserAchievements = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      if (!user.achievements || user.achievements.length === 0) {
        user.achievements = DEFAULT_ACHIEVEMENTS.map((achievement) => ({
          ...achievement,
          date: achievement.unlocked ? (achievement.date || new Date().toISOString().split('T')[0]) : undefined
        }));
        if (!user.xp || user.xp < 100) {
          user.xp = 100;
        }
        await user.save();
      }

      const unlockedAchievements = user.achievements.filter((a: any) => a.unlocked);
      const pointsFromBadges = unlockedAchievements.reduce((sum: number, a: any) => sum + (a.xp || (a.id === 1 ? 100 : a.id * 100)), 0);
      const totalPoints = Math.max(user.xp || 100, pointsFromBadges);
      const level = Math.floor(totalPoints / 500) + 1;

      res.json({
        achievements: user.achievements,
        progress: {
          totalAchievements: user.achievements.length,
          unlocked: unlockedAchievements.length,
          points: totalPoints,
          level: level,
        },
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unlock achievement
 * @route   POST /api/achievements/unlock
 * @access  Private
 */
export const unlockAchievement = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { achievementId } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      if (!user.achievements || user.achievements.length === 0) {
        user.achievements = DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a }));
      }

      const achievement = user.achievements.find((a: any) => a.id === achievementId);

      if (achievement) {
        let addedXp = 0;
        if (!achievement.unlocked) {
          achievement.unlocked = true;
          achievement.date = new Date().toISOString().split('T')[0];
          achievement.progress = 100;
          addedXp = achievement.xp || (achievement.id === 1 ? 100 : achievement.id * 100);
          user.xp = (user.xp || 0) + addedXp;

          // Add real notification for user
          const newNotif = {
            id: Date.now(),
            type: 'achievement',
            title: 'Achievement Unlocked! 🎉',
            message: `Congratulations! You unlocked "${achievement.name}" and earned +${addedXp} XP!`,
            time: 'Just now',
            unread: true,
          };
          if (!user.notifications) user.notifications = [];
          user.notifications.unshift(newNotif);
        }

        await user.save();

        res.json({
          message: 'Achievement unlocked successfully',
          achievement: achievement,
          earnedXp: addedXp,
          totalXp: user.xp,
        });
      } else {
        res.status(404);
        throw new Error('Achievement not found');
      }
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update achievement progress
 * @route   PUT /api/achievements/progress
 * @access  Private
 */
export const updateAchievementProgress = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { achievementId, progress } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      if (!user.achievements || user.achievements.length === 0) {
        user.achievements = DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a }));
      }

      const achievement = user.achievements.find((a: any) => a.id === achievementId);

      if (achievement) {
        achievement.progress = Math.min(progress, 100);

        if (achievement.progress >= 100 && !achievement.unlocked) {
          achievement.unlocked = true;
          achievement.date = new Date().toISOString().split('T')[0];
          const addedXp = achievement.xp || (achievement.id === 1 ? 100 : achievement.id * 100);
          user.xp = (user.xp || 0) + addedXp;

          // Create Notification
          const newNotif = {
            id: Date.now(),
            type: 'achievement',
            title: 'Achievement Unlocked! 🎉',
            message: `Congratulations! You completed "${achievement.name}" and earned +${addedXp} XP!`,
            time: 'Just now',
            unread: true,
          };
          if (!user.notifications) user.notifications = [];
          user.notifications.unshift(newNotif);
        }

        await user.save();

        res.json({
          message: 'Achievement progress updated',
          achievement: achievement,
        });
      } else {
        res.status(404);
        throw new Error('Achievement not found');
      }
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};