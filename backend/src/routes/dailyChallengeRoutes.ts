import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getTodayChallenge, submitDailyChallenge } from '../controllers/dailyChallengeController';

const router = Router();

router.get('/', protect, getTodayChallenge);
router.post('/submit', protect, submitDailyChallenge);

export default router;
