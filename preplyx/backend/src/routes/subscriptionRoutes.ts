import { Router } from 'express';
import { protect, optionalProtect } from '../middlewares/authMiddleware';
import {
  getSubscriptionPlans,
  getUserSubscription,
  subscribeUser,
} from '../controllers/subscriptionController';

const router = Router();

router.get('/plans', optionalProtect, getSubscriptionPlans);
router.get('/me', protect, getUserSubscription);
router.post('/subscribe', protect, subscribeUser);

export default router;
