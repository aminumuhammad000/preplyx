import { Router } from 'express';
import { getUserAchievements, unlockAchievement, updateAchievementProgress } from '../controllers/achievementController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All routes are protected
router.use(protect);

router.get('/', getUserAchievements);
router.post('/unlock', unlockAchievement);
router.put('/progress', updateAchievementProgress);

export default router;