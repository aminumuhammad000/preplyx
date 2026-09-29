import { Router } from 'express';
import { getLeaderboard, getUserRank } from '../controllers/leaderboardController';
import { protect, optionalProtect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', optionalProtect, getLeaderboard);
router.get('/me', protect, getUserRank);

export default router;
