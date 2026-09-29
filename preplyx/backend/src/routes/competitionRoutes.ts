import { Router } from 'express';
import { protect, optionalAuth } from '../middlewares/authMiddleware';
import {
  getCompetitions,
  getCompetitionById,
  registerForCompetition,
  startCompetitionExam,
  submitCompetitionExam,
  getCompetitionLeaderboard,
} from '../controllers/competitionController';

const router = Router();

router.get('/', optionalAuth, getCompetitions);
router.get('/:id', optionalAuth, getCompetitionById);
router.get('/:id/leaderboard', getCompetitionLeaderboard);
router.post('/:id/register', protect, registerForCompetition);
router.get('/:id/start', protect, startCompetitionExam);
router.post('/:id/submit', protect, submitCompetitionExam);

export default router;
