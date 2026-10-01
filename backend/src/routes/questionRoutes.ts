import { Router } from 'express';
import { getQuestions, createQuestion } from '../controllers/questionController';
import { protect, adminOnly } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', protect, getQuestions);
router.post('/', protect, adminOnly, createQuestion);

export default router;
