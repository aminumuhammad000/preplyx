import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getUserReferralStats } from '../controllers/referralController';

const router = Router();

router.get('/me', protect, getUserReferralStats);

export default router;
