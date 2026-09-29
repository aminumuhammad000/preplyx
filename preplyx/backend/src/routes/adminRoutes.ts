import { Router } from 'express';
import {
  getAdminWalletStats,
  getAdminTransactions,
  getAdminUsers,
  updateUserStatus,
  deleteAdminUser,
  getAdminExams,
  createAdminExam,
  updateAdminExam,
  deleteAdminExam,
  getAdminDashboard,
  getAdminAnalytics,
  getAdminSubjects,
  createAdminSubject,
  updateAdminSubject,
  deleteAdminSubject,
  getAdminQuestions,
  createAdminQuestion,
  bulkCreateAdminQuestions,
  updateAdminQuestion,
  deleteAdminQuestion,
  scanQuestionPaper,
  getAdminSimulations,
  getAdminWalletConfig,
  updateAdminWalletConfig,
  getAdminSettings,
  updateAdminSettings,
  testAdminEmailConfig,
  testAdminAiConfig,
  getAdminBroadcasts,
  sendBroadcastNotification,
  getAdminTickets,
  replyAdminTicket,
  creditUserWallet,
  adminLogin
} from '../controllers/adminController';
import { protect, adminOnly } from '../middlewares/authMiddleware';

const router = Router();

// Public Admin Login Route
router.post('/login', adminLogin);

// Protect all subsequent administrative routes with RBAC
router.use(protect, adminOnly);

// Dashboard & Analytics
router.get('/dashboard', getAdminDashboard);
router.get('/analytics', getAdminAnalytics);

// Wallet & Payments
router.get('/wallet/stats', getAdminWalletStats);
router.get('/wallet/transactions', getAdminTransactions);
router.get('/wallet/config', getAdminWalletConfig);
router.post('/wallet/config', updateAdminWalletConfig);
router.post('/wallet/credit', creditUserWallet);

// User Management
router.get('/users', getAdminUsers);
router.post('/users/credit', creditUserWallet);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteAdminUser);

// Exam Management
router.get('/exams', getAdminExams);
router.post('/exams', createAdminExam);
router.put('/exams/:id', updateAdminExam);
router.delete('/exams/:id', deleteAdminExam);

// Subject Management
router.get('/subjects', getAdminSubjects);
router.post('/subjects', createAdminSubject);
router.put('/subjects/:id', updateAdminSubject);
router.delete('/subjects/:id', deleteAdminSubject);

// Question Management — specific routes MUST come before /:id wildcard
router.get('/questions', getAdminQuestions);
router.post('/questions', createAdminQuestion);
router.post('/questions/bulk', bulkCreateAdminQuestions);
router.post('/questions/scan', scanQuestionPaper);
router.put('/questions/:id', updateAdminQuestion);
router.delete('/questions/:id', deleteAdminQuestion);

// Simulation Management
router.get('/simulations', getAdminSimulations);

// Settings Management
router.get('/settings', getAdminSettings);
router.post('/settings', updateAdminSettings);
router.post('/settings/test-email', testAdminEmailConfig);
router.post('/settings/test-ai', testAdminAiConfig);

// Notifications Management
router.get('/notifications', getAdminBroadcasts);
router.post('/notifications/broadcast', sendBroadcastNotification);

// Support Management
router.get('/support/tickets', getAdminTickets);
router.put('/support/tickets/:id', replyAdminTicket);

export default router;
