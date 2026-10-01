export const AUTOMATION_CONFIG = {
  timezone: process.env.APP_TIMEZONE || 'Africa/Lagos',

  // XP Rules
  xp: {
    answerQuestion: 2,
    completeQuiz: 20,
    perfectQuiz: 50,
    dailyChallenge: 20,
    streakMilestone7: 100,
    streakMilestone30: 300,
    streakMilestone100: 1000,
    competitionWinner: 500,
    competitionTop10: 200,
    referralBonus: 150,
  },

  // Streak Rules
  streak: {
    minimumQuestionsForDailyActivity: 1,
    freezeAllowedDays: 1,
    riskNotificationHour: 20, // 8:00 PM Lagos time
  },

  // Performance Engine
  performance: {
    weakTopicThresholdAccuracy: 50, // Below 50% accuracy is marked weak
    strongTopicThresholdAccuracy: 75, // Above 75% accuracy is marked strong
    recentSessionsWindow: 10,
    adaptiveThresholdHigh: 80, // >= 80% upgrades difficulty
    adaptiveThresholdLow: 45,  // < 45% downgrades difficulty
  },

  // Recommendations
  recommendations: {
    defaultQuestionCount: 15,
    maxWeakTopicsRecommended: 5,
    refreshIntervalHours: 12,
  },

  // Daily Challenge & Daily Quizzes
  dailyChallenge: {
    questionCooldownDays: 30, // Don't repeat question within 30 days
    scheduleHour: 0, // 00:00 Lagos time
  },

  // Anti-Cheat Signals
  antiCheat: {
    minimumSecondsPerQuestion: 2.0, // Submitting answers faster than 2s/question
    impossibleSpeedMultiplier: 0.15, // Total quiz completed in < 15% of allocated time
    maxSuspiciousSubmissionsBeforeFlag: 2,
  },

  // Onboarding & Inactive Users
  retention: {
    onboardingReminderHours: [24, 72, 168], // 24h, 3d, 7d
    inactiveUserDays: [3, 7, 14, 30],
  },

  // Subscription Automation
  subscriptions: {
    expiryReminderDays: [7, 3, 1],
    gracePeriodDays: 2,
  },

  // Referral System
  referrals: {
    referrerBonusXp: 150,
    referrerBonusNgn: 200,
    refereeBonusXp: 100,
    refereeBonusNgn: 100,
  },

  // Schedulers cron expressions (Africa/Lagos)
  cron: {
    dailyChallenge: '0 0 * * *',      // Every day at 00:00
    dailyQuizGeneration: '0 1 * * *', // Every day at 01:00
    subscriptionCheck: '0 * * * *',   // Every hour at :00
    inactiveUserCheck: '*/30 * * * *',// Every 30 minutes
    competitionRunner: '* * * * *',   // Every 1 minute
    streakRiskReminder: '0 20 * * *', // Every day at 20:00 (8 PM)
    nightlyAnalytics: '55 23 * * *',  // Every day at 23:55
    weeklyReports: '59 23 * * 0',     // Every Sunday at 23:59
  },
};
