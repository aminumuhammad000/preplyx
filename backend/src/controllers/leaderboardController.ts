import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { LeaderboardService, LeaderboardFilter } from '../services/leaderboardService';

/**
 * @desc    Get leaderboard data with Redis caching and deterministic tie-breaking
 * @route   GET /api/leaderboard
 * @access  Private
 */
export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const timeFilter = (req.query.filter as string) || 'weekly';
    const subject = req.query.subject as string;
    const limit = Number(req.query.limit) || 20;

    const leaderboard = await LeaderboardService.getLeaderboard(
      timeFilter as LeaderboardFilter,
      subject,
      req.user?._id?.toString(),
      limit
    );

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
};

/**
 * @desc    Get current user's rank and stats
 * @route   GET /api/leaderboard/me
 * @access  Private
 */
export const getUserRank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const timeFilter = (req.query.filter as string) || 'weekly';
    const userRankInfo = await LeaderboardService.getUserRank(
      req.user._id,
      timeFilter as LeaderboardFilter
    );

    res.json(userRankInfo);
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({ message: 'Error fetching user rank' });
  }
};
