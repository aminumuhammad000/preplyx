import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import ExamSession from '../models/ExamSession';

/**
 * @desc    Get user overall stats
 * @route   GET /api/data/stats
 * @access  Private
 */
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    const sessions = await ExamSession.find({ user: req.user._id, status: 'completed' });
    
    if (sessions.length === 0) {
      res.json({
        questionsAnswered: 0,
        averageAccuracy: 0,
        studyTimeSeconds: 0,
        currentStreak: 0,
        monthlyStreak: 0
      });
      return;
    }

    const totalQuestions = sessions.reduce((acc, curr) => acc + curr.total, 0);
    const averageAccuracy = sessions.reduce((acc, curr) => acc + curr.percentage, 0) / sessions.length;
    const studyTimeSeconds = sessions.reduce((acc, curr) => acc + curr.timeSpentSeconds, 0);
    
    // Streak calculation
    const activeDates = [...new Set(sessions.map(s => s.createdAt.toISOString().split('T')[0]))];
    const sortedDates = activeDates.sort().reverse();
    
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < sortedDates.length; i++) {
      const current = new Date(sortedDates[i]);
      const prev = i > 0 ? new Date(sortedDates[i-1]) : new Date(today);
      const diffDays = Math.abs(current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 1) currentStreak++;
      else break;
    }

    // Monthly streak (sessions in current month)
    const currentMonth = new Date().getMonth();
    const monthlyStreak = sessions.filter(s => s.createdAt.getMonth() === currentMonth).length;

    res.json({
      questionsAnswered: totalQuestions,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      studyTimeSeconds,
      currentStreak,
      monthlyStreak
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    const sessions = await ExamSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Error fetching sessions' });
  }
};

export const getSubjectMastery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    const sessions = await ExamSession.find({ user: req.user._id, status: 'completed' });
    
    if (sessions.length === 0) {
      res.json([]);
      return;
    }
    
    // Calculate subject-wise performance
    const subjectPerformance: Record<string, { total: number; correct: number; totalScore: number; totalSessions: number }> = {};
    
    sessions.forEach(session => {
      const subject = session.subject;
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { total: 0, correct: 0, totalScore: 0, totalSessions: 0 };
      }
      
      subjectPerformance[subject].total += session.total;
      subjectPerformance[subject].totalScore += session.score;
      subjectPerformance[subject].totalSessions += 1;
      
      const correct = Math.round((session.percentage / 100) * session.total);
      subjectPerformance[subject].correct += correct;
    });

    const subjectMastery = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      mastery: Math.round((data.correct / data.total) * 100) || 0,
      averageScore: Math.round(data.totalScore / data.totalSessions) || 0,
      totalSessions: data.totalSessions,
      fill: '#7B2FF7'
    }));

    res.json(subjectMastery);
  } catch (error) {
    console.error('Error fetching subject mastery:', error);
    res.status(500).json({ message: 'Error fetching subject mastery' });
  }
};
