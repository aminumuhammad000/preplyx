import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  logMistake,
  getMistakes,
  explainWhyWrong,
  reviewMistake,
} from '../controllers/mistakeController';

const router = Router();

router.post('/log', protect, logMistake);
router.get('/', protect, getMistakes);
router.post('/why-wrong', protect, explainWhyWrong);
router.post('/:id/review', protect, reviewMistake);

export default router;
