import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getUserStreak } from '../controllers/streakController';

const router = Router();

router.get('/me', protect, getUserStreak);

export default router;
