import { Router } from 'express';
import {
  getWallet,
  getTransactions,
  getVirtualAccount,
  createVirtualAccount,
  deductWallet,
  handleVtstackWebhook,
  verifyBankAccountController,
  listBanksController
} from '../controllers/walletController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Public Webhook route for VTStack real-time deposit notifications
router.post('/webhook', handleVtstackWebhook);

// Protected Wallet routes
router.get('/', protect, getWallet);
router.post('/deduct', protect, deductWallet);
router.get('/transactions', protect, getTransactions);
router.get('/virtual-account', protect, getVirtualAccount);
router.post('/virtual-account', protect, createVirtualAccount);
router.get('/banks', protect, listBanksController);
router.get('/verify-bank', protect, verifyBankAccountController);

export default router;
