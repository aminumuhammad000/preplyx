import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Subscription from '../models/Subscription';
import { SubscriptionService } from '../services/subscriptionService';

/**
 * @desc    Get all available subscription plans
 * @route   GET /api/subscriptions/plans
 * @access  Public / Private
 */
export const getSubscriptionPlans = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await SubscriptionService.seedDefaultPlans();
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ priceNgn: 1 });
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's active subscription status
 * @route   GET /api/subscriptions/me
 * @access  Private
 */
export const getUserSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: { $in: ['active', 'expiring_soon', 'grace_period'] },
      endDate: { $gte: new Date() },
    }).populate('plan');

    res.json({
      hasActiveSubscription: !!subscription,
      subscription: subscription || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Subscribe to a plan with wallet balance
 * @route   POST /api/subscriptions/subscribe
 * @access  Private
 */
export const subscribeUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { planCode } = req.body;
    if (!planCode) {
      res.status(400).json({ message: 'planCode is required.' });
      return;
    }

    const subscription = await SubscriptionService.subscribeUserWithWallet(
      req.user._id,
      planCode
    );

    res.status(201).json({
      message: 'Subscription activated successfully!',
      subscription,
    });
  } catch (error: any) {
    res.status(400).json({ message: error?.message || 'Subscription failed.' });
  }
};
