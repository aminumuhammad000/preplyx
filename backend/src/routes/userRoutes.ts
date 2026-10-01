import { Router } from 'express';
import { getUserProfile, updateUserProfile, updateUserSettings } from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All routes are protected
router.use(protect);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/settings', updateUserSettings);

export default router;