import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ReferralService } from '../services/referralService';

/**
 * @desc    Get user referral stats, code, and invited friends
 * @route   GET /api/referrals/me
 * @access  Private
 */
export const getUserReferralStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const stats = await ReferralService.getUserReferralStats(req.user._id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};
