import { Router } from 'express';
import {
  startSession,
  submitSession,
  saveSession,
  getUserSessions,
  getUserAnalytics,
  getSessionById,
  getReviewedQuestions,
} from '../controllers/examSessionController';
import { protect } from '../middlewares/authMiddleware';
import { examSubmitLimiter } from '../middlewares/securityMiddleware';

const router = Router();

router.post('/start', protect, startSession);
router.post('/submit', protect, examSubmitLimiter, submitSession);
router.post('/:id/submit', protect, examSubmitLimiter, submitSession);
router.post('/', protect, examSubmitLimiter, submitSession);
router.get('/', protect, getUserSessions);
router.get('/analytics', protect, getUserAnalytics);
router.get('/reviewed-questions', protect, getReviewedQuestions);
router.get('/:id', protect, getSessionById);

export default router;
