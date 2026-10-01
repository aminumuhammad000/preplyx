import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import AutomationJobState from '../models/AutomationJobState';
import DailyReport from '../models/DailyReport';
import WeeklyReport from '../models/WeeklyReport';
import SuspiciousActivity from '../models/SuspiciousActivity';
import Question from '../models/Question';
import { QueueManager } from '../queues/queueManager';
import { SecurityAuditService } from '../services/securityAuditService';
import { AutomationScheduler } from '../schedulers/automationScheduler';
import { AIGenerationService } from '../services/aiGenerationService';
import { AUTOMATION_CONFIG } from '../config/automationConfig';

/**
 * @desc    Get complete automation engine live status, queue metrics, and scheduled tasks
 * @route   GET /api/admin/automation/status
 * @access  Private (Admin)
 */
export const getAutomationStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [health, queueMetrics, jobStates] = await Promise.all([
      SecurityAuditService.getSystemHealthMetrics(),
      QueueManager.getAllQueueMetrics(),
      AutomationJobState.find().sort({ category: 1, displayName: 1 }),
    ]);

    res.json({
      health,
      queues: queueMetrics,
      scheduledJobs: jobStates,
      config: AUTOMATION_CONFIG,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle an automated scheduled job (enable/disable)
 * @route   POST /api/admin/automation/toggle
 * @access  Private (Admin)
 */
export const toggleAutomationJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobName, isEnabled } = req.body;
    if (!jobName || typeof isEnabled !== 'boolean') {
      res.status(400).json({ message: 'jobName (string) and isEnabled (boolean) are required.' });
      return;
    }

    const job = await AutomationJobState.findOneAndUpdate(
      { jobName },
      { isEnabled },
      { new: true }
    );

    if (!job) {
      res.status(404).json({ message: 'Automation job not found' });
      return;
    }

    await SecurityAuditService.recordAdminAction({
      adminUser: req.user?._id,
      adminEmail: req.user?.email,
      action: isEnabled ? 'ENABLE_AUTOMATION_JOB' : 'DISABLE_AUTOMATION_JOB',
      resourceType: 'AutomationJobState',
      resourceId: jobName,
      details: { jobName, isEnabled },
    });

    res.json({ message: `Job "${job.displayName}" ${isEnabled ? 'enabled' : 'disabled'} successfully`, job });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually trigger an automated job immediately
 * @route   POST /api/admin/automation/run-now/:jobName
 * @access  Private (Admin)
 */
export const runJobNow = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobName } = req.params;
    const success = await AutomationScheduler.runJobNow(jobName);

    if (!success) {
      res.status(400).json({ message: `Unrecognized job name: ${jobName}` });
      return;
    }

    await SecurityAuditService.recordAdminAction({
      adminUser: req.user?._id,
      adminEmail: req.user?.email,
      action: 'TRIGGER_JOB_MANUALLY',
      resourceType: 'AutomationScheduler',
      resourceId: jobName,
      details: { jobName },
    });

    res.json({ message: `Job "${jobName}" enqueued for immediate execution!` });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of daily admin reports
 * @route   GET /api/admin/automation/reports/daily
 * @access  Private (Admin)
 */
export const getDailyReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 30;
    const reports = await DailyReport.find().sort({ date: -1 }).limit(limit);
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of weekly admin reports
 * @route   GET /api/admin/automation/reports/weekly
 * @access  Private (Admin)
 */
export const getWeeklyReports = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 12;
    const reports = await WeeklyReport.find().sort({ weekIdentifier: -1 }).limit(limit);
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get flagged suspicious activities (anti-cheating)
 * @route   GET /api/admin/automation/anti-cheat
 * @access  Private (Admin)
 */
export const getSuspiciousActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as string;
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const activities = await SuspiciousActivity.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve suspicious activity flag with admin action
 * @route   POST /api/admin/automation/anti-cheat/:id/resolve
 * @access  Private (Admin)
 */
export const resolveSuspiciousActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { actionTaken, adminNotes, status = 'reviewed' } = req.body;

    const activity = await SuspiciousActivity.findById(req.params.id);
    if (!activity) {
      res.status(404).json({ message: 'Suspicious activity record not found' });
      return;
    }

    activity.status = status;
    activity.actionTaken = actionTaken || 'none';
    activity.adminNotes = adminNotes;
    activity.reviewedBy = req.user?._id;
    activity.reviewedAt = new Date();
    await activity.save();

    await SecurityAuditService.recordAdminAction({
      adminUser: req.user?._id,
      adminEmail: req.user?.email,
      action: 'RESOLVE_ANTI_CHEAT_FLAG',
      resourceType: 'SuspiciousActivity',
      resourceId: activity._id.toString(),
      details: { actionTaken, adminNotes, status },
    });

    res.json({ message: 'Anti-cheat flag updated successfully', activity });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get AI generated questions in draft status awaiting approval
 * @route   GET /api/admin/automation/ai-drafts
 * @access  Private (Admin)
 */
export const getAiDraftQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subject, exam } = req.query;
    const query: any = { status: 'draft' };
    if (subject && subject !== 'All') query.subject = subject;
    if (exam && exam !== 'All') query.exam = exam;

    const questions = await Question.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(questions);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve AI draft question to published
 * @route   POST /api/admin/automation/ai-drafts/:id/approve
 * @access  Private (Admin)
 */
export const approveAiDraftQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { status: 'published' },
      { new: true }
    );

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    await SecurityAuditService.recordAdminAction({
      adminUser: req.user?._id,
      adminEmail: req.user?.email,
      action: 'APPROVE_AI_QUESTION',
      resourceType: 'Question',
      resourceId: question._id.toString(),
      details: { questionText: question.text, subject: question.subject },
    });

    res.json({ message: 'Question approved and published!', question });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject AI draft question
 * @route   POST /api/admin/automation/ai-drafts/:id/reject
 * @access  Private (Admin)
 */
export const rejectAiDraftQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    res.json({ message: 'Question rejected and archived.', question });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Trigger AI question batch generation
 * @route   POST /api/admin/automation/ai-generate
 * @access  Private (Admin)
 */
export const triggerAiQuestionGeneration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subject, topic, exam = 'JAMB', difficulty = 'medium', count = 5, autoApprove = false } = req.body;

    if (!subject) {
      res.status(400).json({ message: 'Subject is required.' });
      return;
    }

    const generated = await AIGenerationService.generateQuestions({
      subject,
      topic,
      exam,
      difficulty,
      count: Number(count) || 5,
      autoApprove: !!autoApprove,
    });

    await SecurityAuditService.recordAdminAction({
      adminUser: req.user?._id,
      adminEmail: req.user?.email,
      action: 'GENERATE_AI_QUESTIONS',
      resourceType: 'Question',
      details: { subject, topic, count, autoApprove },
    });

    res.status(201).json({
      message: `Successfully generated ${generated.length} ${autoApprove ? 'published' : 'draft'} questions!`,
      questions: generated,
    });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'AI generation failed' });
  }
};
