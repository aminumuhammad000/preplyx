import mongoose from 'mongoose';
import User from '../models/User';
import Referral, { IReferral } from '../models/Referral';
import ReferralReward from '../models/ReferralReward';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import { XPService } from './xpService';
import { AUTOMATION_CONFIG } from '../config/automationConfig';
import { NotificationService } from './notificationService';
import { eventBus, EVENTS } from '../events/eventBus';

export class ReferralService {
  /**
   * Generates a deterministic, unique referral code for a user
   */
  public static generateReferralCode(user: any): string {
    const cleanName = (user.name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4);
    const uniqueSuffix = user._id.toString().substring(18, 24).toUpperCase();
    return `${cleanName}${uniqueSuffix}`;
  }

  /**
   * Records a referral during user registration
   */
  public static async recordReferral(
    refereeId: string | mongoose.Types.ObjectId,
    referralCode: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<IReferral | null> {
    if (!referralCode || !referralCode.trim()) return null;

    const cleanCode = referralCode.trim().toUpperCase();

    // Find referrer by matching their generated code or checking users
    const allUsers = await User.find().select('_id name email');
    let referrerUser = allUsers.find((u) => this.generateReferralCode(u) === cleanCode);

    if (!referrerUser) {
      console.warn(`[Referral Engine] Referral code "${cleanCode}" not found.`);
      return null;
    }

    // Anti-fraud 1: Prevent self-referral
    if (referrerUser._id.toString() === refereeId.toString()) {
      console.warn(`[Referral Engine] Prevented self-referral for user ${refereeId}.`);
      return null;
    }

    // Anti-fraud 2: Prevent duplicate referee entry
    const existingRef = await Referral.findOne({ referee: refereeId });
    if (existingRef) {
      return existingRef;
    }

    const referral = await Referral.create({
      referrer: referrerUser._id,
      referee: refereeId,
      referralCode: cleanCode,
      status: 'pending',
      rewardProcessed: false,
      clientIp,
      userAgent,
    });

    console.log(`[Referral Engine] Registered referral: ${referrerUser.name} -> referee ${refereeId}.`);

    eventBus.emitEvent(EVENTS.REFERRAL_CREATED, {
      referralId: referral._id,
      referrerId: referrerUser._id,
      refereeId,
      code: cleanCode,
    });

    return referral;
  }

  /**
   * Processes qualification and distributes referral rewards (XP & Wallet cash)
   * Triggered when referee completes first exam or qualifies.
   */
  public static async qualifyAndRewardReferral(
    refereeId: string | mongoose.Types.ObjectId,
    criteria: string = 'first_exam_completed'
  ): Promise<boolean> {
    const referral = await Referral.findOne({
      referee: refereeId,
      status: 'pending',
      rewardProcessed: false,
    });

    if (!referral) return false;

    referral.status = 'qualified';
    referral.qualifiedAt = new Date();
    referral.qualificationCriteriaMet = criteria;
    referral.rewardProcessed = true;
    referral.rewardProcessedAt = new Date();
    await referral.save();

    const referrerUser = await User.findById(referral.referrer);
    const refereeUser = await User.findById(referral.referee);

    if (referrerUser) {
      // 1. Award Referrer XP
      await XPService.awardXP({
        userId: referrerUser._id,
        amount: AUTOMATION_CONFIG.referrals.referrerBonusXp,
        sourceType: 'referral_bonus',
        sourceId: referral._id.toString(),
        reason: `Referral Reward: ${refereeUser?.name || 'Friend'} completed their first test! 🎉`,
      });

      // 2. Award Referrer Cash Bonus to Wallet
      if (AUTOMATION_CONFIG.referrals.referrerBonusNgn > 0) {
        let wallet = await Wallet.findOne({ user: referrerUser._id });
        if (!wallet) {
          wallet = await Wallet.create({ user: referrerUser._id, balance: 0, totalFunded: 0, totalSpent: 0, welcomeBonus: 0 });
        }
        const prev = wallet.balance;
        wallet.balance += AUTOMATION_CONFIG.referrals.referrerBonusNgn;
        wallet.totalFunded += AUTOMATION_CONFIG.referrals.referrerBonusNgn;
        await wallet.save();

        const tx = await Transaction.create({
          user: referrerUser._id,
          type: 'bonus',
          amount: AUTOMATION_CONFIG.referrals.referrerBonusNgn,
          balanceBefore: prev,
          balanceAfter: wallet.balance,
          status: 'completed',
          description: `Referral Cash Bonus for inviting ${refereeUser?.name || 'Student'}`,
        });

        await ReferralReward.create({
          referral: referral._id,
          recipientUser: referrerUser._id,
          recipientRole: 'referrer',
          xpAmount: AUTOMATION_CONFIG.referrals.referrerBonusXp,
          cashAmountNgn: AUTOMATION_CONFIG.referrals.referrerBonusNgn,
          status: 'credited',
          walletTransactionId: tx._id,
        });
      }

      await NotificationService.dispatch({
        userId: referrerUser._id,
        eventType: 'REFERRAL_REWARD',
        deduplicationKey: `REF_REWARD_REFERRER:${referral._id}`,
        title: 'Referral Reward Credited! 🎁',
        message: `Your friend ${refereeUser?.name || 'Student'} completed their first exam! You earned +${AUTOMATION_CONFIG.referrals.referrerBonusXp} XP and ₦${AUTOMATION_CONFIG.referrals.referrerBonusNgn} wallet bonus.`,
        channels: ['in_app', 'email'],
      });
    }

    if (refereeUser) {
      // Award Referee Welcome XP Bonus
      await XPService.awardXP({
        userId: refereeUser._id,
        amount: AUTOMATION_CONFIG.referrals.refereeBonusXp,
        sourceType: 'referral_bonus',
        sourceId: referral._id.toString(),
        reason: `Welcome Referral Bonus from ${referrerUser?.name || 'Referrer'}! 🎁`,
      });

      await NotificationService.dispatch({
        userId: refereeUser._id,
        eventType: 'REFERRAL_REWARD',
        deduplicationKey: `REF_REWARD_REFEREE:${referral._id}`,
        title: 'Referral Bonus Unlocked! 🎁',
        message: `You earned +${AUTOMATION_CONFIG.referrals.refereeBonusXp} XP bonus for using referral code ${referral.referralCode}!`,
        channels: ['in_app'],
      });
    }

    eventBus.emitEvent(EVENTS.REFERRAL_QUALIFIED, {
      referralId: referral._id,
      referrerId: referral.referrer,
      refereeId: referral.referee,
    });

    return true;
  }

  /**
   * Retrieves user's referral link, code, and invited friends list
   */
  public static async getUserReferralStats(userId: string | mongoose.Types.ObjectId): Promise<any> {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const code = this.generateReferralCode(user);
    const referrals = await Referral.find({ referrer: userId })
      .populate('referee', 'name email createdAt')
      .sort({ createdAt: -1 });

    const totalReferrals = referrals.length;
    const qualifiedReferrals = referrals.filter((r) => r.rewardProcessed).length;
    const totalEarnedXp = qualifiedReferrals * AUTOMATION_CONFIG.referrals.referrerBonusXp;
    const totalEarnedNgn = qualifiedReferrals * AUTOMATION_CONFIG.referrals.referrerBonusNgn;

    return {
      referralCode: code,
      referralLink: `https://preplyx.com/register?ref=${code}`,
      totalReferrals,
      qualifiedReferrals,
      totalEarnedXp,
      totalEarnedNgn,
      referrals: referrals.map((r) => {
        const referee = r.referee as any;
        return {
          id: r._id,
          name: referee?.name || 'Student',
          email: referee?.email ? `${referee.email.substring(0, 3)}***@${referee.email.split('@')[1]}` : '',
          status: r.status,
          joinedDate: r.createdAt,
          rewardProcessed: r.rewardProcessed,
        };
      }),
    };
  }
}
