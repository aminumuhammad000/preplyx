import mongoose from 'mongoose';
import SubscriptionPlan, { ISubscriptionPlan } from '../models/SubscriptionPlan';
import Subscription, { ISubscription } from '../models/Subscription';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import { NotificationService } from './notificationService';
import { eventBus, EVENTS } from '../events/eventBus';

export const DEFAULT_PLANS: Partial<ISubscriptionPlan>[] = [
  {
    name: 'Preplyx Monthly Pro',
    code: 'monthly_pro',
    description: 'Unlimited CBT exam simulations, instant AI explanations, and weak-topic practice for 30 days.',
    priceNgn: 1500,
    durationDays: 30,
    features: ['Unlimited Practice Exams', 'AI Tutor & Explanations', 'Personalized Recommendations', 'Daily Challenge XP Boost'],
    isActive: true,
  },
  {
    name: 'Preplyx Term Pass',
    code: 'quarterly_pro',
    description: 'Full exam preparation pass for 90 days. Ideal for comprehensive JAMB & WAEC revision.',
    priceNgn: 3500,
    durationDays: 90,
    features: ['All Monthly Pro Features', 'Weekly Full Mocks', 'Anti-Cheat Competition Entry', 'Priority AI Tutor Access'],
    isActive: true,
    isPopular: true,
  },
  {
    name: 'Preplyx Annual Champion',
    code: 'annual_pro',
    description: '365 days of complete access to all exams, subjects, mocks, and competition entries.',
    priceNgn: 8000,
    durationDays: 365,
    features: ['Full Unlimited Access', 'All Exam Types', 'Direct WhatsApp Tutor Support', 'Free Competition Entries'],
    isActive: true,
  },
];

export class SubscriptionService {
  /**
   * Seeds default subscription plans if none exist
   */
  public static async seedDefaultPlans(): Promise<void> {
    for (const plan of DEFAULT_PLANS) {
      const exists = await SubscriptionPlan.findOne({ code: plan.code });
      if (!exists) {
        await SubscriptionPlan.create(plan);
      }
    }
  }

  /**
   * Subscribes a user to a plan using wallet balance (Server-authoritative payment verification)
   */
  public static async subscribeUserWithWallet(
    userId: string | mongoose.Types.ObjectId,
    planCode: string
  ): Promise<ISubscription> {
    await this.seedDefaultPlans();

    const plan = await SubscriptionPlan.findOne({ code: planCode, isActive: true });
    if (!plan) throw new Error('Subscription plan not found or inactive.');

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < plan.priceNgn) {
      throw new Error(`Insufficient wallet balance (₦${wallet?.balance || 0}). Plan price is ₦${plan.priceNgn}. Please fund your wallet.`);
    }

    // Deduct wallet balance
    const prevBalance = wallet.balance;
    wallet.balance -= plan.priceNgn;
    wallet.totalSpent += plan.priceNgn;
    await wallet.save();

    await Transaction.create({
      user: userId,
      type: 'spending',
      amount: plan.priceNgn,
      balanceBefore: prevBalance,
      balanceAfter: wallet.balance,
      status: 'completed',
      description: `Subscription: ${plan.name} (${plan.durationDays} Days)`,
    });

    const now = new Date();
    const startDate = now;
    const endDate = new Date(now.getTime() + plan.durationDays * 24 * 3600 * 1000);

    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,
      planCode: plan.code,
      startDate,
      endDate,
      status: 'active',
      amountPaidNgn: plan.priceNgn,
      autoRenew: false,
      remindersSent: [],
    });

    eventBus.emitEvent(EVENTS.SUBSCRIPTION_STARTED, {
      userId,
      subscriptionId: subscription._id,
      planCode: plan.code,
      endDate,
    });

    await NotificationService.dispatch({
      userId,
      eventType: 'WELCOME',
      deduplicationKey: `SUB_STARTED:${subscription._id}`,
      title: `${plan.name} Activated! 🎉`,
      message: `Your ${plan.name} is now active until ${endDate.toDateString()}. Enjoy unlimited practice!`,
      channels: ['in_app', 'email'],
    });

    return subscription;
  }

  /**
   * Scheduled runner: Checks for expiring (7d, 3d, 1d) and expired subscriptions
   */
  public static async processSubscriptionExpirations(): Promise<void> {
    const now = new Date();

    // 1. Mark expired subscriptions
    const expiredSubs = await Subscription.find({
      status: { $in: ['active', 'expiring_soon', 'grace_period'] },
      endDate: { $lt: now },
    });

    for (const sub of expiredSubs) {
      sub.status = 'expired';
      await sub.save();

      eventBus.emitEvent(EVENTS.SUBSCRIPTION_EXPIRED, {
        userId: sub.user,
        subscriptionId: sub._id,
      });

      await NotificationService.dispatch({
        userId: sub.user,
        eventType: 'SUBSCRIPTION_EXPIRED',
        deduplicationKey: `SUB_EXPIRED:${sub._id}`,
        title: 'Your Preplyx Subscription Has Expired',
        message: 'Your subscription has ended. Renew today to maintain uninterrupted access to practice tests and AI explanations!',
        channels: ['in_app', 'email'],
      });

      console.log(`[Subscription Engine] Marked subscription ${sub._id} for user ${sub.user} as expired.`);
    }

    // 2. Process expiry reminders: 7 days, 3 days, 1 day
    const activeSubs = await Subscription.find({
      status: { $in: ['active', 'expiring_soon'] },
      endDate: { $gte: now },
    });

    for (const sub of activeSubs) {
      const daysUntilExpiry = Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const sentDays = sub.remindersSent.map((r) => r.daysBefore);

      let reminderDay = 0;
      if (daysUntilExpiry <= 1 && !sentDays.includes(1)) {
        reminderDay = 1;
      } else if (daysUntilExpiry <= 3 && daysUntilExpiry > 1 && !sentDays.includes(3)) {
        reminderDay = 3;
      } else if (daysUntilExpiry <= 7 && daysUntilExpiry > 3 && !sentDays.includes(7)) {
        reminderDay = 7;
      }

      if (reminderDay > 0) {
        sub.status = 'expiring_soon';
        sub.remindersSent.push({ daysBefore: reminderDay, sentAt: now });
        await sub.save();

        await NotificationService.dispatch({
          userId: sub.user,
          eventType: 'SUBSCRIPTION_EXPIRING',
          deduplicationKey: `SUB_EXPIRY:${reminderDay}D:${sub._id}`,
          title: `Your subscription expires in ${reminderDay} day${reminderDay > 1 ? 's' : ''} ⏳`,
          message: `Your Preplyx Pro plan will expire on ${sub.endDate.toDateString()}. Fund your wallet to renew seamlessly.`,
          channels: ['in_app', 'email'],
        });

        console.log(`[Subscription Engine] Sent ${reminderDay}-day expiry reminder for sub ${sub._id}.`);
      }
    }
  }

  /**
   * Checks if a user has active subscription
   */
  public static async hasActiveSubscription(userId: string | mongoose.Types.ObjectId): Promise<boolean> {
    const sub = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'expiring_soon', 'grace_period'] },
      endDate: { $gte: new Date() },
    });
    return !!sub;
  }
}
