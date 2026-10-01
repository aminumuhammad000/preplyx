import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { DailyChallengeService } from '../services/dailyChallengeService';

/**
 * @desc    Get today's Question of the Day & user status
 * @route   GET /api/daily-challenge
 * @access  Private
 */
export const getTodayChallenge = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const challengeData = await DailyChallengeService.getTodayChallenge(req.user?._id);
    res.json(challengeData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit answer for Question of the Day
 * @route   POST /api/daily-challenge/submit
 * @access  Private
 */
export const submitDailyChallenge = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { challengeId, userAnswer, timeSpentSeconds } = req.body;

    if (!challengeId || !userAnswer) {
      res.status(400).json({ message: 'challengeId and userAnswer are required.' });
      return;
    }

    const result = await DailyChallengeService.submitAnswer(
      req.user._id,
      challengeId,
      userAnswer,
      Number(timeSpentSeconds) || 10
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || 'Failed to submit daily challenge.' });
  }
};
