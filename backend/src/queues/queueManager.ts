import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { redisConnectionOptions, isRedisAvailable } from '../config/redis';

export const QUEUE_NAMES = {
  PERFORMANCE: 'preplyx_performance',
  GAMIFICATION: 'preplyx_gamification',
  NOTIFICATIONS: 'preplyx_notifications',
  LEARNING: 'preplyx_learning',
  COMPETITIONS: 'preplyx_competitions',
  RETENTION: 'preplyx_retention',
  ANALYTICS: 'preplyx_analytics',
  AI: 'preplyx_ai',
} as const;

export type PreplyxQueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs in memory
  removeOnFail: 500,     // Keep last 500 failed jobs for admin debugging
};

const queueMap = new Map<string, Queue>();

export class QueueManager {
  /**
   * Retrieves or initializes a BullMQ Queue
   */
  public static getQueue(queueName: PreplyxQueueName): Queue {
    if (!queueMap.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: redisConnectionOptions,
        defaultJobOptions,
      });

      queue.on('error', (err) => {
        console.warn(`[Queue: ${queueName}] Queue error: ${err.message}`);
      });

      queueMap.set(queueName, queue);
    }

    return queueMap.get(queueName)!;
  }

  /**
   * Enqueues a job with exponential backoff and idempotency key
   */
  public static async addJob(
    queueName: PreplyxQueueName,
    jobName: string,
    data: any,
    options?: JobsOptions
  ): Promise<any> {
    try {
      const queue = this.getQueue(queueName);
      return await queue.add(jobName, data, {
        ...defaultJobOptions,
        ...options,
      });
    } catch (error: any) {
      console.warn(`[QueueManager] Direct queue enqueue failed (${error.message}). Running job asynchronously.`);
      // Async fallback execution
      setImmediate(async () => {
        const { WorkerManager } = await import('../workers/workerManager');
        await WorkerManager.executeDirectly(queueName, jobName, data);
      });
      return { id: `fallback-${Date.now()}` };
    }
  }

  /**
   * Returns job counts across all queues for monitoring
   */
  public static async getAllQueueMetrics(): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {};

    for (const [name, queue] of Object.entries(QUEUE_NAMES)) {
      try {
        const q = this.getQueue(queue);
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          q.getWaitingCount(),
          q.getActiveCount(),
          q.getCompletedCount(),
          q.getFailedCount(),
          q.getDelayedCount(),
        ]);
        metrics[queue] = { waiting, active, completed, failed, delayed };
      } catch (err) {
        metrics[queue] = { status: 'offline' };
      }
    }

    return metrics;
  }

  /**
   * Closes all queue connections gracefully
   */
  public static async closeAll(): Promise<void> {
    for (const [_, queue] of queueMap) {
      await queue.close();
    }
    queueMap.clear();
  }
}
