import { eventBus, EVENTS } from './eventBus';
import { QueueManager, QUEUE_NAMES } from '../queues/queueManager';
import { OnboardingService } from '../services/onboardingService';
import { ReferralService } from '../services/referralService';
import { StreakService } from '../services/streakService';
import { NotificationService } from '../services/notificationService';

export const registerEventHandlers = (): void => {
  console.log('⚡ [Event Handlers] Registering Preplyx automation event listeners...');

  // 1. User Registered Event
  eventBus.subscribe(EVENTS.USER_REGISTERED, async (payload) => {
    const { userId, user, referralCode, clientIp, userAgent } = payload;
    const uid = userId || user?._id;
    if (!uid) return;

    // A. Initialize onboarding state
    await OnboardingService.initializeUserOnboarding(uid);

    // B. Handle referral if referral code was supplied
    if (referralCode) {
      await ReferralService.recordReferral(uid, referralCode, clientIp, userAgent);
    }
  });

  // 2. Quiz Completed Event (Triggered whenever a student submits an exam/quiz)
  eventBus.subscribe(EVENTS.QUIZ_COMPLETED, async (payload) => {
    const { session, userId, sessionId, percentage, total, score, timeSpentSeconds, exam, subject } = payload;
    const uid = userId || session?.user;
    const sId = sessionId || session?._id;

    if (!uid) return;

    // Dispatch Performance calculation job to background queue
    await QueueManager.addJob(
      QUEUE_NAMES.PERFORMANCE,
      'process_exam_session',
      {
        sessionId: sId,
        userId: uid,
        exam,
        subject,
        percentage,
      },
      { jobId: `perf_${sId}` } // Idempotent job key
    );

    // Dispatch Gamification job (XP, Streak, Achievements) to background queue
    await QueueManager.addJob(
      QUEUE_NAMES.GAMIFICATION,
      'process_quiz_gamification',
      {
        userId: uid,
        activityType: 'exam_session',
        questionsCount: total,
        score,
        total,
        percentage,
        timeSpentSeconds,
        session,
      },
      { jobId: `gamify_${sId}` } // Idempotent job key
    );
  });

  // 3. Streak Milestones & At Risk Events
  eventBus.subscribe(EVENTS.STREAK_MILESTONE, async (payload) => {
    const { userId, milestone, xpAwarded } = payload;
    await NotificationService.dispatch({
      userId,
      eventType: 'STREAK',
      deduplicationKey: `STREAK_MILESTONE:${milestone}:${userId}`,
      title: `${milestone}-Day Streak Milestone! 🔥`,
      message: `Incredible dedication! You have studied for ${milestone} consecutive days and earned +${xpAwarded} XP!`,
      channels: ['in_app', 'email'],
    });
  });

  // 4. Streak At-Risk Reminder
  eventBus.subscribe(EVENTS.STREAK_AT_RISK, async (payload) => {
    const { userId, currentStreak } = payload;
    await NotificationService.dispatch({
      userId,
      eventType: 'STREAK_AT_RISK',
      deduplicationKey: `STREAK_RISK:${StreakService.getLagosDateString()}:${userId}`,
      title: `Your ${currentStreak}-day study streak is at risk! 🔥`,
      message: `You haven't practiced yet today. Answer today's Question of the Day or take a quick 5-question quiz before midnight to keep your streak alive!`,
      channels: ['in_app', 'email'],
    });
  });

  // 5. Competition Completed Event
  eventBus.subscribe(EVENTS.COMPETITION_COMPLETED, async (payload) => {
    const { competitionId, userId, score, percentage } = payload;
    await NotificationService.dispatch({
      userId,
      eventType: 'COMPETITION_RESULT',
      deduplicationKey: `COMP_SUBMITTED:${competitionId}:${userId}`,
      title: 'Competition Submission Received! 🏆',
      message: `Your competition test has been recorded (${score} score, ${percentage}%). Official leaderboards and prize winners will be published as soon as the competition concludes!`,
      channels: ['in_app'],
    });
  });

  console.log('✅ [Event Handlers] All automation event listeners registered successfully.');
};
