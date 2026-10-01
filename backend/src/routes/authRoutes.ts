import { Router } from 'express';
import { registerUser, authUser, getUserProfile, forgotPassword, resetPassword } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/securityMiddleware';

const router = Router();

router.post('/register', authRateLimiter, registerUser);
router.post('/login', authRateLimiter, authUser);
router.get('/profile', protect, getUserProfile);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

export default router;
