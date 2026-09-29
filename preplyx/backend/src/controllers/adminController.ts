import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Transaction from '../models/Transaction';
import Wallet from '../models/Wallet';
import User from '../models/User';
import Exam from '../models/Exam';
import Question from '../models/Question';
import ExamSession from '../models/ExamSession';
import SystemConfig from '../models/SystemConfig';
import { sendTestEmail, verifySmtpConnection } from '../services/emailService';
import { testAiModelConnection } from '../services/agentRouterService';


export const getAdminWalletStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalDepositsAggr = await Transaction.aggregate([
      { $match: { type: 'funding', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDeposits = totalDepositsAggr[0]?.total || 0;

    const totalUnlocksAggr = await Transaction.aggregate([
      { $match: { type: 'spending', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalUnlocks = totalUnlocksAggr[0]?.total || 0;

    const totalVirtualAccounts = await Wallet.countDocuments({ 'virtualAccount.accountNumber': { $exists: true } });

    res.json({
      totalDeposits,
      totalVirtualAccounts,
      totalUnlocks
    });
  } catch (error) {
    console.error('Error fetching admin wallet stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

export const getAdminTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, type, status, page = 1, limit = 10 } = req.query;
    const query: any = {};
    
    if (type && type !== 'All' && type !== 'all') {
      query.type = type;
    }
    if (status && status !== 'All' && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      const searchStr = String(search).trim();
      // Find users matching search term
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: searchStr, $options: 'i' } },
          { email: { $regex: searchStr, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      
      const orConditions: any[] = [
        { user: { $in: userIds } },
        { description: { $regex: searchStr, $options: 'i' } }
      ];
      
      if (searchStr.match(/^[0-9a-fA-F]{24}$/)) {
        orConditions.push({ _id: searchStr });
      } else {
        orConditions.push({ reference: { $regex: searchStr, $options: 'i' } });
      }
      
      query.$or = orConditions;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name email'),
      Transaction.countDocuments(query)
    ]);
    
    res.json({
      transactions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

export const getAdminUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const updateUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
};

export const deleteAdminUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

/* ══════════════════════════════════════
   EXAM MANAGEMENT
══════════════════════════════════════ */

export const getAdminExams = async (req: Request, res: Response): Promise<void> => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });

    // Attach live question count and session count per exam
    const enriched = await Promise.all(
      exams.map(async (exam) => {
        const [questionCount, sessionCount] = await Promise.all([
          Question.countDocuments({ exam: exam.name }),
          ExamSession.countDocuments({ exam: exam.name }),
        ]);
        return {
          ...exam.toObject(),
          liveQuestionCount: questionCount,
          liveSessionCount: sessionCount,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching admin exams:', error);
    res.status(500).json({ message: 'Error fetching exams' });
  }
};

export const createAdminExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, displayName, description, color, years, subjects } = req.body;
    if (!name || !displayName || !description || !color || !years) {
      res.status(400).json({ message: 'name, displayName, description, color and years are required' });
      return;
    }
    const exists = await Exam.findOne({ name: name.toUpperCase() });
    if (exists) {
      res.status(409).json({ message: 'An exam with this name already exists' });
      return;
    }
    const exam = await Exam.create({
      name: name.toUpperCase(),
      displayName,
      description,
      color,
      years,
      subjects: subjects || [],
    });
    res.status(201).json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ message: 'Error creating exam' });
  }
};

export const updateAdminExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { displayName, description, color, years, subjects } = req.body;
    const exam = await Exam.findByIdAndUpdate(
      id,
      { displayName, description, color, years, subjects },
      { new: true, runValidators: true }
    );
    if (!exam) {
      res.status(404).json({ message: 'Exam not found' });
      return;
    }
    res.json(exam);
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ message: 'Error updating exam' });
  }
};

export const deleteAdminExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByIdAndDelete(id);
    if (!exam) {
      res.status(404).json({ message: 'Exam not found' });
      return;
    }
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ message: 'Error deleting exam' });
  }
};

/* ══════════════════════════════════════
   DASHBOARD OVERVIEW
══════════════════════════════════════ */

export const getAdminDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Run all queries in parallel
    const [
      totalStudents,
      activeToday,
      totalQuestions,
      allExams,
      totalRevenueAggr,
      depositsTodayAggr,
      totalUnlocks,
      recentTransactions,
      totalSessions,
    ] = await Promise.all([
      // Total students
      User.countDocuments(),
      // Active today = unique users with sessions today
      ExamSession.distinct('user', { createdAt: { $gte: todayStart } }).then(arr => arr.length),
      // Total questions
      Question.countDocuments(),
      // All exams (to count subjects)
      Exam.find().select('subjects'),
      // Total revenue (all completed funding)
      Transaction.aggregate([
        { $match: { type: 'funding', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Deposits today
      Transaction.aggregate([
        { $match: { type: 'funding', status: 'completed', createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Results unlocked (spending transactions)
      Transaction.countDocuments({ type: 'spending', status: 'completed' }),
      // Recent 5 transactions
      Transaction.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email'),
      // Total exam sessions
      ExamSession.countDocuments(),
    ]);

    // Count unique subjects across all exams
    const uniqueSubjects = new Set(allExams.flatMap(e => e.subjects));

    res.json({
      totalStudents,
      activeToday,
      totalQuestions,
      totalSubjects: uniqueSubjects.size,
      totalRevenue: totalRevenueAggr[0]?.total || 0,
      depositsToday: depositsTodayAggr[0]?.total || 0,
      totalUnlocks,
      totalSessions,
      totalExams: allExams.length,
      recentTransactions,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

export const getAdminAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      revenueTrend,
      signupTrend,
      examDistribution,
      totalUsers,
      totalRevenueAggr,
      totalSessions,
      averageScoreAggr
    ] = await Promise.all([
      // Revenue over last 30 days
      Transaction.aggregate([
        { $match: { type: 'funding', status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Signups over last 30 days
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            users: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Exam distribution (most popular exams)
      ExamSession.aggregate([
        {
          $group: {
            _id: "$examType",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Top metrics
      User.countDocuments(),
      Transaction.aggregate([
        { $match: { type: 'funding', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      ExamSession.countDocuments(),
      ExamSession.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, avgScore: { $avg: "$score" } } }
      ])
    ]);

    // Format trends to merge by date
    const trendMap = new Map<string, { date: string; revenue: number; users: number }>();
    
    // Fill last 30 days empty
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split('T')[0];
      trendMap.set(dateStr, { date: dateStr, revenue: 0, users: 0 });
    }

    revenueTrend.forEach(item => {
      if (trendMap.has(item._id)) {
        trendMap.get(item._id)!.revenue = item.revenue;
      }
    });

    signupTrend.forEach(item => {
      if (trendMap.has(item._id)) {
        trendMap.get(item._id)!.users = item.users;
      }
    });

    res.json({
      metrics: {
        totalUsers,
        totalRevenue: totalRevenueAggr[0]?.total || 0,
        totalSessions,
        averageScore: averageScoreAggr[0]?.avgScore || 0
      },
      trends: Array.from(trendMap.values()),
      examDistribution: examDistribution.map(d => ({ name: d._id || 'Unknown', value: d.count }))
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics data' });
  }
};

/* ══════════════════════════════════════
   SUBJECT MANAGEMENT
══════════════════════════════════════ */

import Subject from '../models/Subject';

export const getAdminSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    
    // Attach live question count per subject
    const enriched = await Promise.all(
      subjects.map(async (subject) => {
        const questionCount = await Question.countDocuments({ subject: subject.name });
        return {
          ...subject.toObject(),
          liveQuestionCount: questionCount,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching admin subjects:', error);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
};

export const createAdminSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, categories, icon, tips } = req.body;
    if (!name || !categories || !icon) {
      res.status(400).json({ message: 'name, categories, and icon are required' });
      return;
    }
    const exists = await Subject.findOne({ name: name });
    if (exists) {
      res.status(409).json({ message: 'A subject with this name already exists' });
      return;
    }
    const subject = await Subject.create({
      name,
      categories,
      icon,
      tips,
    });
    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ message: 'Error creating subject' });
  }
};

export const updateAdminSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, categories, icon, tips } = req.body;
    
    // Check if renaming to an existing subject
    if (name) {
      const existing = await Subject.findOne({ name, _id: { $ne: id } });
      if (existing) {
        res.status(409).json({ message: 'A subject with this name already exists' });
        return;
      }
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      { name, categories, icon, tips },
      { new: true, runValidators: true }
    );
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    res.json(subject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Error updating subject' });
  }
};

export const deleteAdminSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject) {
      res.status(404).json({ message: 'Subject not found' });
      return;
    }
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ message: 'Error deleting subject' });
  }
};

/* ══════════════════════════════════════
   QUESTION MANAGEMENT
══════════════════════════════════════ */

export const getAdminQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam, subject, page = 1, limit = 50, search = '' } = req.query;
    const query: any = {};
    
    if (exam && exam !== 'All') query.exam = exam;
    if (subject && subject !== 'All') query.subject = subject;
    if (search) {
      query.text = { $regex: search, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [questions, total] = await Promise.all([
      Question.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Question.countDocuments(query)
    ]);

    res.json({
      questions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error fetching admin questions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

export const bulkCreateAdminQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawQuestions = Array.isArray(req.body) ? req.body : req.body.questions;
    
    if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      res.status(400).json({ message: 'No questions provided for bulk import' });
      return;
    }

    const formattedQuestions = rawQuestions.map((q: any) => ({
      exam: q.exam ? String(q.exam).trim() : 'JAMB',
      subject: q.subject ? String(q.subject).trim() : 'Physics',
      topic: q.topic ? String(q.topic).trim() : 'General',
      year: q.year ? String(q.year).trim() : '2024',
      difficulty: q.difficulty || 'medium',
      status: q.status || 'published',
      text: q.text ? String(q.text).trim() : '',
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [],
      correctAnswer: q.correctAnswer ? String(q.correctAnswer).trim() : '',
      explanation: q.explanation ? String(q.explanation).trim() : '',
      qualityFlags: Array.isArray(q.qualityFlags) ? q.qualityFlags : []
    })).filter((q: any) => q.text && q.options.length >= 2 && q.correctAnswer);

    if (formattedQuestions.length === 0) {
      res.status(400).json({ message: 'None of the provided questions met the required validation format (text, options, correctAnswer)' });
      return;
    }

    const inserted = await Question.insertMany(formattedQuestions, { ordered: false });

    res.status(201).json({
      message: `Successfully imported ${inserted.length} questions into question bank!`,
      count: inserted.length,
      questions: inserted
    });
  } catch (error: any) {
    console.error('Error during bulk question import:', error);
    res.status(500).json({ message: error?.message || 'Error importing questions in bulk' });
  }
};

export const createAdminQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    // If an array or batch of questions is sent to this endpoint, delegate to bulk create
    if (Array.isArray(req.body) || (req.body && Array.isArray(req.body.questions))) {
      return bulkCreateAdminQuestions(req, res);
    }

    const { exam, subject, topic, year, difficulty, status, text, options, correctAnswer, explanation } = req.body;
    
    if (!exam || !subject || !text || !options || !correctAnswer) {
      res.status(400).json({ message: 'Missing required fields (exam, subject, text, options, correctAnswer)' });
      return;
    }

    const question = await Question.create({
      exam: String(exam).trim(),
      subject: String(subject).trim(),
      topic: topic ? String(topic).trim() : 'General',
      year: year ? String(year).trim() : '2024',
      difficulty: difficulty || 'medium',
      status: status || 'published',
      text: String(text).trim(),
      options: Array.isArray(options) ? options.map((o: any) => String(o).trim()) : [],
      correctAnswer: String(correctAnswer).trim(),
      explanation: explanation ? String(explanation).trim() : ''
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Error creating question' });
  }
};

export const updateAdminQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { exam, subject, text, options, correctAnswer, explanation } = req.body;

    const question = await Question.findByIdAndUpdate(
      id,
      { exam, subject, text, options, correctAnswer, explanation },
      { new: true, runValidators: true }
    );

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Error updating question' });
  }
};

export const deleteAdminQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const question = await Question.findByIdAndDelete(id);
    
    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

/**
 * MOCK OCR SCANNER ENDPOINT
 * This simulates an AI reading an uploaded question paper image and extracting the questions.
 */
export const scanQuestionPaper = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real application, you would accept req.file or req.body.image
    // and pass it to an OCR/AI service like Gemini Pro Vision or Tesseract.
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    const mockScannedQuestions = [
      {
        text: "What is the capital of Nigeria?",
        options: ["Lagos", "Abuja", "Kano", "Port Harcourt"],
        correctAnswer: "Abuja",
        explanation: "Abuja replaced Lagos as the capital in 1991."
      },
      {
        text: "Solve for y: 3y - 7 = 14",
        options: ["y = 4", "y = 7", "y = 21", "y = -7"],
        correctAnswer: "y = 7",
        explanation: "3y = 14 + 7 -> 3y = 21 -> y = 7."
      },
      {
        text: "Which of the following is not a programming language?",
        options: ["Python", "Java", "HTML", "C++"],
        correctAnswer: "HTML",
        explanation: "HTML is a markup language, not a programming language."
      }
    ];

    res.json({
      message: 'Scan successful',
      questions: mockScannedQuestions
    });
  } catch (error) {
    console.error('Error scanning question paper:', error);
    res.status(500).json({ message: 'Failed to scan question paper' });
  }
};

/* ══════════════════════════════════════
   SIMULATION MANAGEMENT
══════════════════════════════════════ */

export const getAdminSimulations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exam, subject, page = 1, limit = 50 } = req.query;
    const query: any = {};
    
    if (exam && exam !== 'All') query.exam = exam;
    if (subject && subject !== 'All') query.subject = subject;

    const skip = (Number(page) - 1) * Number(limit);

    // Fetch sessions
    const [sessions, total, allSessionsForStats] = await Promise.all([
      ExamSession.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'name email'),
      ExamSession.countDocuments(query),
      ExamSession.find(query).select('score total timeSpentSeconds') // for global stats
    ]);

    // Calculate aggregated stats
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalTime = 0;
    let passCount = 0;

    allSessionsForStats.forEach(s => {
      totalScore += s.score;
      totalMaxScore += s.total;
      totalTime += s.timeSpentSeconds;
      if ((s.score / s.total) >= 0.5) passCount++; // 50% pass mark assumption
    });

    const avgScore = allSessionsForStats.length > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const avgTime = allSessionsForStats.length > 0 ? Math.round(totalTime / allSessionsForStats.length) : 0;
    const passRate = allSessionsForStats.length > 0 ? Math.round((passCount / allSessionsForStats.length) * 100) : 0;

    res.json({
      sessions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      stats: {
        totalSessions: allSessionsForStats.length,
        avgScore,
        avgTime,
        passRate
      }
    });
  } catch (error) {
    console.error('Error fetching admin simulations:', error);
    res.status(500).json({ message: 'Error fetching simulation sessions' });
  }
};

export const getAdminWalletConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({});
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching admin wallet config:', error);
    res.status(500).json({ message: 'Error fetching config' });
  }
};

export const updateAdminWalletConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { examUnlockFee, welcomeBonus, virtualAccountFee } = req.body;
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }
    
    if (examUnlockFee !== undefined) config.examUnlockFee = Number(examUnlockFee);
    if (welcomeBonus !== undefined) config.welcomeBonus = Number(welcomeBonus);
    if (virtualAccountFee !== undefined) config.virtualAccountFee = Number(virtualAccountFee);
    
    await config.save();
    res.json({ message: 'Configuration updated successfully', config });
  } catch (error) {
    console.error('Error updating admin wallet config:', error);
    res.status(500).json({ message: 'Error updating config' });
  }
};

export const getAdminSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({});
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
};

export const updateAdminSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldsToUpdate = req.body;
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }
    
    Object.keys(fieldsToUpdate).forEach(key => {
      if (!['_id', 'createdAt', 'updatedAt', '__v'].includes(key)) {
        (config as any)[key] = fieldsToUpdate[key];
      }
    });
    
    await config.save();
    res.json({ message: 'Settings updated successfully', config });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
};

export const testAdminEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure, smtpFrom } = req.body;
    const recipient = targetEmail || smtpUser;

    if (!recipient) {
      res.status(400).json({ success: false, message: 'Recipient email address or SMTP Username is required' });
      return;
    }

    const customConfig = (smtpUser || smtpPass || smtpHost) ? {
      host: smtpHost,
      port: smtpPort ? Number(smtpPort) : undefined,
      user: smtpUser,
      pass: smtpPass,
      secure: smtpSecure,
      from: smtpFrom
    } : undefined;

    // Verify SMTP connection first
    const verification = await verifySmtpConnection(customConfig);
    if (!verification.success) {
      res.status(400).json({ success: false, message: verification.message });
      return;
    }

    // Send actual test email
    const sendResult = await sendTestEmail(recipient, customConfig);
    if (sendResult.success) {
      res.json({ success: true, message: sendResult.message });
    } else {
      res.status(400).json({ success: false, message: sendResult.message });
    }
  } catch (error: any) {
    console.error('Error in testAdminEmailConfig:', error);
    res.status(500).json({ success: false, message: error?.message || 'Server error testing SMTP configuration' });
  }
};

export const testAdminAiConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId, apiKey, anthropicAuthToken, anthropicBaseUrl, anthropicModel, geminiApiKey } = req.body;
    
    const result = await testAiModelConnection({
      providerId,
      apiKey,
      anthropicAuthToken,
      anthropicBaseUrl,
      anthropicModel,
      geminiApiKey
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in testAdminAiConfig:', error);
    res.status(500).json({ success: false, message: error?.message || 'Server error testing AI model credentials' });
  }
};
/* ══════════════════════════════════════
   NOTIFICATIONS MANAGEMENT
══════════════════════════════════════ */
import BroadcastNotification from '../models/BroadcastNotification';

export const getAdminBroadcasts = async (req: Request, res: Response): Promise<void> => {
  try {
    const broadcasts = await BroadcastNotification.find().sort({ createdAt: -1 }).limit(100);
    res.json(broadcasts);
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    res.status(500).json({ message: 'Error fetching broadcasts' });
  }
};

export const sendBroadcastNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message, type, targetAudience = 'all', targetEmail } = req.body;
    
    if (!title || !message) {
      res.status(400).json({ message: 'Title and message are required' });
      return;
    }

    if (targetAudience === 'specific' && !targetEmail) {
      res.status(400).json({ message: 'Email is required for specific user' });
      return;
    }

    // Determine query based on target audience
    let userQuery: any = {};
    if (targetAudience === 'active') {
      userQuery.status = 'active';
    } else if (targetAudience === 'suspended') {
      userQuery.status = 'suspended';
    } else if (targetAudience === 'specific') {
      userQuery.email = targetEmail;
      const userExists = await User.findOne(userQuery);
      if (!userExists) {
        res.status(404).json({ message: 'User with this email not found' });
        return;
      }
    }

    // 1. Save to broadcast history
    const broadcast = new BroadcastNotification({
      title,
      message,
      type: type || 'info',
      targetAudience,
      targetEmail: targetAudience === 'specific' ? targetEmail : undefined,
    });
    await broadcast.save();

    // 2. Append to target users' notification array
    const userNotificationObj = {
      id: Date.now(),
      type: type || 'info',
      title,
      message,
      time: 'Just now',
      unread: true,
    };

    const updateResult = await User.updateMany(
      userQuery, 
      { $push: { notifications: { $each: [userNotificationObj], $position: 0 } } }
    );

    res.status(201).json({ 
      message: 'Broadcast sent successfully', 
      broadcast,
      usersReached: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ message: 'Error sending broadcast' });
  }
};
/* ══════════════════════════════════════
   SUPPORT CENTER MANAGEMENT
══════════════════════════════════════ */
import SupportTicket from '../models/SupportTicket';

export const getAdminTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const tickets = await SupportTicket.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Error fetching support tickets' });
  }
};

export const replyAdminTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    if (status) ticket.status = status;
    if (adminReply !== undefined) ticket.adminReply = adminReply;

    await ticket.save();

    // Optionally: we could push a notification to the user here
    if (adminReply && status === 'resolved') {
       const userNotificationObj = {
         id: Date.now(),
         type: 'success',
         title: 'Support Ticket Resolved',
         message: `Your ticket regarding "${ticket.subject}" has been resolved.`,
         time: 'Just now',
         unread: true,
       };
       await User.findByIdAndUpdate(ticket.user, {
         $push: { notifications: { $each: [userNotificationObj], $position: 0 } }
       });
    }

    // Re-fetch with populated user to return the full object
    const updatedTicket = await SupportTicket.findById(id).populate('user', 'name email');

    res.json({ message: 'Ticket updated successfully', ticket: updatedTicket });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({ message: 'Error updating support ticket' });
  }
};

export const creditUserWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, email, amount, description } = req.body;
    const creditAmount = Number(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      res.status(400).json({ message: 'Invalid credit amount. Enter a positive number.' });
      return;
    }

    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!targetUser) {
      targetUser = await User.findOne({ role: 'admin' }) || await User.findOne();
    }

    if (!targetUser) {
      res.status(404).json({ message: 'Target user not found' });
      return;
    }

    let wallet = await Wallet.findOne({ user: targetUser._id });
    if (!wallet) {
      wallet = await Wallet.create({
        user: targetUser._id,
        balance: 0,
        totalFunded: 0,
        totalSpent: 0
      });
    }

    const previousBalance = wallet.balance;
    wallet.balance += creditAmount;
    wallet.totalFunded += creditAmount;
    await wallet.save();

    await Transaction.create({
      user: targetUser._id,
      type: 'funding',
      amount: creditAmount,
      balanceBefore: previousBalance,
      balanceAfter: wallet.balance,
      status: 'completed',
      description: description || 'Admin Wallet Credit'
    });

    res.json({
      message: `Successfully credited ₦${creditAmount.toLocaleString()} to ${targetUser.name}'s wallet`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email
      },
      balance: wallet.balance,
      totalFunded: wallet.totalFunded
    });
  } catch (error) {
    console.error('Error crediting wallet:', error);
    res.status(500).json({ message: 'Error processing wallet credit' });
  }
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({
      $or: [{ email }, { name: email }],
      role: 'admin'
    });

    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET as string,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isAdmin: true
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid administrative credentials' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Admin authentication failed' });
  }
};

