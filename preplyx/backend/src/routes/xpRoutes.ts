import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getUserXPHistory } from '../controllers/xpController';

const router = Router();

router.get('/history', protect, getUserXPHistory);

export default router;
