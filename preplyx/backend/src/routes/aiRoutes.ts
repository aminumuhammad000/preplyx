import { Router } from 'express';
import { askAiTutor } from '../controllers/aiController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/tutor', protect, askAiTutor);

export default router;
