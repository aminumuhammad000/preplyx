import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisAvailable } from '../config/redis';

/**
 * HTTP Security Headers Middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking by disallowing framing from other origins
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Enable XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Enforce HTTPS transmission
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
};

/**
 * Sliding Window In-Memory / Redis Rate Limiter
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.ip) || 'unknown_ip';
      return `${ip}:${req.baseUrl || ''}${req.path}`;
    },
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // In test environment, allow high throughput
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Never rate limit OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();

    // 1. If Redis is available, attempt Redis-backed rate limiting
    if (isRedisAvailable) {
      try {
        const client = getRedisClient();
        const currentCount = await client.incr(key);
        if (currentCount === 1) {
          await client.pexpire(key, windowMs);
        }

        const ttl = await client.pttl(key);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - currentCount));
        res.setHeader('X-RateLimit-Reset', Math.ceil((now + ttl) / 1000));

        if (currentCount > max) {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message,
            },
          });
          return;
        }

        return next();
      } catch (redisErr) {
        // Fallback to in-memory store
      }
    }

    // 2. In-memory fallback
    const record = memoryStore.get(key);

    if (!record || record.resetAt <= now) {
      memoryStore.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > max) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
        },
      });
      return;
    }

    next();
  };
};

// Standard rate limiters for Preplyx routes
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 min
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 180, // 180 requests per minute
  message: 'API rate limit exceeded. Please throttle your requests.',
});

export const examSubmitLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 submissions per minute
  message: 'Exam submission rate limit reached. Please wait a moment before retrying.',
});
