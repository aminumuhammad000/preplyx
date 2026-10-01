import { Router } from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import {
  getAutomationStatus,
  toggleAutomationJob,
  runJobNow,
  getDailyReports,
  getWeeklyReports,
  getSuspiciousActivities,
  resolveSuspiciousActivity,
  getAiDraftQuestions,
  approveAiDraftQuestion,
  rejectAiDraftQuestion,
  triggerAiQuestionGeneration,
} from '../controllers/automationAdminController';

const router = Router();

// Protect all admin automation routes with protect and adminOnly
router.use(protect, adminOnly);

router.get('/status', getAutomationStatus);
router.post('/toggle', toggleAutomationJob);
router.post('/run-now/:jobName', runJobNow);

router.get('/reports/daily', getDailyReports);
router.get('/reports/weekly', getWeeklyReports);

router.get('/anti-cheat', getSuspiciousActivities);
router.post('/anti-cheat/:id/resolve', resolveSuspiciousActivity);

router.get('/ai-drafts', getAiDraftQuestions);
router.post('/ai-drafts/:id/approve', approveAiDraftQuestion);
router.post('/ai-drafts/:id/reject', rejectAiDraftQuestion);
router.post('/ai-generate', triggerAiQuestionGeneration);

export default router;
