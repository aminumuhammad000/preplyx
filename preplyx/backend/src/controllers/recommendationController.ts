import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { RecommendationService } from '../services/recommendationService';
import { PerformanceService } from '../services/performanceService';
import { QuizGenerationService } from '../services/quizGenerationService';

/**
 * @desc    Get student personalized study recommendations
 * @route   GET /api/recommendations
 * @access  Private
 */
export const getStudentRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const exam = (req.query.exam as string) || req.user.exam_type || 'JAMB';
    const recommendations = await RecommendationService.getStudentRecommendations(req.user._id, exam);
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed student performance summary & weak topics
 * @route   GET /api/recommendations/performance
 * @access  Private
 */
export const getStudentPerformance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const exam = (req.query.exam as string) || req.user.exam_type || 'JAMB';
    const performance = await PerformanceService.getStudentPerformanceSummary(req.user._id, exam);
    res.json(performance);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get auto-generated daily practice quizzes
 * @route   GET /api/recommendations/daily-quizzes
 * @access  Private
 */
export const getDailyQuizzes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dailyQuizzes = await QuizGenerationService.getActiveDailyQuizzes();
    res.json(dailyQuizzes);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually force refresh of study recommendations
 * @route   POST /api/recommendations/refresh
 * @access  Private
 */
export const refreshRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const exam = (req.query.exam as string) || req.user.exam_type || 'JAMB';
    const recommendations = await RecommendationService.generateStudentRecommendations(req.user._id, exam);
    res.json({ message: 'Recommendations refreshed', recommendations });
  } catch (error) {
    next(error);
  }
};
