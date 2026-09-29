import mongoose from 'mongoose';
import GeneratedQuiz, { IGeneratedQuiz, QuizType } from '../models/GeneratedQuiz';
import Question, { IQuestion } from '../models/Question';
import Subject from '../models/Subject';
import { StreakService } from './streakService';

export class QuizGenerationService {
  /**
   * Generates standard Daily JAMB Quiz (4 core subjects, 40 questions total or 20 questions)
   */
  public static async generateDailyJambQuiz(targetDate?: string): Promise<IGeneratedQuiz> {
    const today = targetDate || StreakService.getLagosDateString();

    // Idempotency check
    let existingQuiz = await GeneratedQuiz.findOne({
      type: 'daily_jamb',
      targetDate: today,
    });

    if (existingQuiz) {
      return existingQuiz;
    }

    // Default core JAMB subjects: English + 3 core subjects
    const subjects = ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
    const questionsPerSubject = 5;
    const allSelectedQuestionIds: mongoose.Types.ObjectId[] = [];

    for (const sub of subjects) {
      const questions = await Question.aggregate([
        { $match: { subject: sub, status: 'published' } },
        { $sample: { size: questionsPerSubject } },
      ]);

      questions.forEach((q) => allSelectedQuestionIds.push(q._id));
    }

    // Fallback if specific subjects don't have enough questions
    if (allSelectedQuestionIds.length < 10) {
      const fallbackQuestions = await Question.aggregate([
        { $match: { status: 'published', _id: { $nin: allSelectedQuestionIds } } },
        { $sample: { size: 20 - allSelectedQuestionIds.length } },
      ]);
      fallbackQuestions.forEach((q) => allSelectedQuestionIds.push(q._id));
    }

    existingQuiz = await GeneratedQuiz.create({
      title: `Daily JAMB Quick Mock - ${today}`,
      description: `Comprehensive 20-question multi-subject practice exam for ${today}.`,
      type: 'daily_jamb',
      exam: 'JAMB',
      difficulty: 'mixed',
      questions: allSelectedQuestionIds,
      durationMinutes: 25,
      passPercentage: 50,
      targetDate: today,
      isActive: true,
    });

    console.log(`[Quiz Generator] Generated Daily JAMB Quiz for ${today} with ${allSelectedQuestionIds.length} questions.`);
    return existingQuiz;
  }

  /**
   * Generates Daily Subject Quizzes for all available subjects
   */
  public static async generateDailySubjectQuizzes(targetDate?: string): Promise<IGeneratedQuiz[]> {
    const today = targetDate || StreakService.getLagosDateString();
    const subjects = await Subject.find().select('name');
    const createdQuizzes: IGeneratedQuiz[] = [];

    const subjectList =
      subjects.length > 0
        ? subjects.map((s) => s.name)
        : ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English'];

    for (const sub of subjectList) {
      let existing = await GeneratedQuiz.findOne({
        type: 'subject_quiz',
        subject: sub,
        targetDate: today,
      });

      if (!existing) {
        const questions = await Question.aggregate([
          { $match: { subject: sub, status: 'published' } },
          { $sample: { size: 15 } },
        ]);

        if (questions.length >= 3) {
          existing = await GeneratedQuiz.create({
            title: `Daily ${sub} Practice - ${today}`,
            description: `15 curated questions to sharpen your understanding of ${sub}.`,
            type: 'subject_quiz',
            exam: 'JAMB',
            subject: sub,
            difficulty: 'mixed',
            questions: questions.map((q) => q._id),
            durationMinutes: 15,
            passPercentage: 50,
            targetDate: today,
            isActive: true,
          });
          createdQuizzes.push(existing);
        }
      } else {
        createdQuizzes.push(existing);
      }
    }

    console.log(`[Quiz Generator] Generated ${createdQuizzes.length} Daily Subject Quizzes for ${today}.`);
    return createdQuizzes;
  }

  /**
   * Generates full 60-question Weekly Mock Exam
   */
  public static async generateWeeklyMockExam(weekIdentifier?: string): Promise<IGeneratedQuiz> {
    const today = StreakService.getLagosDateString();
    const weekId = weekIdentifier || `MOCK-${today}`;

    let mockQuiz = await GeneratedQuiz.findOne({
      type: 'weekly_mock',
      targetDate: weekId,
    });

    if (mockQuiz) {
      return mockQuiz;
    }

    const mockQuestions = await Question.aggregate([
      { $match: { status: 'published' } },
      { $sample: { size: 40 } },
    ]);

    mockQuiz = await GeneratedQuiz.create({
      title: `Preplyx Full Weekly Mock Examination (${today})`,
      description: `Simulate the actual JAMB CBT exam environment under timed conditions.`,
      type: 'weekly_mock',
      exam: 'JAMB',
      difficulty: 'mixed',
      questions: mockQuestions.map((q) => q._id),
      durationMinutes: 45,
      passPercentage: 60,
      targetDate: weekId,
      isActive: true,
    });

    console.log(`[Quiz Generator] Generated Weekly Mock Exam with ${mockQuestions.length} questions.`);
    return mockQuiz;
  }

  /**
   * Retrieves active auto-generated quizzes for frontend practice dashboard
   */
  public static async getActiveDailyQuizzes(): Promise<{
    dailyJambQuiz: IGeneratedQuiz | null;
    subjectQuizzes: IGeneratedQuiz[];
    weeklyMock: IGeneratedQuiz | null;
  }> {
    const today = StreakService.getLagosDateString();

    const [dailyJambQuiz, subjectQuizzes, weeklyMock] = await Promise.all([
      GeneratedQuiz.findOne({ type: 'daily_jamb', targetDate: today, isActive: true }),
      GeneratedQuiz.find({ type: 'subject_quiz', targetDate: today, isActive: true }),
      GeneratedQuiz.findOne({ type: 'weekly_mock', isActive: true }).sort({ createdAt: -1 }),
    ]);

    return {
      dailyJambQuiz,
      subjectQuizzes,
      weeklyMock,
    };
  }
}
