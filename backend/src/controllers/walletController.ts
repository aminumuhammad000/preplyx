import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import User from '../models/User';
import vtstackService from '../services/vtstackService';

/**
 * @desc    Get wallet balance and summary
 * @route   GET /api/wallet
 * @access  Private
 */
export const getWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let wallet = await Wallet.findOne({ user: req.user?._id });
    
    if (!wallet) {
      wallet = await Wallet.create({
        user: req.user?._id,
        balance: 500, // 500 welcome bonus
        totalFunded: 0,
        totalSpent: 0,
        welcomeBonus: 500
      });
    }

    res.json({
      balance: wallet.balance,
      totalFunded: wallet.totalFunded,
      totalSpent: wallet.totalSpent,
      welcomeBonus: wallet.welcomeBonus
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wallet data' });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transactions = await Transaction.find({ user: req.user?._id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(transactions || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};

/**
 * @desc    Atomic wallet deduction
 * @route   POST /api/wallet/deduct
 * @access  Private
 */
export const deductWallet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, description } = req.body;
    const deductAmount = Number(amount);

    if (!deductAmount || deductAmount <= 0) {
      res.status(400).json({ message: 'Valid deduction amount is required' });
      return;
    }

    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Atomic findOneAndUpdate with $gte balance check to prevent race conditions or negative balances
    const existingWallet = await Wallet.findOne({ user: userId });
    const balanceBefore = existingWallet ? existingWallet.balance : 0;

    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: userId, balance: { $gte: deductAmount } },
      { $inc: { balance: -deductAmount, totalSpent: deductAmount } },
      { new: true }
    );

    if (!updatedWallet) {
      res.status(400).json({
        message: 'Insufficient wallet balance',
        balance: balanceBefore
      });
      return;
    }

    const balanceAfter = updatedWallet.balance;

    await Transaction.create({
      user: userId,
      type: 'spending',
      amount: deductAmount,
      balanceBefore,
      balanceAfter,
      description: description || 'Result Unlock Fee',
      status: 'completed',
      reference: `TX-DEDUCT-${Date.now()}`
    });

    res.json({
      message: 'Wallet balance deducted successfully',
      balance: updatedWallet.balance,
      totalSpent: updatedWallet.totalSpent
    });
  } catch (error: any) {
    console.error('Error deducting wallet balance:', error);
    res.status(500).json({ message: error?.message || 'Error processing wallet deduction' });
  }
};

/**
 * @desc    Create VTStack virtual account (PalmPay)
 * @route   POST /api/wallet/virtual-account
 * @access  Private
 */
export const createVirtualAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || 'Preplyx';

    const virtualAccount = await vtstackService.createVirtualAccount({
      email: user.email,
      firstName,
      lastName,
      phone: user.phone,
      reference: `user_${user._id}`
    });

    let wallet = await Wallet.findOne({ user: req.user?._id });
    
    if (!wallet) {
      wallet = new Wallet({
        user: req.user?._id,
        balance: 0,
        totalFunded: 0,
        totalSpent: 0,
        welcomeBonus: 500,
        virtualAccount: {
          bankName: virtualAccount.bankName || 'PalmPay',
          accountName: virtualAccount.accountName,
          accountNumber: virtualAccount.accountNumber,
        },
      });
    } else {
      wallet.virtualAccount = {
        bankName: virtualAccount.bankName || 'PalmPay',
        accountName: virtualAccount.accountName,
        accountNumber: virtualAccount.accountNumber,
      };
    }

    await wallet.save();
    
    user.wallet = wallet._id;
    await user.save();

    res.json({
      bankName: virtualAccount.bankName || 'PalmPay',
      accountName: virtualAccount.accountName,
      accountNumber: virtualAccount.accountNumber,
      username: virtualAccount.username,
      hasVirtualAccount: true
    });
  } catch (error: any) {
    console.error('Error creating virtual account:', error);
    res.status(500).json({ message: error?.message || 'Error creating virtual account' });
  }
};

export const getVirtualAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let wallet = await Wallet.findOne({ user: req.user?._id });
    
    if (wallet && wallet.virtualAccount?.accountNumber) {
      res.json({
        bankName: wallet.virtualAccount.bankName,
        accountName: wallet.virtualAccount.accountName,
        accountNumber: wallet.virtualAccount.accountNumber,
        hasVirtualAccount: true
      });
      return;
    }

    // Auto-generate virtual account if user has none
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const nameParts = user.name.split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || 'Preplyx';

    try {
      const virtualAccount = await vtstackService.createVirtualAccount({
        email: user.email,
        firstName,
        lastName,
        phone: user.phone,
        reference: `user_${user._id}`
      });

      if (!wallet) {
        wallet = new Wallet({
          user: req.user?._id,
          balance: 0,
          totalFunded: 0,
          totalSpent: 0,
          welcomeBonus: 500,
          virtualAccount: {
            bankName: virtualAccount.bankName || 'PalmPay',
            accountName: virtualAccount.accountName,
            accountNumber: virtualAccount.accountNumber,
          },
        });
      } else {
        wallet.virtualAccount = {
          bankName: virtualAccount.bankName || 'PalmPay',
          accountName: virtualAccount.accountName,
          accountNumber: virtualAccount.accountNumber,
        };
      }

      await wallet.save();
      user.wallet = wallet._id;
      await user.save();

      res.json({
        bankName: virtualAccount.bankName || 'PalmPay',
        accountName: virtualAccount.accountName,
        accountNumber: virtualAccount.accountNumber,
        hasVirtualAccount: true
      });
    } catch (genErr) {
      console.error('Auto virtual account generation error:', genErr);
      res.json({
        bankName: '',
        accountName: '',
        accountNumber: '',
        hasVirtualAccount: false
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching virtual account details' });
  }
};

/**
 * @desc    VTStack Deposit Webhook Handler
 * @route   POST /api/wallet/webhook
 * @access  Public
 */
export const handleVtstackWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    console.log('VTStack Webhook received:', JSON.stringify(payload));

    const event = payload?.event || payload?.type;
    const data = payload?.data || payload;

    if (event && event !== 'transaction.deposit' && event !== 'deposit.success') {
      res.json({ success: true, message: 'Event ignored' });
      return;
    }

    const accountNumber = data?.accountNumber || data?.account_number;
    const amount = Number(data?.amount);
    const reference = data?.reference || data?.transaction_reference || `VT-DEP-${Date.now()}`;
    const customerEmail = data?.customer?.email || data?.email;

    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, message: 'Invalid deposit amount' });
      return;
    }

    // Check for duplicate transaction processing
    const existingTx = await Transaction.findOne({ reference });
    if (existingTx) {
      res.json({ success: true, message: 'Transaction already processed' });
      return;
    }

    // Locate target user wallet
    let wallet = null;
    if (accountNumber) {
      wallet = await Wallet.findOne({ 'virtualAccount.accountNumber': accountNumber });
    }
    if (!wallet && customerEmail) {
      const user = await User.findOne({ email: customerEmail });
      if (user) {
        wallet = await Wallet.findOne({ user: user._id });
      }
    }

    if (!wallet) {
      res.status(404).json({ success: false, message: 'Target wallet not found for deposit' });
      return;
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    // Atomic credit
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { balance: amount, totalFunded: amount } },
      { new: true }
    );

    // Record funding audit transaction
    await Transaction.create({
      user: wallet.user,
      type: 'funding',
      amount,
      balanceBefore,
      balanceAfter,
      description: 'Automated Bank Deposit (VTStack PalmPay)',
      status: 'completed',
      reference
    });

    res.json({
      success: true,
      message: 'Deposit credited successfully via VTStack',
      balance: updatedWallet?.balance
    });
  } catch (error: any) {
    console.error('VTStack Webhook Error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Server error handling webhook' });
  }
};

/**
 * @desc    Bank Verification (Name Enquiry)
 * @route   GET /api/wallet/verify-bank
 * @access  Private
 */
export const verifyBankAccountController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bankCode, accountNumber } = req.query;
    if (!bankCode || !accountNumber) {
      res.status(400).json({ success: false, message: 'bankCode and accountNumber are required' });
      return;
    }
    const result = await vtstackService.verifyBankAccount(String(bankCode), String(accountNumber));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Bank resolution failed' });
  }
};

/**
 * @desc    List Supported Banks
 * @route   GET /api/wallet/banks
 * @access  Private
 */
export const listBanksController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await vtstackService.listBanks();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Failed to list banks' });
  }
};
