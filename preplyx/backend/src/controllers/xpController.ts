import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { XPService } from '../services/xpService';
import User from '../models/User';

/**
 * @desc    Get user XP transaction history and level details
 * @route   GET /api/xp/history
 * @access  Private
 */
export const getUserXPHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const user = await User.findById(req.user._id);
    const history = await XPService.getUserXPHistory(req.user._id, page, limit);

    const totalXp = user?.xp || 100;
    const level = Math.floor(totalXp / 500) + 1;
    const xpInCurrentLevel = totalXp % 500;
    const xpToNextLevel = 500 - xpInCurrentLevel;

    res.json({
      totalXp,
      level,
      xpInCurrentLevel,
      xpToNextLevel,
      ...history,
    });
  } catch (error) {
    next(error);
  }
};
