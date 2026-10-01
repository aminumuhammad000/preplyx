import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redisConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(redisConnectionOptions);

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      console.log(`[Redis] Connected to Redis server at ${REDIS_HOST}:${REDIS_PORT}`);
    });

    redisClient.on('ready', () => {
      isRedisAvailable = true;
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      console.warn(`[Redis] Redis connection warning: ${err.message}`);
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
    });
  }

  return redisClient;
};

export const checkRedisHealth = async (): Promise<{ connected: boolean; latencyMs: number }> => {
  try {
    const client = getRedisClient();
    const start = Date.now();
    const pong = await client.ping();
    const latencyMs = Date.now() - start;
    return { connected: pong === 'PONG', latencyMs };
  } catch (error) {
    return { connected: false, latencyMs: -1 };
  }
};

/**
 * Distributed lock utility for preventing duplicate executions across workers/processes
 */
export const acquireLock = async (
  lockKey: string,
  ttlSeconds: number = 60
): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.set(`lock:${lockKey}`, 'LOCKED', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    // If redis fails, permit execution with local fallback
    return true;
  }
};

export const releaseLock = async (lockKey: string): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.del(`lock:${lockKey}`);
  } catch (error) {
    // Ignore release error
  }
};

export { isRedisAvailable };
