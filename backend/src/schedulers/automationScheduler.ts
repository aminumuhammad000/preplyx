import cron from 'node-cron';
import { AUTOMATION_CONFIG } from '../config/automationConfig';
import { QueueManager, QUEUE_NAMES } from '../queues/queueManager';
import { StreakService } from '../services/streakService';
import { acquireLock, releaseLock } from '../config/redis';
import AutomationJobState, { IAutomationJobState } from '../models/AutomationJobState';
import { eventBus, EVENTS } from '../events/eventBus';

interface ScheduledTaskDef {
  jobName: string;
  displayName: string;
  category: 'learning' | 'gamification' | 'competition' | 'business' | 'retention' | 'analytics';
  cronSchedule: string;
  handler: () => Promise<void>;
}

export class AutomationScheduler {
  private static cronTasks: any[] = [];

  /**
   * Initializes and schedules all background automation tasks
   */
  public static async initScheduler(): Promise<void> {
    console.log('⏰ [Automation Scheduler] Initializing scheduled automation jobs (Timezone: Africa/Lagos)...');

    const scheduledJobDefs: ScheduledTaskDef[] = [
      // 1. Question of the Day (Daily at 00:00)
      {
        jobName: 'daily_challenge_generator',
        displayName: 'Question of the Day Generator',
        category: 'learning',
        cronSchedule: AUTOMATION_CONFIG.cron.dailyChallenge,
        handler: async () => {
          await QueueManager.addJob(QUEUE_NAMES.LEARNING, 'generate_daily_challenge', {
            targetDate: StreakService.getLagosDateString(),
          });
        },
      },

      // 2. Daily Quiz Generation (Daily at 01:00)
      {
        jobName: 'daily_quiz_generator',
        displayName: 'Daily & Subject Quiz Generator',
        category: 'learning',
        cronSchedule: AUTOMATION_CONFIG.cron.dailyQuizGeneration,
        handler: async () => {
          const dateStr = StreakService.getLagosDateString();
          await QueueManager.addJob(QUEUE_NAMES.LEARNING, 'generate_daily_jamb_quiz', { targetDate: dateStr });
          await QueueManager.addJob(QUEUE_NAMES.LEARNING, 'generate_daily_subject_quizzes', { targetDate: dateStr });
        },
      },

      // 3. Subscription Checks & Expiry Reminders (Every hour)
      {
        jobName: 'subscription_expiry_processor',
        displayName: 'Subscription Expiry & 7d/3d/1d Reminders',
        category: 'business',
        cronSchedule: AUTOMATION_CONFIG.cron.subscriptionCheck,
        handler: async () => {
          await QueueManager.addJob(QUEUE_NAMES.RETENTION, 'process_subscription_expirations', {});
        },
      },

      // 4. Inactive Users Scanning & Onboarding (Every 30 minutes)
      {
        jobName: 'inactive_users_scanner',
        displayName: 'Inactive User Nudges & Onboarding Check',
        category: 'retention',
        cronSchedule: AUTOMATION_CONFIG.cron.inactiveUserCheck,
        handler: async () => {
          await QueueManager.addJob(QUEUE_NAMES.RETENTION, 'process_onboarding_reminders', {});
          await QueueManager.addJob(QUEUE_NAMES.RETENTION, 'process_inactive_users', {});
        },
      },

      // 5. Competition State Runner & Live Rankings (Every 1 minute)
      {
        jobName: 'competition_lifecycle_runner',
        displayName: 'Competition Lifecycle & Winner Scoring Runner',
        category: 'competition',
        cronSchedule: AUTOMATION_CONFIG.cron.competitionRunner,
        handler: async () => {
          await QueueManager.addJob(QUEUE_NAMES.COMPETITIONS, 'process_competition_lifecycle', {});
        },
      },

      // 6. Streak At-Risk Reminder (Daily at 20:00 / 8 PM)
      {
        jobName: 'streak_risk_notifier',
        displayName: 'Streak At-Risk Evening Reminder',
        category: 'gamification',
        cronSchedule: AUTOMATION_CONFIG.cron.streakRiskReminder,
        handler: async () => {
          const atRiskStreaks = await StreakService.findStreaksAtRisk();
          const today = StreakService.getLagosDateString();

          for (const s of atRiskStreaks) {
            s.atRiskNotifiedDate = today;
            await s.save();

            eventBus.emitEvent(EVENTS.STREAK_AT_RISK, {
              userId: s.user,
              currentStreak: s.currentStreak,
            });
          }
        },
      },

      // 7. Nightly Analytics Aggregation (Daily at 23:55)
      {
        jobName: 'nightly_analytics_aggregator',
        displayName: 'Daily Admin Analytics & Metrics Aggregator',
        category: 'analytics',
        cronSchedule: AUTOMATION_CONFIG.cron.nightlyAnalytics,
        handler: async () => {
          await QueueManager.addJob(QUEUE_NAMES.ANALYTICS, 'generate_daily_report', {
            targetDate: StreakService.getLagosDateString(),
          });
        },
      },

      // 8. Weekly Reports (Sundays at 23:59)
      {
        jobName: 'weekly_reports_aggregator',
        displayName: 'Weekly Executive Report & Trends Aggregator',
        category: 'analytics',
        cronSchedule: AUTOMATION_CONFIG.cron.weeklyReports,
        handler: async () => {
          await QueueManager.addJob(QUEUE_NAMES.ANALYTICS, 'generate_weekly_report', {});
          await QueueManager.addJob(QUEUE_NAMES.LEARNING, 'generate_weekly_mock', {});
        },
      },
    ];

    // Register each scheduled task with state persistence and distributed lock
    for (const def of scheduledJobDefs) {
      await this.registerScheduledTask(def);
    }

    console.log(`✅ [Automation Scheduler] Successfully scheduled ${scheduledJobDefs.length} automated jobs.`);
  }

  private static async registerScheduledTask(def: ScheduledTaskDef): Promise<void> {
    // Upsert job state record in database
    let jobRecord = await AutomationJobState.findOne({ jobName: def.jobName });
    if (!jobRecord) {
      jobRecord = await AutomationJobState.create({
        jobName: def.jobName,
        displayName: def.displayName,
        category: def.category,
        cronSchedule: def.cronSchedule,
        isEnabled: true,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
      });
    }

    const task = cron.schedule(
      def.cronSchedule,
      async () => {
        const lockKey = `cron_lock:${def.jobName}`;
        const hasLock = await acquireLock(lockKey, 55);
        if (!hasLock) return; // Another worker instance already executing this job

        const startTime = Date.now();

        try {
          const currentRecord = await AutomationJobState.findOne({ jobName: def.jobName });
          if (currentRecord && !currentRecord.isEnabled) {
            console.log(`[Scheduler] Skipping disabled job: ${def.displayName}`);
            return;
          }

          console.log(`⚡ [Scheduler Run] Executing job: ${def.displayName}`);
          await def.handler();

          const durationMs = Date.now() - startTime;
          await AutomationJobState.findOneAndUpdate(
            { jobName: def.jobName },
            {
              lastRunStartTime: new Date(startTime),
              lastRunEndTime: new Date(),
              lastRunStatus: 'success',
              lastRunDurationMs: durationMs,
              $inc: { totalRuns: 1, successfulRuns: 1 },
            }
          );
        } catch (error: any) {
          const durationMs = Date.now() - startTime;
          console.error(`❌ [Scheduler Error] Job ${def.displayName} failed:`, error);
          await AutomationJobState.findOneAndUpdate(
            { jobName: def.jobName },
            {
              lastRunStartTime: new Date(startTime),
              lastRunEndTime: new Date(),
              lastRunStatus: 'failed',
              lastRunDurationMs: durationMs,
              lastError: error?.message || 'Unknown error',
              $inc: { totalRuns: 1, failedRuns: 1 },
            }
          );
        } finally {
          await releaseLock(lockKey);
        }
      },
      {
        timezone: AUTOMATION_CONFIG.timezone,
      }
    );

    this.cronTasks.push(task);
  }

  /**
   * Manually triggers any scheduled job immediately
   */
  public static async runJobNow(jobName: string): Promise<boolean> {
    if (jobName === 'daily_challenge_generator') {
      await QueueManager.addJob(QUEUE_NAMES.LEARNING, 'generate_daily_challenge', {
        targetDate: StreakService.getLagosDateString(),
      });
      return true;
    }
    if (jobName === 'daily_quiz_generator') {
      const dateStr = StreakService.getLagosDateString();
      await QueueManager.addJob(QUEUE_NAMES.LEARNING, 'generate_daily_jamb_quiz', { targetDate: dateStr });
      await QueueManager.addJob(QUEUE_NAMES.LEARNING, 'generate_daily_subject_quizzes', { targetDate: dateStr });
      return true;
    }
    if (jobName === 'subscription_expiry_processor') {
      await QueueManager.addJob(QUEUE_NAMES.RETENTION, 'process_subscription_expirations', {});
      return true;
    }
    if (jobName === 'inactive_users_scanner') {
      await QueueManager.addJob(QUEUE_NAMES.RETENTION, 'process_onboarding_reminders', {});
      await QueueManager.addJob(QUEUE_NAMES.RETENTION, 'process_inactive_users', {});
      return true;
    }
    if (jobName === 'competition_lifecycle_runner') {
      await QueueManager.addJob(QUEUE_NAMES.COMPETITIONS, 'process_competition_lifecycle', {});
      return true;
    }
    if (jobName === 'nightly_analytics_aggregator') {
      await QueueManager.addJob(QUEUE_NAMES.ANALYTICS, 'generate_daily_report', {
        targetDate: StreakService.getLagosDateString(),
      });
      return true;
    }
    if (jobName === 'weekly_reports_aggregator') {
      await QueueManager.addJob(QUEUE_NAMES.ANALYTICS, 'generate_weekly_report', {});
      return true;
    }

    return false;
  }

  /**
   * Stops all cron tasks gracefully
   */
  public static stopAll(): void {
    console.log('[Automation Scheduler] Stopping all scheduled cron tasks...');
    for (const task of this.cronTasks) {
      task.stop();
    }
    this.cronTasks.length = 0;
  }
}
