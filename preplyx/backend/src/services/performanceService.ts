import mongoose from 'mongoose';
import ExamSession, { IExamSession } from '../models/ExamSession';
import Question from '../models/Question';
import StudentSubjectPerformance from '../models/StudentSubjectPerformance';
import StudentTopicPerformance, { MasteryLevel } from '../models/StudentTopicPerformance';
import { AUTOMATION_CONFIG } from '../config/automationConfig';

export class PerformanceService {
  /**
   * Processes a completed exam session in the background:
   * Aggregates subject and topic performance, detects weak areas, and updates rolling windows.
   */
  public static async processExamSession(session: IExamSession): Promise<void> {
    const userId = session.user;
    const exam = session.exam || 'JAMB';
    const subject = session.subject || 'General';

    // 1. Update StudentSubjectPerformance
    let subjectPerf = await StudentSubjectPerformance.findOne({
      user: userId,
      exam,
      subject,
    });

    if (!subjectPerf) {
      subjectPerf = new StudentSubjectPerformance({
        user: userId,
        exam,
        subject,
        totalAttempts: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        accuracy: 0,
        averageScore: 0,
        averageTimePerQuestionSeconds: 0,
        recentAccuracy: 0,
        recentScores: [],
      });
    }

    subjectPerf.totalAttempts += 1;
    subjectPerf.totalQuestions += session.total;
    subjectPerf.totalCorrect += session.score;
    subjectPerf.totalIncorrect += Math.max(0, session.total - session.score);
    subjectPerf.accuracy =
      subjectPerf.totalQuestions > 0
        ? Math.round((subjectPerf.totalCorrect / subjectPerf.totalQuestions) * 100)
        : 0;

    // Rolling window of recent scores (last 10)
    if (!subjectPerf.recentScores) subjectPerf.recentScores = [];
    subjectPerf.recentScores.push(session.percentage);
    if (subjectPerf.recentScores.length > AUTOMATION_CONFIG.performance.recentSessionsWindow) {
      subjectPerf.recentScores = subjectPerf.recentScores.slice(-AUTOMATION_CONFIG.performance.recentSessionsWindow);
    }
    const recentSum = subjectPerf.recentScores.reduce((a, b) => a + b, 0);
    subjectPerf.recentAccuracy = Math.round(recentSum / subjectPerf.recentScores.length);
    subjectPerf.averageScore = subjectPerf.accuracy;

    const timePerQ = session.total > 0 ? session.timeSpentSeconds / session.total : 0;
    subjectPerf.averageTimePerQuestionSeconds = Math.round(timePerQ * 10) / 10;
    subjectPerf.lastPracticedAt = new Date();

    await subjectPerf.save();

    // 2. Process Question Details to aggregate Topic Performance
    if (session.details && session.details.length > 0) {
      // Fetch topic and difficulty for each question in this session
      const questionIds = session.details
        .map((d) => d.questionId)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

      const questionsMap = new Map();
      if (questionIds.length > 0) {
        const questionsList = await Question.find({ _id: { $in: questionIds } }).select(
          'topic difficulty subject'
        );
        questionsList.forEach((q) => questionsMap.set(q._id.toString(), q));
      }

      // Group question results by topic
      const topicGroups = new Map<
        string,
        {
          total: number;
          correct: number;
          easyTotal: number;
          easyCorrect: number;
          medTotal: number;
          medCorrect: number;
          hardTotal: number;
          hardCorrect: number;
        }
      >();

      for (const item of session.details) {
        const qObj = questionsMap.get(item.questionId);
        const topicName = qObj?.topic || 'General';
        const difficulty = qObj?.difficulty || 'medium';

        if (!topicGroups.has(topicName)) {
          topicGroups.set(topicName, {
            total: 0,
            correct: 0,
            easyTotal: 0,
            easyCorrect: 0,
            medTotal: 0,
            medCorrect: 0,
            hardTotal: 0,
            hardCorrect: 0,
          });
        }

        const tg = topicGroups.get(topicName)!;
        tg.total += 1;
        if (item.isCorrect) tg.correct += 1;

        if (difficulty === 'easy') {
          tg.easyTotal += 1;
          if (item.isCorrect) tg.easyCorrect += 1;
        } else if (difficulty === 'hard') {
          tg.hardTotal += 1;
          if (item.isCorrect) tg.hardCorrect += 1;
        } else {
          tg.medTotal += 1;
          if (item.isCorrect) tg.medCorrect += 1;
        }
      }

      // Upsert topic performance in bulk
      for (const [topicName, stats] of topicGroups.entries()) {
        let topicPerf = await StudentTopicPerformance.findOne({
          user: userId,
          exam,
          subject,
          topic: topicName,
        });

        if (!topicPerf) {
          topicPerf = new StudentTopicPerformance({
            user: userId,
            exam,
            subject,
            topic: topicName,
            totalAttempts: 0,
            totalQuestions: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
            accuracy: 0,
            masteryLevel: 'average',
            easyAccuracy: 0,
            mediumAccuracy: 0,
            hardAccuracy: 0,
          });
        }

        topicPerf.totalAttempts += 1;
        topicPerf.totalQuestions += stats.total;
        topicPerf.totalCorrect += stats.correct;
        topicPerf.totalIncorrect += stats.total - stats.correct;
        topicPerf.accuracy = Math.round(
          (topicPerf.totalCorrect / topicPerf.totalQuestions) * 100
        );

        // Calculate mastery level
        let mastery: MasteryLevel = 'average';
        if (topicPerf.accuracy < AUTOMATION_CONFIG.performance.weakTopicThresholdAccuracy) {
          mastery = 'weak';
        } else if (topicPerf.accuracy >= AUTOMATION_CONFIG.performance.strongTopicThresholdAccuracy) {
          mastery = 'strong';
        }
        topicPerf.masteryLevel = mastery;

        if (stats.easyTotal > 0) {
          topicPerf.easyAccuracy = Math.round((stats.easyCorrect / stats.easyTotal) * 100);
        }
        if (stats.medTotal > 0) {
          topicPerf.mediumAccuracy = Math.round((stats.medCorrect / stats.medTotal) * 100);
        }
        if (stats.hardTotal > 0) {
          topicPerf.hardAccuracy = Math.round((stats.hardCorrect / stats.hardTotal) * 100);
        }
        topicPerf.lastPracticedAt = new Date();

        await topicPerf.save();
      }
    }
  }

  /**
   * Identifies all weak topics (< 50% accuracy) for a given student
   */
  public static async getWeakTopics(
    userId: string | mongoose.Types.ObjectId,
    exam?: string
  ): Promise<any[]> {
    const query: any = {
      user: userId,
      masteryLevel: 'weak',
    };
    if (exam) query.exam = exam;

    const weakTopics = await StudentTopicPerformance.find(query)
      .sort({ accuracy: 1, totalQuestions: -1 })
      .limit(AUTOMATION_CONFIG.recommendations.maxWeakTopicsRecommended);

    return weakTopics.map((wt) => ({
      subject: wt.subject,
      topic: wt.topic,
      accuracy: wt.accuracy,
      totalAttempted: wt.totalQuestions,
      recommendedPracticeCount: AUTOMATION_CONFIG.recommendations.defaultQuestionCount,
    }));
  }

  /**
   * Retrieves full aggregated student performance summary
   */
  public static async getStudentPerformanceSummary(
    userId: string | mongoose.Types.ObjectId,
    exam: string = 'JAMB'
  ): Promise<{
    overallAccuracy: number;
    totalExams: number;
    totalQuestions: number;
    totalCorrect: number;
    totalIncorrect: number;
    averageTimePerQuestionSeconds: number;
    subjects: any[];
    weakTopics: any[];
    strongTopics: any[];
  }> {
    const [subjectPerfs, topicPerfs] = await Promise.all([
      StudentSubjectPerformance.find({ user: userId, exam }),
      StudentTopicPerformance.find({ user: userId, exam }),
    ]);

    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalExams = 0;
    let totalTimeSum = 0;

    subjectPerfs.forEach((sp) => {
      totalQuestions += sp.totalQuestions;
      totalCorrect += sp.totalCorrect;
      totalIncorrect += sp.totalIncorrect;
      totalExams += sp.totalAttempts;
      totalTimeSum += sp.averageTimePerQuestionSeconds * sp.totalQuestions;
    });

    const overallAccuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const avgTimePerQ =
      totalQuestions > 0 ? Math.round((totalTimeSum / totalQuestions) * 10) / 10 : 0;

    const weakTopics = topicPerfs
      .filter((tp) => tp.masteryLevel === 'weak')
      .map((tp) => ({ subject: tp.subject, topic: tp.topic, accuracy: tp.accuracy, total: tp.totalQuestions }));

    const strongTopics = topicPerfs
      .filter((tp) => tp.masteryLevel === 'strong')
      .map((tp) => ({ subject: tp.subject, topic: tp.topic, accuracy: tp.accuracy, total: tp.totalQuestions }));

    return {
      overallAccuracy,
      totalExams,
      totalQuestions,
      totalCorrect,
      totalIncorrect,
      averageTimePerQuestionSeconds: avgTimePerQ,
      subjects: subjectPerfs,
      weakTopics,
      strongTopics,
    };
  }
}
