import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  setupTargetAndPlan,
  getDiagnostic,
  completeDiagnostic,
  getDailyMission,
  getReadinessScore,
} from '../controllers/onboardingController';

const router = Router();

router.post('/setup', protect, setupTargetAndPlan);
router.get('/diagnostic', protect, getDiagnostic);
router.post('/diagnostic/complete', protect, completeDiagnostic);
router.get('/mission', protect, getDailyMission);
router.get('/readiness', protect, getReadinessScore);

export default router;
