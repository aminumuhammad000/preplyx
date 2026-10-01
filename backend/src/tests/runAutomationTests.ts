import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { getRedisClient, checkRedisHealth } from '../config/redis';

import User from '../models/User';
import Wallet from '../models/Wallet';
import Question from '../models/Question';
import ExamSession from '../models/ExamSession';
import DailyChallenge from '../models/DailyChallenge';
import DailyChallengeSubmission from '../models/DailyChallengeSubmission';
import Streak from '../models/Streak';
import XPTransaction from '../models/XPTransaction';
import Achievement from '../models/Achievement';
import UserAchievement from '../models/UserAchievement';
import Competition from '../models/Competition';
import CompetitionParticipant from '../models/CompetitionParticipant';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Subscription from '../models/Subscription';
import Referral from '../models/Referral';
import NotificationLog from '../models/NotificationLog';
import DailyReport from '../models/DailyReport';

import { QuestionQualityService } from '../services/questionQualityService';
import { DailyChallengeService } from '../services/dailyChallengeService';
import { QuizGenerationService } from '../services/quizGenerationService';
import { PerformanceService } from '../services/performanceService';
import { AdaptiveService } from '../services/adaptiveService';
import { RecommendationService } from '../services/recommendationService';
import { StreakService } from '../services/streakService';
import { XPService } from '../services/xpService';
import { AchievementService } from '../services/achievementService';
import { LeaderboardService } from '../services/leaderboardService';
import { CompetitionService } from '../services/competitionService';
import { AntiCheatService } from '../services/antiCheatService';
import { SubscriptionService } from '../services/subscriptionService';
import { ReferralService } from '../services/referralService';
import { NotificationService } from '../services/notificationService';
import { SecurityAuditService } from '../services/securityAuditService';
import { AnalyticsReportService } from '../services/analyticsReportService';

async function runTests() {
  console.log('🧪 =======================================================');
  console.log('🧪 Starting Preplyx Automation Engine Complete Test Suite');
  console.log('🧪 =======================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, errorDetail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (errorDetail) console.error('     Detail:', errorDetail);
      failedCount++;
    }
  }

  try {
    // 0. Connect DB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbt');
    console.log('📦 Connected to MongoDB for testing.\n');

    // TEST 1: Question Quality & Duplicate Detection
    console.log('🔹 [TEST SUITE 1] Question Quality & Duplicate Detection');
    const validQ = {
      exam: 'JAMB',
      subject: 'Mathematics',
      topic: 'Calculus',
      text: 'What is the derivative of sin(x) with respect to x?',
      options: ['cos(x)', '-cos(x)', 'tan(x)', 'sec(x)'],
      correctAnswer: 'cos(x)',
      explanation: 'd/dx[sin(x)] = cos(x)',
    };
    const valResult = await QuestionQualityService.validateAndAuditQuestion(validQ);
    assert(valResult.isValid, 'Valid question passes validation without errors');
    assert(valResult.errors.length === 0, 'Valid question has 0 errors');

    const invalidQ = {
      exam: 'JAMB',
      subject: '',
      text: 'Short',
      options: ['Only one'],
      correctAnswer: 'cos(x)',
    };
    const invalidResult = await QuestionQualityService.validateAndAuditQuestion(invalidQ);
    assert(!invalidResult.isValid, 'Invalid question correctly flagged with errors');
    assert(invalidResult.errors.length >= 2, 'Invalid question caught multiple errors');

    const simHigh = QuestionQualityService.calculateTokenSimilarity(
      'What is the derivative of sin(x) with respect to x?',
      'What is the derivative of sin(x) with respect to variable x?'
    );
    assert(simHigh > 0.7, `Token similarity accurately detected high text overlap (${(simHigh * 100).toFixed(1)}%)`);

    // TEST 2: Seed test user and questions
    console.log('\n🔹 [TEST SUITE 2] Test Fixtures Initialization');
    const testEmail = `test_student_${Date.now()}@preplyx.test`;
    let testUser = await User.create({
      name: 'Test Student',
      email: testEmail,
      password: 'Password123!',
      role: 'student',
      xp: 100,
    });
    let testWallet = await Wallet.create({
      user: testUser._id,
      balance: 5000,
      totalFunded: 5000,
      totalSpent: 0,
      welcomeBonus: 500,
    });
    testUser.wallet = testWallet._id;
    await testUser.save();

    // Create a sample question for testing
    const testQuestion = await Question.create({
      exam: 'JAMB',
      subject: 'Mathematics',
      topic: 'Probability',
      difficulty: 'medium',
      text: `In a standard deck of cards, what is the probability of drawing an Ace? (${Date.now()})`,
      options: ['1/13', '1/52', '4/13', '1/4'],
      correctAnswer: '1/13',
      explanation: 'There are 4 aces in 52 cards: 4/52 = 1/13.',
      status: 'published',
    });
    assert(!!testUser && !!testQuestion, 'Created test user and sample question fixtures');

    // TEST 3: Question of the Day / Daily Challenge
    console.log('\n🔹 [TEST SUITE 3] Question of the Day & Idempotency');
    const testDate = `2099-01-01`;
    const dailyChallenge = await DailyChallengeService.generateDailyChallenge(testDate);
    assert(dailyChallenge.date === testDate, 'Daily challenge generated with correct date');
    assert(dailyChallenge.xpReward === 20, 'Daily challenge has correct default XP reward');

    // Idempotency check: duplicate generate call returns existing record
    const challengeDup = await DailyChallengeService.generateDailyChallenge(testDate);
    assert(challengeDup._id.toString() === dailyChallenge._id.toString(), 'Daily challenge generation is strictly idempotent');

    const submitResult = await DailyChallengeService.submitAnswer(
      testUser._id,
      dailyChallenge._id,
      '1/13',
      8
    );
    assert(submitResult.success, 'Daily challenge submission successful');
    assert(submitResult.isCorrect, 'Daily challenge correct answer recognized');
    assert(submitResult.xpEarned === 20, 'Correct XP awarded for daily challenge');

    // TEST 4: Daily Quiz & Mock Generation
    console.log('\n🔹 [TEST SUITE 4] Automatic Quiz Generation');
    const dailyJambQuiz = await QuizGenerationService.generateDailyJambQuiz(testDate);
    assert(dailyJambQuiz.type === 'daily_jamb', 'Daily JAMB quiz generated with correct type');
    assert(dailyJambQuiz.questions.length > 0, 'Daily JAMB quiz contains selected questions');

    const weeklyMock = await QuizGenerationService.generateWeeklyMockExam(`MOCK-${testDate}`);
    assert(weeklyMock.type === 'weekly_mock', 'Weekly Mock Exam generated with correct type');

    // TEST 5: Student Performance Engine & Weak Topic Detection
    console.log('\n🔹 [TEST SUITE 5] Student Performance Engine & Weak Topics');
    const session = await ExamSession.create({
      user: testUser._id,
      exam: 'JAMB',
      subject: 'Mathematics',
      score: 3,
      total: 10,
      percentage: 30,
      timeSpentSeconds: 300,
      details: [
        {
          questionId: testQuestion._id.toString(),
          questionText: testQuestion.text,
          userAnswer: '1/52',
          correctAnswer: '1/13',
          isCorrect: false,
          explanation: testQuestion.explanation,
        },
      ],
    });

    await PerformanceService.processExamSession(session);
    const summary = await PerformanceService.getStudentPerformanceSummary(testUser._id, 'JAMB');
    assert(summary.totalExams >= 1, 'Performance engine recorded completed exam session');
    assert(summary.overallAccuracy === 30, 'Performance engine calculated correct overall accuracy (30%)');

    const weakTopics = await PerformanceService.getWeakTopics(testUser._id, 'JAMB');
    assert(weakTopics.length >= 1, 'Performance engine correctly identified weak topic (< 50% accuracy)');
    assert(weakTopics[0].topic === 'Probability', 'Identified "Probability" as weak topic');

    // TEST 6: Adaptive Difficulty Scaling
    console.log('\n🔹 [TEST SUITE 6] Adaptive Difficulty Scaling');
    const diffAfterLow = await AdaptiveService.updateAdaptiveDifficulty(testUser._id, 'JAMB', 'Mathematics', 30);
    assert(['easy', 'medium'].includes(diffAfterLow), `Adaptive engine adjusted difficulty on low score: ${diffAfterLow}`);

    // Update with high scores (90%, 95%)
    await AdaptiveService.updateAdaptiveDifficulty(testUser._id, 'JAMB', 'Mathematics', 90);
    const diffAfterHigh = await AdaptiveService.updateAdaptiveDifficulty(testUser._id, 'JAMB', 'Mathematics', 95);
    assert(['medium', 'hard'].includes(diffAfterHigh), `Adaptive engine scaled difficulty up on high scores: ${diffAfterHigh}`);

    // TEST 7: Personalized Recommendation Engine
    console.log('\n🔹 [TEST SUITE 7] Recommendation Engine');
    const recs = await RecommendationService.generateStudentRecommendations(testUser._id, 'JAMB');
    assert(recs.weakTopics.length > 0, 'Recommendation profile generated weak topics list');
    assert(recs.recommendedSubjects.length > 0, 'Recommendation profile suggested priority subjects');

    // TEST 8: Streak Engine & Idempotency
    console.log('\n🔹 [TEST SUITE 8] Streak Engine & Calendar Idempotency');
    const streakResult1 = await StreakService.recordActivity(testUser._id, 'quiz', 5);
    assert(streakResult1.currentStreak >= 1, 'Streak activity recorded successfully');

    // Second activity on same day must not increment streak
    const streakResult2 = await StreakService.recordActivity(testUser._id, 'quiz', 10);
    assert(streakResult2.isNewDayActivity === false, 'Same-day duplicate activity correctly flagged as isNewDayActivity: false');
    assert(streakResult2.currentStreak === streakResult1.currentStreak, 'Same-day activity preserves streak count without artificially inflating');

    // TEST 9: XP Engine & Transaction Audit Trail
    console.log('\n🔹 [TEST SUITE 9] XP Engine & Audit Trail');
    const userBeforeXp = (await User.findById(testUser._id))?.xp || 0;
    const xpAwardRes = await XPService.awardXP({
      userId: testUser._id,
      amount: 100,
      sourceType: 'streak_milestone',
      reason: 'Test 7-Day Streak Milestone Reward',
    });
    assert(xpAwardRes.newBalance === userBeforeXp + 100, `XP awarded correctly (${userBeforeXp} -> ${xpAwardRes.newBalance})`);

    const xpHistory = await XPService.getUserXPHistory(testUser._id);
    assert(xpHistory.total >= 1, 'XP transaction logged in immutable audit history');
    assert(xpHistory.transactions[0].reason === 'Test 7-Day Streak Milestone Reward', 'XP transaction reason preserved');

    // TEST 10: Dynamic Achievement Engine
    console.log('\n🔹 [TEST SUITE 10] Achievement Engine');
    const unlockedBadges = await AchievementService.evaluateUserAchievements(testUser._id, {
      session: { percentage: 100, timeSpentSeconds: 600, total: 10, score: 10 },
    });
    assert(Array.isArray(unlockedBadges), 'Achievements evaluated successfully');

    const userAchList = await AchievementService.getUserAchievements(testUser._id);
    assert(userAchList.achievements.length >= 5, 'User achievement catalog populated');
    const firstSteps = userAchList.achievements.find((a: any) => a.code === 'first_quiz');
    assert(firstSteps?.unlocked === true, '"First Steps" badge unlocked for student with completed sessions');

    // TEST 11: Deterministic Leaderboard
    console.log('\n🔹 [TEST SUITE 11] Leaderboard & Redis Caching');
    const leaderboard = await LeaderboardService.getLeaderboard('global', undefined, testUser._id.toString(), 10);
    assert(Array.isArray(leaderboard), 'Leaderboard returned list of ranked users');
    if (leaderboard.length > 0) {
      assert(leaderboard[0].rank === 1, 'Top user assigned Rank #1');
    }

    // TEST 12: Anti-Cheating & Anomaly Detection Signals
    console.log('\n🔹 [TEST SUITE 12] Anti-Cheat Signal Analysis');
    const suspiciousAnswers = [
      { questionId: 'q1', timeSpentSeconds: 0.5 },
      { questionId: 'q2', timeSpentSeconds: 0.8 },
      { questionId: 'q3', timeSpentSeconds: 0.3 },
      { questionId: 'q4', timeSpentSeconds: 0.9 },
      { questionId: 'q5', timeSpentSeconds: 0.4 },
      { questionId: 'q6', timeSpentSeconds: 0.6 },
      { questionId: 'q7', timeSpentSeconds: 0.2 },
      { questionId: 'q8', timeSpentSeconds: 0.7 },
      { questionId: 'q9', timeSpentSeconds: 0.5 },
      { questionId: 'q10', timeSpentSeconds: 0.6 },
    ];
    const antiCheatAnalysis = AntiCheatService.analyzeSubmissionTiming(suspiciousAnswers, 5, 30);
    assert(antiCheatAnalysis.isFlagged === true, 'Anti-cheat detected impossibly rapid answer timing');
    assert(antiCheatAnalysis.metrics.averageTimePerQuestion < 1.5, 'Anti-cheat calculated average speed correctly');

    // TEST 13: Competition Lifecycle & Anti-Cheating Integration
    console.log('\n🔹 [TEST SUITE 13] Competition Lifecycle & Scoring');
    const now = new Date();
    const testComp = await Competition.create({
      title: `JAMB National Challenge ${Date.now()}`,
      slug: `jamb-challenge-${Date.now()}`,
      description: 'National championship exam for top candidates',
      exam: 'JAMB',
      subjects: ['Mathematics'],
      questions: [testQuestion._id],
      durationMinutes: 10,
      registrationStartDate: new Date(now.getTime() - 3600000),
      registrationEndDate: new Date(now.getTime() + 3600000),
      startTime: new Date(now.getTime() - 1800000),
      endTime: new Date(now.getTime() + 1800000),
      status: 'active',
      entryFeeNgn: 0,
      prizes: [
        { rank: 1, title: '1st Prize', cashNgn: 1000, xpBonus: 500 },
      ],
    });

    const participant = await CompetitionService.registerParticipant(testComp._id, testUser._id);
    assert(participant.status === 'registered', 'User registered for competition');

    const examStart = await CompetitionService.startParticipantExam(testComp._id, testUser._id);
    assert(examStart.questions.length > 0, 'Competition exam started with secure questions payload');

    const compSubmit = await CompetitionService.submitParticipantExam(
      testComp._id,
      testUser._id,
      [{ questionId: testQuestion._id.toString(), userAnswer: '1/13', timeSpentSeconds: 30 }]
    );
    assert(compSubmit.score === 1, 'Competition exam scored 1/1');
    assert(compSubmit.percentage === 100, 'Competition score percentage 100%');

    // TEST 14: Subscriptions Automation
    console.log('\n🔹 [TEST SUITE 14] Subscriptions Automation');
    await SubscriptionService.seedDefaultPlans();
    const sub = await SubscriptionService.subscribeUserWithWallet(testUser._id, 'monthly_pro');
    assert(sub.status === 'active', 'Subscription successfully activated with wallet balance');
    assert(sub.amountPaidNgn === 1500, 'Subscription deducted exact plan price');

    const hasSub = await SubscriptionService.hasActiveSubscription(testUser._id);
    assert(hasSub === true, 'hasActiveSubscription confirmed active status');

    // TEST 15: Referral System & Fraud Prevention
    console.log('\n🔹 [TEST SUITE 15] Referral System');
    const referralCode = ReferralService.generateReferralCode(testUser);
    assert(referralCode.length >= 6, `Referral code generated: ${referralCode}`);

    // Self referral attempt must be rejected
    const selfRef = await ReferralService.recordReferral(testUser._id, referralCode);
    assert(selfRef === null, 'Self-referral correctly blocked by anti-fraud check');

    // Create referee user
    const refereeUser = await User.create({
      name: 'Referred Friend',
      email: `referee_${Date.now()}@preplyx.test`,
      password: 'Password123!',
      xp: 100,
    });
    const validRef = await ReferralService.recordReferral(refereeUser._id, referralCode);
    assert(validRef !== null, 'Valid referral successfully registered');

    const rewardSuccess = await ReferralService.qualifyAndRewardReferral(refereeUser._id);
    assert(rewardSuccess === true, 'Referral qualified and rewarded both parties');

    // TEST 16: Notification Deduplication
    console.log('\n🔹 [TEST SUITE 16] Notification Deduplication & Preferences');
    const notifKey = `TEST_DEDUP:${Date.now()}:${testUser._id}`;
    const notifRes1 = await NotificationService.dispatch({
      userId: testUser._id,
      eventType: 'DAILY_CHALLENGE',
      deduplicationKey: notifKey,
      title: 'Daily Challenge Ready',
      message: 'Take today’s test now!',
      channels: ['in_app'],
    });
    assert(notifRes1.dispatched === true, 'First notification dispatched successfully');

    const notifRes2 = await NotificationService.dispatch({
      userId: testUser._id,
      eventType: 'DAILY_CHALLENGE',
      deduplicationKey: notifKey,
      title: 'Daily Challenge Ready',
      message: 'Take today’s test now!',
      channels: ['in_app'],
    });
    assert(notifRes2.dispatched === false, 'Duplicate notification intercepted and suppressed');

    // TEST 17: Security & Audit Logging
    console.log('\n🔹 [TEST SUITE 17] Security & Audit Telemetry');
    const health = await SecurityAuditService.getSystemHealthMetrics();
    assert(health.status === 'healthy' || health.status === 'degraded', `System health metric reported: status ${health.status}`);
    assert(health.services.database.status === 'connected', 'Database reported connected');

    const audit = await SecurityAuditService.recordAdminAction({
      adminEmail: 'admin@preplyx.com.ng',
      action: 'TEST_AUDIT_ACTION',
      resourceType: 'SystemConfig',
      details: { test: true },
    });
    assert(audit.action === 'TEST_AUDIT_ACTION', 'Admin action recorded in immutable audit log');

    // TEST 18: Analytics Reports Generation
    console.log('\n🔹 [TEST SUITE 18] Daily & Weekly Reports');
    const dailyReport = await AnalyticsReportService.generateDailyReport(testDate);
    assert(dailyReport.date === testDate, 'Daily report generated and persisted');

    // Cleanup test data
    console.log('\n🧹 Cleaning up test fixtures...');
    await User.deleteMany({ email: { $in: [testEmail, refereeUser.email] } });
    await Wallet.deleteMany({ user: { $in: [testUser._id, refereeUser._id] } });
    await Question.findByIdAndDelete(testQuestion._id);
    await DailyChallenge.deleteMany({ date: testDate });
    await DailyChallengeSubmission.deleteMany({ date: testDate });
    await Competition.findByIdAndDelete(testComp._id);
    await CompetitionParticipant.deleteMany({ competition: testComp._id });
    await Subscription.deleteMany({ user: testUser._id });
    await Referral.deleteMany({ referrer: testUser._id });
    await DailyReport.deleteMany({ date: testDate });

    console.log('\n=======================================================');
    console.log(`🎉 TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('=======================================================\n');

    await mongoose.disconnect();
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal Test Runner Error:', error);
    process.exit(1);
  }
}

runTests();
