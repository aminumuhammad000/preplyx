import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import ExamSession from '../models/ExamSession';
import User from '../models/User';
import { DEFAULT_ACHIEVEMENTS } from './achievementController';
import { eventBus, EVENTS } from '../events/eventBus';
import { MistakeService } from '../services/mistakeService';

/**
 * @desc    Save a completed exam session
 * @route   POST /api/sessions
 * @access  Private
 */
/**
 * @desc    Start an exam session with assigned questions (server-tracked)
 * @route   POST /api/sessions/start
 * @access  Private
 */
export const startSession = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { exam = 'JAMB', subject = 'General', year, limit = 40 } = req.body;

    const query: any = { status: 'published' };
    if (exam) query.exam = exam;
    if (subject) query.subject = subject;
    if (year && year !== 'All') query.year = year;

    // Fetch random questions from database
    const questions = await mongoose.model('Question').aggregate([
      { $match: query },
      { $sample: { size: Number(limit) } },
      {
        $project: {
          _id: 1,
          text: 1,
          options: 1,
          exam: 1,
          subject: 1,
          topic: 1,
          subtopic: 1,
          difficulty: 1,
          year: 1,
          source: 1,
        },
      },
    ]);

    const questionIds = questions.map((q: any) => q._id.toString());

    // Create session record in progress
    const session = new ExamSession({
      user: req.user._id,
      exam,
      subject,
      status: 'in_progress',
      startedAt: new Date(),
      questionIds,
      total: questionIds.length,
      score: 0,
      percentage: 0,
      timeSpentSeconds: 0,
      details: [],
    });

    const savedSession = await session.save();

    res.status(201).json({
      success: true,
      sessionId: savedSession._id,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authoritatively grade and submit an exam session
 * @route   POST /api/sessions/submit, POST /api/sessions/:id/submit, POST /api/sessions
 * @access  Private
 */
export const submitSession = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.params.id || req.body.sessionId;
    const {
      exam,
      subject,
      timeSpentSeconds = 0,
      answers = [],
      confidences = {},
    } = req.body;

    let session: any = null;

    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      session = await ExamSession.findById(sessionId);
      if (!session) {
        res.status(404).json({ message: 'Exam session not found' });
        return;
      }

      // Verify session ownership (SEC: Session ownership check)
      if (session.user.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'Forbidden: You do not own this exam session' });
        return;
      }

      // Idempotency check: If already completed, return existing authoritative result
      if (session.status === 'completed') {
        res.json({
          success: true,
          message: 'Exam session already graded',
          data: session,
        });
        return;
      }
    } else {
      // Create session for backwards compatibility / ad-hoc tests
      session = new ExamSession({
        user: req.user._id,
        exam: exam || 'JAMB',
        subject: subject || 'General',
        status: 'in_progress',
        startedAt: new Date(),
      });
    }

    // Normalize student submitted answers
    let answersList: Array<{ questionId: string; selectedAnswer: string; confidence?: string }> = [];
    if (Array.isArray(answers)) {
      answersList = answers.map((a: any) => ({
        questionId: String(a.questionId || a.id || ''),
        selectedAnswer: String(a.selectedAnswer || a.userAnswer || ''),
        confidence: a.confidence || confidences[a.questionId || a.id] || 'somewhat_sure',
      }));
    } else if (typeof answers === 'object' && answers !== null) {
      answersList = Object.entries(answers).map(([qId, ans]) => ({
        questionId: String(qId),
        selectedAnswer: String(ans),
        confidence: confidences[qId] || 'somewhat_sure',
      }));
    }

    // Determine target question IDs (strictly deduplicated)
    let targetQuestionIds: string[] = [];
    if (session.questionIds && session.questionIds.length > 0) {
      // Bound to session-allocated questions to prevent injected questions
      targetQuestionIds = Array.from(new Set(session.questionIds.map(String)));
    } else {
      targetQuestionIds = Array.from(
        new Set(
          answersList
            .map((a) => a.questionId)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
        )
      );
      session.questionIds = targetQuestionIds;
    }

    // Retrieve authoritative questions from MongoDB (Academic Source of Truth)
    const QuestionModel = mongoose.model('Question');
    const authQuestions = await QuestionModel.find({
      _id: { $in: targetQuestionIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    const questionMap = new Map(authQuestions.map((q: any) => [q._id.toString(), q]));
    const studentAnswerMap = new Map(answersList.map((a) => [a.questionId, a]));

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    const details: any[] = [];
    const mistakesToLog: any[] = [];

    // Evaluate each authoritative question
    for (const qId of targetQuestionIds) {
      const q: any = questionMap.get(qId);
      if (!q) continue;

      const submission = studentAnswerMap.get(qId);
      const userAns = submission ? submission.selectedAnswer.trim() : '';
      const rawConfidence = submission ? submission.confidence : 'somewhat_sure';

      let normConfidence: 'very_sure' | 'somewhat_sure' | 'guessing' = 'somewhat_sure';
      if (rawConfidence === 'high' || rawConfidence === 'very_sure') normConfidence = 'very_sure';
      else if (rawConfidence === 'low' || rawConfidence === 'guessing') normConfidence = 'guessing';
      else normConfidence = 'somewhat_sure';

      const isCorrect = Boolean(userAns && userAns.toUpperCase() === q.correctAnswer.trim().toUpperCase());

      if (!userAns) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
        mistakesToLog.push({
          userId: req.user._id,
          exam: session.exam || q.exam || 'JAMB',
          subject: session.subject || q.subject || 'General',
          topic: q.topic || 'General',
          subtopic: q.subtopic || '',
          questionId: q._id.toString(),
          questionText: q.text,
          options: q.options || [],
          selectedAnswer: userAns,
          correctAnswer: q.correctAnswer,
          confidence: normConfidence,
          timeSpentSeconds: Math.round((Number(timeSpentSeconds) || 0) / Math.max(1, targetQuestionIds.length)),
        });
      }

      details.push({
        questionId: q._id.toString(),
        questionText: q.text,
        userAnswer: userAns,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || '',
      });
    }

    const totalQuestions = targetQuestionIds.length;
    const finalScore = correctCount;
    const finalPercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Persist authoritative results
    session.score = finalScore;
    session.total = totalQuestions;
    session.percentage = finalPercentage;
    session.correctCount = correctCount;
    session.incorrectCount = incorrectCount;
    session.unansweredCount = unansweredCount;
    session.timeSpentSeconds = Number(timeSpentSeconds) || 0;
    session.details = details;
    session.status = 'completed';
    session.submittedAt = new Date();

    const createdSession = await session.save();

    // Automatically record verified incorrect answers into Mistake Intelligence
    for (const m of mistakesToLog) {
      try {
        await MistakeService.logMistake(m);
      } catch (mistakeErr) {
        console.warn('Failed logging mistake from authoritative grading:', mistakeErr);
      }
    }

    // Trigger Preplyx Automation Engine background pipeline via EventBus
    eventBus.emitEvent(EVENTS.QUIZ_COMPLETED, {
      session: createdSession,
      sessionId: createdSession._id,
      userId: req.user._id,
      exam: createdSession.exam,
      subject: createdSession.subject,
      score: finalScore,
      total: totalQuestions,
      percentage: finalPercentage,
      timeSpentSeconds: createdSession.timeSpentSeconds,
    });

    // Check & trigger achievements for user
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        if (!user.achievements || user.achievements.length === 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          user.achievements = DEFAULT_ACHIEVEMENTS.map((a) => ({
            ...a,
            date: a.unlocked ? todayStr : undefined,
          }));
        }

        const totalUserSessions = await ExamSession.countDocuments({
          user: user._id,
          status: 'completed',
        });
        let updated = false;

        const checkAndUnlock = (achievementId: number, xpReward: number) => {
          const ach = user.achievements?.find((a: any) => a.id === achievementId);
          if (ach && !ach.unlocked) {
            ach.unlocked = true;
            ach.progress = 100;
            ach.date = new Date().toISOString().split('T')[0];
            user.xp = (user.xp || 0) + xpReward;

            const notif = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              type: 'achievement',
              title: 'Achievement Unlocked! 🎉',
              message: `Congratulations! You unlocked "${ach.name}" and earned +${xpReward} XP!`,
              time: 'Just now',
              unread: true,
            };
            if (!user.notifications) user.notifications = [];
            user.notifications.unshift(notif);
            updated = true;
          }
        };

        if (totalUserSessions >= 1) checkAndUnlock(2, 100);
        if (totalUserSessions >= 10) checkAndUnlock(3, 200);
        if (finalPercentage >= 100) checkAndUnlock(5, 400);
        if (totalUserSessions >= 50) checkAndUnlock(7, 600);
        if (session.timeSpentSeconds > 0 && session.timeSpentSeconds < 1800) checkAndUnlock(10, 1000);

        if (updated) {
          await user.save();
        }
      }
    } catch (achErr) {
      console.error('Failed updating achievement on submitSession:', achErr);
    }

    res.status(201).json({
      success: true,
      data: createdSession,
      sessionId: createdSession._id,
      score: finalScore,
      total: totalQuestions,
      percentage: finalPercentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      timeSpentSeconds: session.timeSpentSeconds,
      details,
    });
  } catch (error) {
    next(error);
  }
};

export const saveSession = submitSession;

/**
 * @desc    Get user's past sessions
 * @route   GET /api/sessions
 * @access  Private
 */
export const getUserSessions = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessions = await ExamSession.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's analytics
 * @route   GET /api/sessions/analytics
 * @access  Private
 */
export const getUserAnalytics = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessions = await ExamSession.find({ user: req.user._id }).sort({ createdAt: -1 });

    if (sessions.length === 0) {
      res.json({
        totalSessions: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        streak: 0,
        activeDates: [],
      });
      return;
    }

    const totalSessions = sessions.length;
    const totalScorePercentage = sessions.reduce((acc, curr) => acc + curr.percentage, 0);
    const averageScore = totalScorePercentage / totalSessions;
    const totalTimeSpent = sessions.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);

    const activeDates = [...new Set(sessions.map(s => s.createdAt.toISOString().split('T')[0]))];
    const sortedDates = activeDates.sort().reverse();
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < sortedDates.length; i++) {
      const current = new Date(sortedDates[i]);
      const prev = i > 0 ? new Date(sortedDates[i-1]) : new Date(today);
      const diffDays = Math.abs(current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 1) streak++;
      else break;
    }

    res.json({
      totalSessions,
      averageScore: Math.round(averageScore * 100) / 100,
      totalTimeSpent,
      streak,
      activeDates,
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    const session = await ExamSession.findOne({ 
      _id: id, 
      user: req.user._id 
    });
    
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }
    
    res.json(session);
  } catch (error) {
    next(error);
  }
};

export const getReviewedQuestions = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessions = await ExamSession.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    if (sessions.length === 0) {
      res.json([]);
      return;
    }
    
    const reviewedQuestions: any[] = [];
    
    sessions.forEach(session => {
      session.details.forEach((detail: any) => {
        reviewedQuestions.push({
          id: detail.questionId,
          question: detail.questionText,
          userAnswer: detail.userAnswer,
          correctAnswer: detail.correctAnswer,
          isCorrect: detail.isCorrect,
          explanation: detail.explanation,
          subject: session.subject,
          exam: session.exam,
          bookmarked: false, // Could be implemented later
          date: session.createdAt.toISOString().split('T')[0],
          sessionId: session._id,
        });
      });
    });
    
    res.json(reviewedQuestions);
  } catch (error) {
    next(error);
  }
};
