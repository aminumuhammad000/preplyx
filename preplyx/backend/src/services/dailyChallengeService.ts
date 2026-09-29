import mongoose from 'mongoose';
import DailyChallenge, { IDailyChallenge } from '../models/DailyChallenge';
import DailyChallengeSubmission from '../models/DailyChallengeSubmission';
import Question, { IQuestion } from '../models/Question';
import Subject from '../models/Subject';
import { StreakService } from './streakService';
import { XPService } from './xpService';
import { AUTOMATION_CONFIG } from '../config/automationConfig';
import { eventBus, EVENTS } from '../events/eventBus';

export class DailyChallengeService {
  /**
   * Generates Question of the Day for a given date (defaults to today in Lagos timezone)
   * Idempotent: If today's challenge already exists, returns the existing record.
   */
  public static async generateDailyChallenge(targetDate?: string): Promise<IDailyChallenge> {
    const dateStr = targetDate || StreakService.getLagosDateString();

    // Check if challenge already exists for this date
    let challenge = await DailyChallenge.findOne({ date: dateStr }).populate('question');
    if (challenge) {
      return challenge;
    }

    // Find questions used in past 30 days to avoid recent duplicates
    const pastChallenges = await DailyChallenge.find({
      date: { $ne: dateStr },
    })
      .sort({ createdAt: -1 })
      .limit(AUTOMATION_CONFIG.dailyChallenge.questionCooldownDays);

    const recentlyUsedQuestionIds = pastChallenges.map((c) => c.question);

    // Get available subjects to cycle through
    const allSubjects = await Subject.find().select('name');
    const subjectNames =
      allSubjects.length > 0
        ? allSubjects.map((s) => s.name)
        : ['Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology', 'Economics'];

    // Select subject based on day of month to ensure balanced rotation
    const dayOfMonth = new Date(`${dateStr}T00:00:00Z`).getUTCDate();
    const targetSubject = subjectNames[dayOfMonth % subjectNames.length];

    // Find eligible published question for this subject
    let eligibleQuestions = await Question.aggregate([
      {
        $match: {
          subject: targetSubject,
          status: 'published',
          _id: { $nin: recentlyUsedQuestionIds },
        },
      },
      { $sample: { size: 1 } },
    ]);

    // Fallback if no question found for that specific subject
    if (eligibleQuestions.length === 0) {
      eligibleQuestions = await Question.aggregate([
        {
          $match: {
            status: 'published',
            _id: { $nin: recentlyUsedQuestionIds },
          },
        },
        { $sample: { size: 1 } },
      ]);
    }

    if (eligibleQuestions.length === 0) {
      // Ultimate fallback to any question
      eligibleQuestions = await Question.aggregate([
        { $match: { status: 'published' } },
        { $sample: { size: 1 } },
      ]);
    }

    if (eligibleQuestions.length === 0) {
      throw new Error('Cannot generate Daily Challenge: No questions found in database.');
    }

    const selectedQuestion = eligibleQuestions[0];

    challenge = await DailyChallenge.create({
      date: dateStr,
      question: selectedQuestion._id,
      exam: selectedQuestion.exam || 'JAMB',
      subject: selectedQuestion.subject,
      topic: selectedQuestion.topic || 'General',
      xpReward: AUTOMATION_CONFIG.xp.dailyChallenge,
      participantsCount: 0,
      correctAnswersCount: 0,
      isActive: true,
    });

    console.log(`[Daily Challenge] Published Question of the Day for ${dateStr}: ${selectedQuestion.subject} - "${selectedQuestion.text.substring(0, 40)}..."`);

    // Emit event for automated notification dispatch
    eventBus.emitEvent(EVENTS.DAILY_CHALLENGE_ANSWERED, {
      type: 'CHALLENGE_PUBLISHED',
      date: dateStr,
      subject: selectedQuestion.subject,
      challengeId: challenge._id,
    });

    return challenge;
  }

  /**
   * Retrieves today's active challenge with user completion status
   */
  public static async getTodayChallenge(userId?: string | mongoose.Types.ObjectId): Promise<any> {
    const today = StreakService.getLagosDateString();
    let challenge = await DailyChallenge.findOne({ date: today }).populate('question');

    if (!challenge) {
      const generated = await this.generateDailyChallenge(today);
      challenge = await DailyChallenge.findById(generated._id).populate('question');
    }

    let userSubmission: any = null;
    if (userId) {
      userSubmission = await DailyChallengeSubmission.findOne({
        user: userId,
        date: today,
      });
    }

    const questionObj = challenge?.question as any;

    return {
      challengeId: challenge?._id,
      date: challenge?.date,
      exam: challenge?.exam,
      subject: challenge?.subject,
      topic: challenge?.topic,
      xpReward: challenge?.xpReward,
      participantsCount: challenge?.participantsCount || 0,
      question: {
        id: questionObj?._id,
        text: questionObj?.text,
        options: questionObj?.options,
        // Only expose explanation and correct answer if user has already submitted
        explanation: userSubmission ? questionObj?.explanation : undefined,
        correctAnswer: userSubmission ? questionObj?.correctAnswer : undefined,
      },
      hasSubmitted: !!userSubmission,
      userSubmission: userSubmission
        ? {
            userAnswer: userSubmission.userAnswer,
            isCorrect: userSubmission.isCorrect,
            xpEarned: userSubmission.xpEarned,
            timeSpentSeconds: userSubmission.timeSpentSeconds,
          }
        : null,
    };
  }

  /**
   * Submits user's answer for today's daily challenge
   */
  public static async submitAnswer(
    userId: string | mongoose.Types.ObjectId,
    challengeId: string | mongoose.Types.ObjectId,
    userAnswer: string,
    timeSpentSeconds: number = 10
  ): Promise<any> {
    const today = StreakService.getLagosDateString();

    // Check if already submitted today
    const existing = await DailyChallengeSubmission.findOne({
      user: userId,
      date: today,
    });

    if (existing) {
      throw new Error('You have already submitted an answer for today’s Daily Challenge.');
    }

    const challenge = await DailyChallenge.findById(challengeId).populate('question');
    if (!challenge) {
      throw new Error('Daily Challenge not found.');
    }

    const question = challenge.question as any;
    const isCorrect =
      question.correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();

    const xpEarned = isCorrect ? challenge.xpReward : 5; // Participation XP

    // 1. Create submission
    const submission = await DailyChallengeSubmission.create({
      user: userId,
      dailyChallenge: challenge._id,
      date: today,
      userAnswer,
      isCorrect,
      xpEarned,
      timeSpentSeconds,
    });

    // 2. Update challenge analytics counters
    challenge.participantsCount += 1;
    if (isCorrect) challenge.correctAnswersCount += 1;
    await challenge.save();

    // 3. Award XP with audit trail
    await XPService.awardXP({
      userId,
      amount: xpEarned,
      sourceType: 'daily_challenge',
      sourceId: challenge._id.toString(),
      reason: isCorrect
        ? `Daily Challenge Answered Correctly! (+${xpEarned} XP)`
        : `Daily Challenge Participation (+${xpEarned} XP)`,
    });

    // 4. Update Streak (Daily challenge is a valid daily activity!)
    const streakResult = await StreakService.recordActivity(userId, 'daily_challenge', 1);

    // 5. Emit event
    eventBus.emitEvent(EVENTS.DAILY_CHALLENGE_ANSWERED, {
      userId,
      challengeId: challenge._id,
      isCorrect,
      xpEarned,
      streak: streakResult.currentStreak,
    });

    return {
      success: true,
      isCorrect,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      xpEarned,
      currentStreak: streakResult.currentStreak,
      streakMilestone: streakResult.milestoneReached,
    };
  }
}
