import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import QuestionReport from '../models/QuestionReport';

export const submitQuestionReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const {
      questionId,
      questionText,
      exam,
      subject,
      reportType,
      issueType,
      userNotes,
      description,
    } = req.body;

    // Canonicalize reportType and userNotes
    const canonicalReportType = reportType || issueType;
    const canonicalNotes = userNotes || description || 'Content issue flagged by student';

    if (!questionId || !canonicalReportType) {
      res.status(400).json({ message: 'questionId and reportType (or issueType) are required' });
      return;
    }

    // Check for duplicate pending report from the same student
    const existingPendingReport = await QuestionReport.findOne({
      user: req.user._id,
      questionId,
      status: 'pending',
    });

    if (existingPendingReport) {
      res.status(409).json({
        success: false,
        message: 'You have already submitted a report for this question that is currently pending review.',
        reportId: existingPendingReport._id,
      });
      return;
    }

    let qText = questionText;
    let qExam = exam;
    let qSubj = subject;

    if (!qText || !qExam || !qSubj) {
      const Question = (await import('../models/Question')).default;
      const foundQ = await Question.findById(questionId);
      if (foundQ) {
        qText = qText || foundQ.text;
        qExam = qExam || foundQ.exam;
        qSubj = qSubj || foundQ.subject;
      }
    }

    const report = await QuestionReport.create({
      user: req.user._id,
      questionId,
      questionText: qText || '',
      exam: qExam || 'JAMB',
      subject: qSubj || 'General',
      reportType: canonicalReportType,
      userNotes: canonicalNotes,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for reporting this issue. Our academic content review team will investigate and verify it.',
      reportId: report._id,
    });
  } catch (error: any) {
    console.error('Error submitting question report:', error);
    res.status(500).json({ message: error.message || 'Failed to submit report' });
  }
};

export const getQuestionReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, limit = 50 } = req.query;
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const reports = await QuestionReport.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(reports);
  } catch (error: any) {
    console.error('Error fetching question reports:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch reports' });
  }
};

export const updateQuestionReportStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const report = await QuestionReport.findById(id);
    if (!report) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    if (status) report.status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;

    await report.save();
    res.json({ success: true, report });
  } catch (error: any) {
    console.error('Error updating question report:', error);
    res.status(500).json({ message: error.message || 'Failed to update report' });
  }
};
