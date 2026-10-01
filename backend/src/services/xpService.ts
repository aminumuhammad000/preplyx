import mongoose from 'mongoose';
import User from '../models/User';
import XPTransaction, { XPSourceType } from '../models/XPTransaction';
import { AUTOMATION_CONFIG } from '../config/automationConfig';
import { eventBus, EVENTS } from '../events/eventBus';

export interface AwardXPParams {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  sourceType: XPSourceType;
  sourceId?: string;
  reason: string;
  metadata?: Record<string, any>;
}

export class XPService {
  /**
   * Atomically awards XP to a user, updates their balance, and creates an audit transaction.
   */
  public static async awardXP(params: AwardXPParams): Promise<{
    newBalance: number;
    amountAwarded: number;
    level: number;
  }> {
    const { userId, amount, sourceType, sourceId, reason, metadata } = params;

    if (amount <= 0) {
      const user = await User.findById(userId);
      const currentXp = user?.xp || 0;
      return { newBalance: currentXp, amountAwarded: 0, level: Math.floor(currentXp / 500) + 1 };
    }

    // Atomically find and update user's XP
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const balanceBefore = user.xp || 0;
    const balanceAfter = balanceBefore + amount;

    user.xp = balanceAfter;
    await user.save();

    // Create immutable audit record
    await XPTransaction.create({
      user: user._id,
      amount,
      balanceBefore,
      balanceAfter,
      sourceType,
      sourceId,
      reason,
      metadata: metadata || {},
    });

    const level = Math.floor(balanceAfter / 500) + 1;

    console.log(`[XP Engine] Awarded +${amount} XP to ${user.name} (${user.email}). New Balance: ${balanceAfter} XP (Level ${level})`);

    return {
      newBalance: balanceAfter,
      amountAwarded: amount,
      level,
    };
  }

  /**
   * Retrieves XP transaction history for a user
   */
  public static async getUserXPHistory(
    userId: string | mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: any[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      XPTransaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      XPTransaction.countDocuments({ user: userId }),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Calculate standard XP rewards based on configured rules
   */
  public static getRuleXP(ruleName: keyof typeof AUTOMATION_CONFIG.xp): number {
    return AUTOMATION_CONFIG.xp[ruleName] || 0;
  }
}
