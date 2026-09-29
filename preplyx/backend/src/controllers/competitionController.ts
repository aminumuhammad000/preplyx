import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Competition from '../models/Competition';
import CompetitionParticipant from '../models/CompetitionParticipant';
import { CompetitionService } from '../services/competitionService';

/**
 * @desc    Get all competitions (active, upcoming, past)
 * @route   GET /api/competitions
 * @access  Public / Private
 */
export const getCompetitions = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const competitions = await Competition.find({
      status: { $ne: 'draft' },
    }).sort({ startTime: -1 });

    const currentUserId = req.user?._id;
    let userParticipations = new Map();

    if (currentUserId) {
      const parts = await CompetitionParticipant.find({ user: currentUserId });
      userParticipations = new Map(parts.map((p) => [p.competition.toString(), p]));
    }

    const enriched = competitions.map((c) => {
      const p = userParticipations.get(c._id.toString());
      return {
        ...c.toObject(),
        isRegistered: !!p,
        userStatus: p?.status,
        userScore: p?.score,
        userRank: p?.rank,
      };
    });

    res.json(enriched);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get competition by ID
 * @route   GET /api/competitions/:id
 * @access  Public / Private
 */
export const getCompetitionById = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const comp = await Competition.findById(req.params.id);
    if (!comp) {
      res.status(404).json({ message: 'Competition not found' });
      return;
    }

    let participantStatus = null;
    if (req.user?._id) {
      participantStatus = await CompetitionParticipant.findOne({
        competition: comp._id,
        user: req.user._id,
      });
    }

    res.json({
      ...comp.toObject(),
      participant: participantStatus,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register user for a competition
 * @route   POST /api/competitions/:id/register
 * @access  Private
 */
export const registerForCompetition = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const participant = await CompetitionService.registerParticipant(
      req.params.id,
      req.user._id
    );
    res.status(201).json({ message: 'Registered successfully', participant });
  } catch (error: any) {
    res.status(400).json({ message: error?.message || 'Registration failed' });
  }
};

/**
 * @desc    Start competition exam
 * @route   GET /api/competitions/:id/start
 * @access  Private
 */
export const startCompetitionExam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const examData = await CompetitionService.startParticipantExam(
      req.params.id,
      req.user._id
    );
    res.json(examData);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || 'Could not start competition' });
  }
};

/**
 * @desc    Submit competition answers
 * @route   POST /api/competitions/:id/submit
 * @access  Private
 */
export const submitCompetitionExam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      res.status(400).json({ message: 'Answers array is required.' });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'] as string;

    const result = await CompetitionService.submitParticipantExam(
      req.params.id,
      req.user._id,
      answers,
      clientIp,
      userAgent
    );

    res.json({ message: 'Exam submitted successfully', result });
  } catch (error: any) {
    res.status(400).json({ message: error?.message || 'Submission failed' });
  }
};

/**
 * @desc    Get competition official leaderboard
 * @route   GET /api/competitions/:id/leaderboard
 * @access  Public / Private
 */
export const getCompetitionLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const leaderboard = await CompetitionService.getCompetitionLeaderboard(req.params.id);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
};
