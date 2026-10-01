import mongoose from 'mongoose';
import User from '../models/User';
import ExamSession from '../models/ExamSession';
import InactiveUserLog from '../models/InactiveUserLog';
import { NotificationService } from './notificationService';

export class InactiveUserService {
  /**
   * Scans for inactive users and dispatches progressive re-engagement nudges
   */
  public static async processInactiveUsers(): Promise<void> {
    const now = new Date();
    const users = await User.find({ status: 'active' }).select('_id name email createdAt');

    for (const user of users) {
      // Find latest session for this user
      const latestSession = await ExamSession.findOne({ user: user._id }).sort({ createdAt: -1 });

      const lastActivityDate = latestSession ? latestSession.createdAt : user.createdAt || new Date(0);
      const daysInactive = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysInactive < 3) continue;

      let milestone = 0;
      let title = '';
      let message = '';

      if (daysInactive >= 30) {
        milestone = 30;
        title = 'We miss you on Preplyx! 🎓';
        message = `Hi ${user.name}, exam day is getting closer! Log back in to refresh your knowledge with 10 quick practice questions.`;
      } else if (daysInactive >= 14) {
        milestone = 14;
        title = 'Keep your exam prep on track! ⚡';
        message = `Hi ${user.name}, consistency is the secret to high JAMB scores. Complete a quick practice quiz today!`;
      } else if (daysInactive >= 7) {
        milestone = 7;
        title = 'Time for a quick study session? 📖';
        message = `It has been a week since your last practice session. Try today’s Daily Challenge to restart your streak!`;
      } else if (daysInactive >= 3) {
        milestone = 3;
        title = 'Don’t lose your momentum! 🔥';
        message = `Hi ${user.name}, a short 5-minute quiz today will keep your memory sharp. Jump back in!`;
      }

      if (milestone > 0) {
        // Check if message for this milestone has already been sent within last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const existingLog = await InactiveUserLog.findOne({
          user: user._id,
          milestoneTriggered: milestone,
          createdAt: { $gte: thirtyDaysAgo },
        });

        if (!existingLog) {
          const dispatchRes = await NotificationService.dispatch({
            userId: user._id,
            eventType: 'INACTIVE_REMINDER',
            deduplicationKey: `INACTIVE:${milestone}D:${user._id}:${now.toISOString().split('T')[0]}`,
            title,
            message,
            channels: ['in_app', 'email'],
          });

          if (dispatchRes.dispatched) {
            await InactiveUserLog.create({
              user: user._id,
              lastActiveDate: lastActivityDate,
              daysInactive,
              milestoneTriggered: milestone,
              messageSent: message,
              channel: 'email',
              status: 'delivered',
            });
            console.log(`[Inactive User Engine] Sent ${milestone}-day re-engagement nudge to ${user.email}.`);
          }
        }
      }
    }
  }
}
