import { EventEmitter } from 'events';
import AnalyticsEvent from '../models/AnalyticsEvent';

export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  QUIZ_STARTED: 'quiz.started',
  QUESTION_ANSWERED: 'question.answered',
  QUIZ_COMPLETED: 'quiz.completed',
  DAILY_CHALLENGE_ANSWERED: 'daily_challenge.answered',
  COMPETITION_JOINED: 'competition.joined',
  COMPETITION_COMPLETED: 'competition.completed',
  PAYMENT_COMPLETED: 'payment.completed',
  SUBSCRIPTION_STARTED: 'subscription.started',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  REFERRAL_CREATED: 'referral.created',
  REFERRAL_QUALIFIED: 'referral.qualified',
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
  STREAK_UPDATED: 'streak.updated',
  STREAK_MILESTONE: 'streak.milestone',
  STREAK_AT_RISK: 'streak.at_risk',
  INACTIVE_USER_DETECTED: 'user.inactive',
  AI_QUESTION_GENERATED: 'ai.question_generated',
  SECURITY_ALERT: 'security.alert',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

class PreplyxEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Dispatches an event and records it in the analytics stream
   */
  public emitEvent(eventName: EventName, payload: Record<string, any>): boolean {
    // Record to database asynchronously in background
    setImmediate(async () => {
      try {
        await AnalyticsEvent.create({
          eventName,
          user: payload.userId || payload.user?._id,
          sessionId: payload.sessionId || payload.session?._id,
          payload: {
            ...payload,
            user: undefined, // Strip full object to prevent bloated storage
          },
          clientIp: payload.clientIp,
          userAgent: payload.userAgent,
        });
      } catch (err) {
        // Analytics recording should not crash application
        console.warn(`[EventBus] Analytics record failed for ${eventName}:`, err);
      }
    });

    return this.emit(eventName, payload);
  }

  public subscribe(eventName: EventName, handler: (payload: any) => Promise<void> | void): void {
    this.on(eventName, async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for event ${eventName}:`, error);
      }
    });
  }
}

export const eventBus = new PreplyxEventBus();
