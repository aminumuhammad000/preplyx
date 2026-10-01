import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

/**
 * @desc    Get user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
export const getUserProfile = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        exam_type: user.exam_type,
        settings: user.settings,
        achievements: user.achievements || [
          {
            id: 'first_exam',
            title: 'First Steps',
            description: 'Complete your first practice exam',
            icon: '🎯',
            unlocked: true,
            unlockedAt: new Date(Date.now() - 864000000)
          },
          {
            id: 'streak_5',
            title: '5-Day Streak',
            description: 'Practice for 5 consecutive days',
            icon: '🔥',
            unlocked: true,
            unlockedAt: new Date(Date.now() - 432000000)
          },
          {
            id: 'math_master',
            title: 'Math Master',
            description: 'Score 80%+ in 5 Mathematics exams',
            icon: '📐',
            unlocked: false
          },
          {
            id: 'perfect_score',
            title: 'Perfect Score',
            description: 'Achieve 100% in any exam',
            icon: '⭐',
            unlocked: false
          }
        ],
        notifications: user.notifications || [
          {
            id: 'notif_1',
            title: 'New Practice Questions Available',
            message: 'We\'ve added 50 new JAMB Mathematics questions for you to practice!',
            type: 'info',
            read: false,
            createdAt: new Date(Date.now() - 3600000)
          },
          {
            id: 'notif_2',
            title: 'Weekly Challenge',
            message: 'Join this week\'s challenge and compete with other students!',
            type: 'challenge',
            read: true,
            createdAt: new Date(Date.now() - 86400000)
          },
          {
            id: 'notif_3',
            title: 'Achievement Unlocked!',
            message: 'Congratulations! You\'ve earned the "5-Day Streak" badge!',
            type: 'achievement',
            read: true,
            createdAt: new Date(Date.now() - 432000000)
          }
        ],
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
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
export const updateUserProfile = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.exam_type = req.body.exam_type || user.exam_type;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        exam_type: updatedUser.exam_type,
        settings: updatedUser.settings,
        achievements: updatedUser.achievements || [],
        notifications: updatedUser.notifications || [],
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
 * @desc    Update user settings
 * @route   PUT /api/user/settings
 * @access  Private
 */
export const updateUserSettings = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.settings = {
        ...user.settings,
        ...req.body.settings,
      };

      const updatedUser = await user.save();

      res.json({
        settings: updatedUser.settings,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};