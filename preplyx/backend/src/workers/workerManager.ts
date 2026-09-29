import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { QUEUE_NAMES, PreplyxQueueName } from '../queues/queueManager';
import { PerformanceService } from '../services/performanceService';
import { AdaptiveService } from '../services/adaptiveService';
import { RecommendationService } from '../services/recommendationService';
import { XPService } from '../services/xpService';
import { StreakService } from '../services/streakService';
import { AchievementService } from '../services/achievementService';
import { DailyChallengeService } from '../services/dailyChallengeService';
import { QuizGenerationService } from '../services/quizGenerationService';
import { CompetitionService } from '../services/competitionService';
import { NotificationService } from '../services/notificationService';
import { OnboardingService } from '../services/onboardingService';
import { InactiveUserService } from '../services/inactiveUserService';
import { SubscriptionService } from '../services/subscriptionService';
import { AnalyticsReportService } from '../services/analyticsReportService';
import { AIGenerationService } from '../services/aiGenerationService';
import { ReferralService } from '../services/referralService';
import ExamSession from '../models/ExamSession';

const workers: Worker[] = [];

export class WorkerManager {
  /**
   * Initializes all BullMQ background workers
   */
  public static initWorkers(): void {
    console.log('🚀 [Worker Manager] Initializing Preplyx background workers...');

    // 1. Performance Worker
    this.createWorker(QUEUE_NAMES.PERFORMANCE, async (job: Job) => {
      const { sessionId, userId, exam, subject, percentage } = job.data;

      if (job.name === 'process_exam_session') {
        const session = await ExamSession.findById(sessionId);
        if (session) {
          // A. Process subject and topic performance
          await PerformanceService.processExamSession(session);

          // B. Update adaptive difficulty profile
          await AdaptiveService.updateAdaptiveDifficulty(
            session.user,
            session.exam,
            session.subject,
            session.percentage
          );

          // C. Refresh study recommendations
          await RecommendationService.generateStudentRecommendations(session.user, session.exam);
        }
      }
    });

    // 2. Gamification Worker (XP, Streaks, Achievements)
    this.createWorker(QUEUE_NAMES.GAMIFICATION, async (job: Job) => {
      const { userId, activityType, questionsCount, score, total, percentage, timeSpentSeconds, session } = job.data;

      if (job.name === 'process_quiz_gamification') {
        // A. Award quiz completion XP (+20 XP, +50 XP if perfect score)
        let xpToAward = 20;
        if (percentage >= 100) xpToAward = 50;

        await XPService.awardXP({
          userId,
          amount: xpToAward,
          sourceType: percentage >= 100 ? 'perfect_quiz' : 'quiz_completed',
          sourceId: session?._id || `quiz_${Date.now()}`,
          reason: percentage >= 100 ? 'Perfect Quiz Score! (+50 XP) 🌟' : 'Exam Session Completed (+20 XP)',
        });

        // B. Update Streak
        const streakResult = await StreakService.recordActivity(
          userId,
          activityType || 'quiz',
          questionsCount || total || 1
        );

        // C. Evaluate Achievements
        await AchievementService.evaluateUserAchievements(userId, {
          session: session || { percentage, timeSpentSeconds, total, score },
          streak: streakResult.currentStreak,
        });

        // D. Check Referral Qualification (if first exam completed)
        await ReferralService.qualifyAndRewardReferral(userId, 'first_exam_completed');
      }
    });

    // 3. Notifications Worker
    this.createWorker(QUEUE_NAMES.NOTIFICATIONS, async (job: Job) => {
      if (job.name === 'dispatch_notification') {
        await NotificationService.dispatch(job.data);
      }
    });

    // 4. Learning Automation Worker (Daily Challenges, Daily Quizzes, Mocks)
    this.createWorker(QUEUE_NAMES.LEARNING, async (job: Job) => {
      if (job.name === 'generate_daily_challenge') {
        await DailyChallengeService.generateDailyChallenge(job.data?.targetDate);
      } else if (job.name === 'generate_daily_jamb_quiz') {
        await QuizGenerationService.generateDailyJambQuiz(job.data?.targetDate);
      } else if (job.name === 'generate_daily_subject_quizzes') {
        await QuizGenerationService.generateDailySubjectQuizzes(job.data?.targetDate);
      } else if (job.name === 'generate_weekly_mock') {
        await QuizGenerationService.generateWeeklyMockExam(job.data?.weekIdentifier);
      }
    });

    // 5. Competition Worker
    this.createWorker(QUEUE_NAMES.COMPETITIONS, async (job: Job) => {
      if (job.name === 'process_competition_lifecycle') {
        await CompetitionService.processCompetitionStateTransitions();
      }
    });

    // 6. Retention & Subscription Worker
    this.createWorker(QUEUE_NAMES.RETENTION, async (job: Job) => {
      if (job.name === 'process_onboarding_reminders') {
        await OnboardingService.processOnboardingReminders();
      } else if (job.name === 'process_inactive_users') {
        await InactiveUserService.processInactiveUsers();
      } else if (job.name === 'process_subscription_expirations') {
        await SubscriptionService.processSubscriptionExpirations();
      }
    });

    // 7. Analytics Worker
    this.createWorker(QUEUE_NAMES.ANALYTICS, async (job: Job) => {
      if (job.name === 'generate_daily_report') {
        await AnalyticsReportService.generateDailyReport(job.data?.targetDate);
      } else if (job.name === 'generate_weekly_report') {
        await AnalyticsReportService.generateWeeklyReport();
      }
    });

    // 8. AI Worker
    this.createWorker(QUEUE_NAMES.AI, async (job: Job) => {
      if (job.name === 'generate_ai_questions') {
        await AIGenerationService.generateQuestions(job.data);
      }
    });

    console.log(`✅ [Worker Manager] ${workers.length} background workers active and listening for jobs.`);
  }

  private static createWorker(queueName: PreplyxQueueName, processor: (job: Job) => Promise<any>): Worker {
    const worker = new Worker(queueName, processor, {
      connection: redisConnectionOptions,
      concurrency: 5,
    });

    worker.on('completed', (job: Job) => {
      // Job completed silently or with debug log
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`❌ [Worker Error] Job ${job?.name} (ID: ${job?.id}) in ${queueName} failed: ${err.message}`);
    });

    worker.on('error', (err: Error) => {
      console.warn(`[Worker Warning] Worker in queue ${queueName} encountered error: ${err.message}`);
    });

    workers.push(worker);
    return worker;
  }

  /**
   * Direct asynchronous execution fallback if Redis is unreachable
   */
  public static async executeDirectly(queueName: string, jobName: string, data: any): Promise<void> {
    try {
      if (jobName === 'process_exam_session') {
        const session = await ExamSession.findById(data.sessionId);
        if (session) {
          await PerformanceService.processExamSession(session);
          await AdaptiveService.updateAdaptiveDifficulty(session.user, session.exam, session.subject, session.percentage);
          await RecommendationService.generateStudentRecommendations(session.user, session.exam);
        }
      } else if (jobName === 'process_quiz_gamification') {
        const xpToAward = data.percentage >= 100 ? 50 : 20;
        await XPService.awardXP({
          userId: data.userId,
          amount: xpToAward,
          sourceType: data.percentage >= 100 ? 'perfect_quiz' : 'quiz_completed',
          sourceId: data.session?._id || `quiz_${Date.now()}`,
          reason: data.percentage >= 100 ? 'Perfect Quiz Score! (+50 XP) 🌟' : 'Exam Session Completed (+20 XP)',
        });
        const streakResult = await StreakService.recordActivity(data.userId, data.activityType || 'quiz', data.questionsCount || 1);
        await AchievementService.evaluateUserAchievements(data.userId, {
          session: data.session,
          streak: streakResult.currentStreak,
        });
      } else if (jobName === 'dispatch_notification') {
        await NotificationService.dispatch(data);
      }
    } catch (err: any) {
      console.error(`[Fallback Execution Error] Failed direct job ${jobName}:`, err.message);
    }
  }

  /**
   * Graceful shutdown of all workers
   */
  public static async closeAll(): Promise<void> {
    console.log('[Worker Manager] Gracefully shutting down workers...');
    for (const worker of workers) {
      await worker.close();
    }
    workers.length = 0;
  }
}
