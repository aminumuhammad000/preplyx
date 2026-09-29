import mongoose from 'mongoose';
import User from '../models/User';
import NotificationLog, {
  NotificationChannel,
  NotificationEventType,
} from '../models/NotificationLog';
import { sendEmail } from './emailService';

export interface DispatchNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  eventType: NotificationEventType;
  deduplicationKey: string;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  emailSubject?: string;
  emailHtml?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatches a notification across specified channels with strict deduplication
   */
  public static async dispatch(params: DispatchNotificationParams): Promise<{
    dispatched: boolean;
    reason?: string;
  }> {
    const {
      userId,
      eventType,
      deduplicationKey,
      title,
      message,
      channels = ['in_app'],
      emailSubject,
      emailHtml,
      metadata = {},
    } = params;

    // 1. Deduplication check: Has this notification already been delivered?
    const existing = await NotificationLog.findOne({ deduplicationKey });
    if (existing) {
      return { dispatched: false, reason: 'Duplicate notification prevented by deduplicationKey' };
    }

    const user = await User.findById(userId);
    if (!user) {
      return { dispatched: false, reason: 'User not found' };
    }

    // Check user preference settings
    const allowInApp = user.settings?.notifications !== false;
    const allowEmail = user.settings?.emailNotifications !== false;

    let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
    let inAppStatus: 'saved' | 'failed' = 'failed';

    // 2. In-App Delivery
    if (channels.includes('in_app') && allowInApp) {
      try {
        const notifItem = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          type: eventType.toLowerCase(),
          title,
          message,
          time: 'Just now',
          unread: true,
        };

        if (!user.notifications) user.notifications = [];
        user.notifications.unshift(notifItem);

        // Keep last 50 notifications
        if (user.notifications.length > 50) {
          user.notifications = user.notifications.slice(0, 50);
        }

        await user.save();
        inAppStatus = 'saved';
      } catch (err) {
        console.error('[Notification Engine] In-app save failed:', err);
        inAppStatus = 'failed';
      }
    }

    // 3. Email Delivery
    if (channels.includes('email') && allowEmail && user.email) {
      try {
        const subject = emailSubject || title;
        const html =
          emailHtml ||
          `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #7B2FF7;">${title}</h2>
            <p style="font-size: 15px; line-height: 1.6;">${message}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8;">Preplyx Online CBT Platform</p>
          </div>`;

        const sent = await sendEmail({
          to: user.email,
          subject,
          html,
          text: message,
        });

        emailStatus = sent ? 'sent' : 'failed';
      } catch (err) {
        console.error('[Notification Engine] Email dispatch failed:', err);
        emailStatus = 'failed';
      }
    }

    // 4. Record to NotificationLog for audit and idempotency
    await NotificationLog.create({
      user: user._id,
      eventType,
      deduplicationKey,
      title,
      message,
      channels,
      emailStatus,
      inAppStatus,
      metadata,
    });

    console.log(`[Notification Engine] Dispatched [${eventType}] to ${user.email} (In-App: ${inAppStatus}, Email: ${emailStatus})`);
    return { dispatched: true };
  }
}
