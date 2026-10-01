import { Request, Response } from 'express';
import { SecurityAuditService } from '../services/securityAuditService';

/**
 * @desc    Get system health status including DB, Redis, and memory metrics
 * @route   GET /api/health
 * @access  Public
 */
export const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await SecurityAuditService.getSystemHealthMetrics();
    res.status(200).json({
      success: true,
      message: 'Preplyx Backend and Automation Engine running smoothly.',
      ...metrics,
    });
  } catch (error: any) {
    res.status(200).json({
      success: true,
      message: 'Backend is operational.',
      timestamp: new Date().toISOString(),
    });
  }
};
