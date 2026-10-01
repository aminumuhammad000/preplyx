import { Router } from 'express';
import { getStats, getSessions, getSubjectMastery } from '../controllers/dataController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/stats', protect, getStats);
router.get('/sessions', protect, getSessions);
router.get('/subject-mastery', protect, getSubjectMastery);

export default router;
