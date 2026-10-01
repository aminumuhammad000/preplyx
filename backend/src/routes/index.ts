import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController';
import authRoutes from './authRoutes';
import questionRoutes from './questionRoutes';
import examSessionRoutes from './examSessionRoutes';
import dataRoutes from './dataRoutes';
import examRoutes from './examRoutes';
import walletRoutes from './walletRoutes';
import leaderboardRoutes from './leaderboardRoutes';
import userRoutes from './userRoutes';
import achievementRoutes from './achievementRoutes';
import notificationRoutes from './notificationRoutes';
import adminRoutes from './adminRoutes';
import aiRoutes from './aiRoutes';

// Preplyx Automation Engine Routes
import dailyChallengeRoutes from './dailyChallengeRoutes';
import recommendationRoutes from './recommendationRoutes';
import streakRoutes from './streakRoutes';
import xpRoutes from './xpRoutes';
import competitionRoutes from './competitionRoutes';
import subscriptionRoutes from './subscriptionRoutes';
import referralRoutes from './referralRoutes';
import automationAdminRoutes from './automationAdminRoutes';

// Preplyx Mistake Intelligence, Target Onboarding & Quality Routes
import mistakeRoutes from './mistakeRoutes';
import onboardingRoutes from './onboardingRoutes';
import questionReportRoutes from './questionReportRoutes';

const router = Router();

// Health check route
router.get('/health', getHealthStatus);

// Core existing routes
router.use('/auth', authRoutes);
router.use('/data', dataRoutes);
router.use('/exams', examRoutes);
router.use('/questions', questionRoutes);
router.use('/sessions', examSessionRoutes);
router.use('/wallet', walletRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/user', userRoutes);
router.use('/achievements', achievementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

// Preplyx Differentiation Engine routes
router.use('/mistakes', mistakeRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/question-reports', questionReportRoutes);

// Automation Engine routes
router.use('/daily-challenge', dailyChallengeRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/streaks', streakRoutes);
router.use('/xp', xpRoutes);
router.use('/competitions', competitionRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/referrals', referralRoutes);
router.use('/admin/automation', automationAdminRoutes);

export default router;
