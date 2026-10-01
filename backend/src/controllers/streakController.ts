import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { StreakService } from '../services/streakService';
import Streak from '../models/Streak';

/**
 * @desc    Get current user's study streak stats
 * @route   GET /api/streaks/me
 * @access  Private
 */
export const getUserStreak = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const streakInfo = await StreakService.getUserStreak(req.user._id);
    const fullRecord = await Streak.findOne({ user: req.user._id });

    res.json({
      ...streakInfo,
      history: fullRecord?.streakHistory || [],
    });
  } catch (error) {
    next(error);
  }
};
