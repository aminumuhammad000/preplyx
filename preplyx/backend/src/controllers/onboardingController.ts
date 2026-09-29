import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { OnboardingService } from '../services/onboardingService';

export const setupTargetAndPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const {
      targetExam,
      targetScore,
      examDate,
      targetCourse,
      targetInstitution,
      subjects,
      dailyStudyMinutes,
      confidenceLevel,
    } = req.body;

    const result = await OnboardingService.setupTargetAndPlan({
      userId: req.user._id,
      targetExam,
      targetScore,
      examDate,
      targetCourse,
      targetInstitution,
      subjects,
      dailyStudyMinutes,
      confidenceLevel,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error setting up target:', error);
    res.status(500).json({ message: error.message || 'Error saving study target' });
  }
};

export const getDiagnostic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const questions = await OnboardingService.getDiagnosticQuestions(req.user._id);
    res.json(questions);
  } catch (error: any) {
    console.error('Error fetching diagnostic:', error);
    res.status(500).json({ message: error.message || 'Error loading diagnostic questions' });
  }
};

export const completeDiagnostic = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { answers, confidenceMap } = req.body;
    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ message: 'Answers object is required' });
      return;
    }

    const result = await OnboardingService.completeDiagnostic(
      req.user._id,
      answers,
      confidenceMap || {}
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error completing diagnostic:', error);
    res.status(500).json({ message: error.message || 'Error processing diagnostic assessment' });
  }
};

export const getDailyMission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const mission = await OnboardingService.getDailyMission(req.user._id);
    res.json(mission);
  } catch (error: any) {
    console.error('Error fetching daily mission:', error);
    res.status(500).json({ message: error.message || 'Error loading daily mission' });
  }
};

export const getReadinessScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const readiness = await OnboardingService.getReadinessBreakdown(req.user._id);
    res.json(readiness);
  } catch (error: any) {
    console.error('Error fetching readiness score:', error);
    res.status(500).json({ message: error.message || 'Error calculating readiness score' });
  }
};
