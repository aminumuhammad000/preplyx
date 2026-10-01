import mongoose from 'mongoose';
import AuditLog, { IAuditLog } from '../models/AuditLog';
import { getRedisClient, checkRedisHealth } from '../config/redis';
import { AntiCheatService } from './antiCheatService';

export class SecurityAuditService {
  /**
   * Records an administrative action in the immutable audit log
   */
  public static async recordAdminAction(params: {
    adminUser?: string | mongoose.Types.ObjectId;
    adminEmail?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details: Record<string, any>;
    clientIp?: string;
    userAgent?: string;
  }): Promise<IAuditLog> {
    const log = await AuditLog.create({
      adminUser: params.adminUser,
      adminEmail: params.adminEmail,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details,
      clientIp: params.clientIp,
      userAgent: params.userAgent,
    });

    console.log(`[Admin Audit] ${params.adminEmail || 'Admin'} performed "${params.action}" on ${params.resourceType} (${params.resourceId || 'N/A'})`);
    return log;
  }

  /**
   * Tracks failed login attempts and triggers security alert if threshold exceeded
   */
  public static async recordFailedLogin(email: string, clientIp?: string): Promise<{
    attempts: number;
    isLocked: boolean;
  }> {
    try {
      const redis = getRedisClient();
      const key = `failed_login:${email.toLowerCase().trim()}`;
      const attempts = await redis.incr(key);

      if (attempts === 1) {
        await redis.expire(key, 900); // 15 minutes window
      }

      if (attempts >= 5) {
        await AntiCheatService.flagActivity({
          type: 'failed_login_spike',
          severity: 'high',
          source: 'auth',
          details: { email, attempts, clientIp },
          clientIp,
        });
      }

      return {
        attempts,
        isLocked: attempts >= 10,
      };
    } catch (err) {
      return { attempts: 1, isLocked: false };
    }
  }

  /**
   * Resets failed login counter upon successful authentication
   */
  public static async clearFailedLogins(email: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(`failed_login:${email.toLowerCase().trim()}`);
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Retrieves comprehensive system health metrics (DB, Redis, Memory, System Load, Error Counters)
   */
  public static async getSystemHealthMetrics(): Promise<any> {
    const mongoState = mongoose.connection.readyState;
    const mongoStatus = mongoState === 1 ? 'connected' : mongoState === 2 ? 'connecting' : 'disconnected';

    const redisHealth = await checkRedisHealth();

    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());

    return {
      status: mongoStatus === 'connected' && redisHealth.connected ? 'healthy' : 'degraded',
      timestamp: new Date(),
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'production',
      services: {
        database: {
          type: 'MongoDB',
          status: mongoStatus,
          host: mongoose.connection.host || '127.0.0.1',
        },
        redis: {
          type: 'Redis Cache & Queue',
          status: redisHealth.connected ? 'connected' : 'disconnected',
          latencyMs: redisHealth.latencyMs,
        },
      },
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Math.round(memoryUsage.rss / (1024 * 1024)),
          heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
          heapUsed: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        },
      },
    };
  }
}
