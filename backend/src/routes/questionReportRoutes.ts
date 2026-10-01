import { Router } from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import {
  submitQuestionReport,
  getQuestionReports,
  updateQuestionReportStatus,
} from '../controllers/questionReportController';

const router = Router();

router.post('/', protect, submitQuestionReport);
router.get('/', protect, adminOnly, getQuestionReports);
router.put('/:id/status', protect, adminOnly, updateQuestionReportStatus);

export default router;
