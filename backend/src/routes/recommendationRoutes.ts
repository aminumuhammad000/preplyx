import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  getStudentRecommendations,
  getStudentPerformance,
  getDailyQuizzes,
  refreshRecommendations,
} from '../controllers/recommendationController';

const router = Router();

router.get('/', protect, getStudentRecommendations);
router.get('/performance', protect, getStudentPerformance);
router.get('/daily-quizzes', protect, getDailyQuizzes);
router.post('/refresh', protect, refreshRecommendations);

export default router;
