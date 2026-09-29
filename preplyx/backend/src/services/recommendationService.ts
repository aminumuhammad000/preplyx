import mongoose from 'mongoose';
import StudyRecommendation, { IStudyRecommendation } from '../models/StudyRecommendation';
import StudentTopicPerformance from '../models/StudentTopicPerformance';
import StudentSubjectPerformance from '../models/StudentSubjectPerformance';
import GeneratedQuiz from '../models/GeneratedQuiz';
import Question from '../models/Question';
import { AdaptiveService } from './adaptiveService';
import { AUTOMATION_CONFIG } from '../config/automationConfig';

export class RecommendationService {
  /**
   * Generates or refreshes personalized study recommendations for a student
   */
  public static async generateStudentRecommendations(
    userId: string | mongoose.Types.ObjectId,
    exam: string = 'JAMB'
  ): Promise<IStudyRecommendation> {
    // 1. Fetch weak topics (accuracy < 50%)
    const weakTopicsRecords = await StudentTopicPerformance.find({
      user: userId,
      exam,
      masteryLevel: 'weak',
    })
      .sort({ accuracy: 1 })
      .limit(5);

    const weakTopics = weakTopicsRecords.map((wt) => ({
      subject: wt.subject,
      topic: wt.topic,
      accuracy: wt.accuracy,
      recommendedPracticeCount: AUTOMATION_CONFIG.recommendations.defaultQuestionCount,
    }));

    // 2. Identify subjects needing attention
    const subjectPerfs = await StudentSubjectPerformance.find({ user: userId, exam }).sort({
      accuracy: 1,
    });

    const recommendedSubjects = subjectPerfs.map((sp) => {
      let priority: 'high' | 'medium' | 'low' = 'medium';
      let reason = `Practice ${sp.subject} to build mastery`;

      if (sp.accuracy < 50) {
        priority = 'high';
        reason = `Your recent accuracy in ${sp.subject} is ${sp.accuracy}%. Focus here to boost your overall score.`;
      } else if (sp.accuracy >= 75) {
        priority = 'low';
        reason = `Strong performance (${sp.accuracy}%). Do periodic revision to maintain speed.`;
      }

      return {
        subject: sp.subject,
        reason,
        priority,
      };
    });

    // 3. Generate tailored practice quizzes for weak topics
    const recommendedQuizzes: any[] = [];

    for (const weak of weakTopics.slice(0, 3)) {
      const targetDiff = await AdaptiveService.getStudentTargetDifficulty(
        userId,
        exam,
        weak.subject
      );

      // Check if active personalized quiz already exists for this topic
      let existingQuiz = await GeneratedQuiz.findOne({
        forUser: userId,
        type: 'personalized_quiz',
        subject: weak.subject,
        topic: weak.topic,
        isActive: true,
      });

      if (!existingQuiz) {
        // Select matching questions for practice
        const questions = await AdaptiveService.selectAdaptiveQuestions(
          exam,
          weak.subject,
          targetDiff,
          15,
          weak.topic
        );

        if (questions.length >= 5) {
          existingQuiz = await GeneratedQuiz.create({
            title: `Boost Your ${weak.topic} (${weak.subject})`,
            description: `Targeted practice to improve your ${weak.topic} score from ${weak.accuracy}%.`,
            type: 'personalized_quiz',
            exam,
            subject: weak.subject,
            topic: weak.topic,
            difficulty: targetDiff,
            questions: questions.map((q) => q._id),
            durationMinutes: 15,
            passPercentage: 60,
            forUser: userId,
            isActive: true,
          });
        }
      }

      recommendedQuizzes.push({
        quizId: existingQuiz?._id,
        title: existingQuiz?.title || `Master ${weak.topic}`,
        subject: weak.subject,
        topic: weak.topic,
        targetDifficulty: targetDiff,
        questionCount: existingQuiz?.questions?.length || 15,
        reason: `Your current accuracy is ${weak.accuracy}%. 15 practice questions recommended.`,
      });
    }

    // 4. Save or update recommendation record
    let rec = await StudyRecommendation.findOne({ user: userId, exam });
    if (!rec) {
      rec = new StudyRecommendation({
        user: userId,
        exam,
      });
    }

    rec.weakTopics = weakTopics;
    rec.recommendedQuizzes = recommendedQuizzes;
    rec.recommendedSubjects = recommendedSubjects;
    rec.lastGeneratedAt = new Date();

    await rec.save();
    return rec;
  }

  /**
   * Retrieves recommendation profile with fallback defaults if student is brand new
   */
  public static async getStudentRecommendations(
    userId: string | mongoose.Types.ObjectId,
    exam: string = 'JAMB'
  ): Promise<any> {
    let rec: any = await StudyRecommendation.findOne({ user: userId, exam }).populate({
      path: 'recommendedQuizzes.quizId',
      select: 'title description durationMinutes questions difficulty',
    });

    if (!rec || !rec.lastGeneratedAt || Date.now() - rec.lastGeneratedAt.getTime() > 12 * 3600 * 1000) {
      rec = await this.generateStudentRecommendations(userId, exam);
    }

    return rec;
  }
}
