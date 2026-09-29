import mongoose from 'mongoose';
import User from '../models/User';
import UserOnboarding, { IUserOnboarding } from '../models/UserOnboarding';
import ExamSession from '../models/ExamSession';
import Question, { IQuestion } from '../models/Question';
import MistakeLog from '../models/MistakeLog';
import StudentTopicPerformance from '../models/StudentTopicPerformance';
import StudentSubjectPerformance from '../models/StudentSubjectPerformance';
import { NotificationService } from './notificationService';

export interface SetupTargetInput {
  userId: string | mongoose.Types.ObjectId;
  targetExam: string;
  targetScore: number;
  examDate?: Date | string;
  targetCourse?: string;
  targetInstitution?: string;
  subjects: string[];
  dailyStudyMinutes?: number;
  confidenceLevel?: string;
}

export interface DiagnosticResult {
  score: number;
  total: number;
  percentage: number;
  strongestSubject: string;
  weakestSubject: string;
  biggestOpportunityTopic: string;
  currentReadiness: number;
  targetScore: number;
  recommendedFirstMission: {
    subject: string;
    topic: string;
    questionCount: number;
    description: string;
  };
}

export interface DailyMissionItem {
  id: string;
  title: string;
  description: string;
  subject?: string;
  topic?: string;
  targetCount?: number;
  estimatedMinutes: number;
  completed: boolean;
  actionUrl: string;
  type: 'review_mistakes' | 'weak_topic' | 'speed_drill' | 'subject_practice' | 'mock_test';
}

export interface DailyMission {
  targetExam: string;
  targetScore: number;
  readinessScore: number;
  completedCount: number;
  totalCount: number;
  items: DailyMissionItem[];
}

export class OnboardingService {
  /**
   * Initializes onboarding state for newly registered user
   */
  public static async initializeUserOnboarding(userId: string | mongoose.Types.ObjectId): Promise<IUserOnboarding> {
    let onboarding = await UserOnboarding.findOne({ user: userId });
    if (onboarding) return onboarding;

    onboarding = await UserOnboarding.create({
      user: userId,
      completedSteps: ['profile_created'],
      isCompleted: false,
      remindersSent: [],
    });

    return onboarding;
  }

  /**
   * Saves student target score, target exam, subjects, and study preferences
   */
  public static async setupTargetAndPlan(input: SetupTargetInput): Promise<any> {
    const {
      userId,
      targetExam = 'JAMB',
      targetScore = 280,
      examDate,
      targetCourse = '',
      targetInstitution = '',
      subjects = ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
      dailyStudyMinutes = 60,
      confidenceLevel = 'moderate',
    } = input;

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    user.targetExam = targetExam;
    user.targetScore = Number(targetScore);
    user.exam_type = targetExam;
    if (examDate) user.examDate = new Date(examDate);
    user.targetCourse = targetCourse;
    user.targetInstitution = targetInstitution;
    user.subjects = subjects;
    user.dailyStudyMinutes = Number(dailyStudyMinutes);
    user.confidenceLevel = confidenceLevel;
    user.onboardingCompleted = true;

    await user.save();

    // Mark onboarding step
    let onboarding = await UserOnboarding.findOne({ user: userId });
    if (onboarding) {
      if (!onboarding.completedSteps.includes('target_set')) {
        onboarding.completedSteps.push('target_set');
      }
      await onboarding.save();
    }

    return {
      success: true,
      targetExam,
      targetScore,
      subjects,
      targetCourse,
      targetInstitution,
    };
  }

  /**
   * Get 15 diagnostic questions spanning student's selected subjects
   */
  public static async getDiagnosticQuestions(
    userId: string | mongoose.Types.ObjectId
  ): Promise<any[]> {
    const user = await User.findById(userId);
    const exam = user?.targetExam || user?.exam_type || 'JAMB';
    const userSubjects = user?.subjects && user.subjects.length > 0
      ? user.subjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

    // Aim for 3-4 questions per subject up to 15 total
    const questionsPerSubj = Math.max(3, Math.floor(15 / userSubjects.length));
    const collected: any[] = [];

    for (const subj of userSubjects) {
      const qList = await Question.aggregate([
        { $match: { exam, subject: subj, status: 'published' } },
        { $sample: { size: questionsPerSubj } },
      ]);
      collected.push(...qList);
    }

    // If database had fewer questions, supplement with general pool
    if (collected.length < 15) {
      const remainingNeeded = 15 - collected.length;
      const existingIds = collected.map((q) => q._id);
      const fillers = await Question.aggregate([
        { $match: { exam, _id: { $nin: existingIds }, status: 'published' } },
        { $sample: { size: remainingNeeded } },
      ]);
      collected.push(...fillers);
    }

    // Format questions for safe frontend transmission (hide correctAnswer)
    return collected.map((q, idx) => ({
      id: q._id,
      index: idx + 1,
      exam: q.exam,
      subject: q.subject,
      topic: q.topic || 'General',
      text: q.text,
      options: q.options,
      difficulty: q.difficulty || 'medium',
      source: q.source || 'official_past_question',
    }));
  }

  /**
   * Grade diagnostic assessment and compute starting point
   */
  public static async completeDiagnostic(
    userId: string | mongoose.Types.ObjectId,
    answers: Record<string, string>,
    confidenceMap: Record<string, string> = {}
  ): Promise<DiagnosticResult> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const questionIds = Object.keys(answers);
    const questions = await Question.find({ _id: { $in: questionIds } });

    let score = 0;
    const total = questions.length || 15;
    const subjectStats: Record<string, { correct: number; total: number; topics: Record<string, { correct: number; total: number }> }> = {};

    for (const q of questions) {
      const qIdStr = q._id.toString();
      const userAns = answers[qIdStr];
      const isCorrect = userAns === q.correctAnswer;
      const userConfidence = (confidenceMap[qIdStr] as any) || 'somewhat_sure';

      if (!subjectStats[q.subject]) {
        subjectStats[q.subject] = { correct: 0, total: 0, topics: {} };
      }
      subjectStats[q.subject].total += 1;

      const topicName = q.topic || 'General';
      if (!subjectStats[q.subject].topics[topicName]) {
        subjectStats[q.subject].topics[topicName] = { correct: 0, total: 0 };
      }
      subjectStats[q.subject].topics[topicName].total += 1;

      if (isCorrect) {
        score++;
        subjectStats[q.subject].correct += 1;
        subjectStats[q.subject].topics[topicName].correct += 1;
      } else {
        // Log mistake into Mistake Intelligence
        await MistakeLog.create({
          user: user._id,
          exam: q.exam,
          subject: q.subject,
          topic: q.topic || 'General',
          subtopic: q.subtopic || '',
          questionId: q._id.toString(),
          questionText: q.text,
          options: q.options,
          selectedAnswer: userAns || 'Skipped',
          correctAnswer: q.correctAnswer,
          confidence: userConfidence,
          cognitiveTrap: q.cognitiveTrap || `Misidentified condition in ${q.topic}`,
          conceptSummary: q.conceptSummary || `Core rule of ${q.topic}`,
          difficulty: q.difficulty || 'medium',
          attemptsCount: 1,
          reviewStage: 0,
          nextReviewDate: new Date(),
          mastered: false,
          lastAttemptDate: new Date(),
        }).catch(() => {});
      }
    }

    const percentage = Math.round((score / total) * 100);

    // Identify strongest and weakest subjects
    let strongestSubject = 'English Language';
    let weakestSubject = 'Chemistry';
    let highestPct = -1;
    let lowestPct = 101;

    Object.entries(subjectStats).forEach(([subj, data]) => {
      const pct = (data.correct / data.total) * 100;
      if (pct > highestPct) {
        highestPct = pct;
        strongestSubject = subj;
      }
      if (pct < lowestPct) {
        lowestPct = pct;
        weakestSubject = subj;
      }
    });

    // Identify biggest opportunity topic (weakest topic within weakest subject)
    let biggestOpportunityTopic = 'Organic Chemistry';
    const weakSubjData = subjectStats[weakestSubject];
    if (weakSubjData && Object.keys(weakSubjData.topics).length > 0) {
      let minTopicPct = 101;
      Object.entries(weakSubjData.topics).forEach(([top, topData]) => {
        const topPct = (topData.correct / topData.total) * 100;
        if (topPct < minTopicPct) {
          minTopicPct = topPct;
          biggestOpportunityTopic = top;
        }
      });
    }

    // Baseline readiness calculation (scaled from diagnostic percentage)
    // Minimum baseline 30%, max 95%
    const currentReadiness = Math.min(95, Math.max(30, Math.round(percentage * 0.85 + 15)));

    user.diagnosticCompleted = true;
    user.diagnosticScore = percentage;
    user.readinessScore = currentReadiness;
    await user.save();

    // Mark in onboarding state
    let onboarding = await UserOnboarding.findOne({ user: userId });
    if (onboarding) {
      if (!onboarding.completedSteps.includes('diagnostic_completed')) {
        onboarding.completedSteps.push('diagnostic_completed');
      }
      onboarding.isCompleted = true;
      await onboarding.save();
    }

    return {
      score,
      total,
      percentage,
      strongestSubject,
      weakestSubject,
      biggestOpportunityTopic,
      currentReadiness,
      targetScore: user.targetScore || 280,
      recommendedFirstMission: {
        subject: weakestSubject,
        topic: biggestOpportunityTopic,
        questionCount: 15,
        description: `Targeted 15-question drill on ${biggestOpportunityTopic} to boost your ${weakestSubject} baseline.`,
      },
    };
  }

  /**
   * Generates student's actionable "Today's Mission"
   */
  public static async getDailyMission(
    userId: string | mongoose.Types.ObjectId
  ): Promise<DailyMission> {
    const user = await User.findById(userId);
    const exam = user?.targetExam || 'JAMB';
    const targetScore = user?.targetScore || 280;
    const readinessScore = user?.readinessScore || 55;

    // Count mistakes due today
    const now = new Date();
    const mistakesDue = await MistakeLog.countDocuments({
      user: userId,
      mastered: false,
      nextReviewDate: { $lte: now },
    });

    const subjects = user?.subjects && user.subjects.length > 0
      ? user.subjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

    const primaryWeakSubj = subjects[1] || 'Mathematics';
    const secondaryWeakSubj = subjects[2] || 'Physics';

    const items: DailyMissionItem[] = [
      {
        id: 'mission_1',
        title: `Review ${Math.max(1, mistakesDue)} Previous Mistake${mistakesDue === 1 ? '' : 's'}`,
        description: 'Understand the concept trap and retest your missed questions.',
        targetCount: Math.max(1, mistakesDue),
        estimatedMinutes: 10,
        completed: mistakesDue === 0,
        actionUrl: '/dashboard/mistakes',
        type: 'review_mistakes',
      },
      {
        id: 'mission_2',
        title: `${primaryWeakSubj} Weak-Topic Practice`,
        description: `10 targeted questions to build topic mastery in ${primaryWeakSubj}.`,
        subject: primaryWeakSubj,
        targetCount: 10,
        estimatedMinutes: 15,
        completed: false,
        actionUrl: `/dashboard/practice?exam=${exam}&subject=${encodeURIComponent(primaryWeakSubj)}`,
        type: 'weak_topic',
      },
      {
        id: 'mission_3',
        title: `${secondaryWeakSubj} Core Concept Drill`,
        description: `10 high-yield questions covering standard ${exam} patterns.`,
        subject: secondaryWeakSubj,
        targetCount: 10,
        estimatedMinutes: 15,
        completed: false,
        actionUrl: `/dashboard/practice?exam=${exam}&subject=${encodeURIComponent(secondaryWeakSubj)}`,
        type: 'subject_practice',
      },
      {
        id: 'mission_4',
        title: 'Timed English Speed Drill',
        description: '15-minute speed drill to sharpen time-per-question pacing.',
        subject: 'English Language',
        targetCount: 15,
        estimatedMinutes: 15,
        completed: false,
        actionUrl: `/dashboard/practice?exam=${exam}&subject=English%20Language`,
        type: 'speed_drill',
      },
      {
        id: 'mission_5',
        title: 'Daily Examination Challenge',
        description: 'Compete in today’s 10-question challenge to maintain your streak.',
        targetCount: 10,
        estimatedMinutes: 10,
        completed: false,
        actionUrl: '/dashboard/challenge',
        type: 'mock_test',
      },
    ];

    const completedCount = items.filter((i) => i.completed).length;

    return {
      targetExam: exam,
      targetScore,
      readinessScore,
      completedCount,
      totalCount: items.length,
      items,
    };
  }

  /**
   * Transparent Preplyx Readiness Score breakdown
   */
  public static async getReadinessBreakdown(
    userId: string | mongoose.Types.ObjectId
  ): Promise<any> {
    const user = await User.findById(userId);
    const exam = user?.targetExam || 'JAMB';
    const targetScore = user?.targetScore || 280;

    const sessions = await ExamSession.find({ user: userId }).sort({ createdAt: -1 });

    const totalSessions = sessions.length;
    let avgAccuracy = 0;
    let avgSpeedSeconds = 60; // 60s standard

    if (totalSessions > 0) {
      avgAccuracy = Math.round(
        sessions.reduce((acc, s) => acc + s.percentage, 0) / totalSessions
      );
      const totalTime = sessions.reduce((acc, s) => acc + s.timeSpentSeconds, 0);
      const totalQ = sessions.reduce((acc, s) => acc + s.total, 0);
      if (totalQ > 0) {
        avgSpeedSeconds = Math.round(totalTime / totalQ);
      }
    } else {
      avgAccuracy = user?.diagnosticScore || 50;
    }

    // Speed score: 100% if speed <= 45s, decreases if > 75s
    const speedScore = Math.min(100, Math.max(30, Math.round(100 - Math.max(0, avgSpeedSeconds - 45) * 1.5)));

    // Knowledge mastery: based on accuracy & unmastered mistakes
    const unmasteredMistakes = await MistakeLog.countDocuments({ user: userId, mastered: false });
    const knowledgeMastery = Math.min(95, Math.max(30, Math.round(avgAccuracy * 0.9 - Math.min(15, unmasteredMistakes))));

    // Consistency score: based on streak & sessions in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const recentSessionsCount = sessions.filter((s) => s.createdAt >= sevenDaysAgo).length;
    const consistencyScore = Math.min(100, Math.max(25, recentSessionsCount * 20));

    // Weak topic coverage
    const weakTopicCoverage = Math.min(100, Math.max(35, totalSessions > 0 ? 50 + totalSessions * 5 : 40));

    // Mock test performance
    const mockPerformance = totalSessions > 2 ? avgAccuracy : Math.round(avgAccuracy * 0.85);

    // Weighted composite readiness score
    const overallReadiness = Math.round(
      knowledgeMastery * 0.3 +
      avgAccuracy * 0.25 +
      speedScore * 0.15 +
      consistencyScore * 0.15 +
      weakTopicCoverage * 0.15
    );

    // Update user record
    if (user) {
      user.readinessScore = overallReadiness;
      await user.save();
    }

    // Target gap analysis
    const estimatedExamScore = Math.min(400, Math.round((overallReadiness / 100) * 400));
    const targetGap = Math.max(0, targetScore - estimatedExamScore);

    return {
      exam,
      targetScore,
      estimatedCurrentScore: estimatedExamScore,
      targetGap,
      overallReadiness,
      breakdown: [
        {
          metric: 'Knowledge Mastery',
          score: knowledgeMastery,
          status: knowledgeMastery >= 75 ? 'Strong' : knowledgeMastery >= 55 ? 'Developing' : 'Needs Focus',
          description: 'Coverage of verified syllabus concepts across your subjects.',
        },
        {
          metric: 'Practice Accuracy',
          score: avgAccuracy,
          status: avgAccuracy >= 75 ? 'Strong' : avgAccuracy >= 55 ? 'Moderate' : 'Low',
          description: 'Percentage of questions answered correctly in practice sessions.',
        },
        {
          metric: 'CBT Speed & Pacing',
          score: speedScore,
          status: speedScore >= 75 ? 'Fast' : speedScore >= 55 ? 'Optimal' : 'Needs Speed',
          description: `Average ${avgSpeedSeconds}s per question (target is 45-55s).`,
        },
        {
          metric: 'Study Consistency',
          score: consistencyScore,
          status: consistencyScore >= 70 ? 'Consistent' : 'Irregular',
          description: `${recentSessionsCount} sessions completed in the last 7 days.`,
        },
        {
          metric: 'Weak-Topic Coverage',
          score: weakTopicCoverage,
          status: weakTopicCoverage >= 70 ? 'Good' : 'Opportunity Area',
          description: 'Proportion of previously missed topics that have been retested.',
        },
      ],
      actionPlan: targetGap > 0
        ? `To close your ${targetGap}-mark gap toward your ${targetScore} target, focus on your top 2 opportunity topics and retest previous mistakes.`
        : `You are currently meeting your preparation benchmark for ${targetScore}! Maintain your practice consistency to sustain speed.`,
    };
  }

  /**
   * Process automated onboarding reminder notifications for users who registered > 24h ago
   */
  public static async processOnboardingReminders(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const incompleteUsers = await User.find({
      onboardingCompleted: false,
      createdAt: { $lte: oneDayAgo },
    }).limit(50);

    for (const user of incompleteUsers) {
      user.notifications = user.notifications || [];
      const hasRecentReminder = user.notifications.some((n: any) => n.type === 'onboarding_reminder');
      if (!hasRecentReminder) {
        user.notifications.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          type: 'onboarding_reminder',
          title: 'Complete Your Study Setup 🎯',
          message: 'Complete your 15-question diagnostic to unlock your personalized Study Mission.',
          time: 'Just now',
          unread: true,
        });
        await user.save();
      }
    }
  }
}
