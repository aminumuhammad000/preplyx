import mongoose from 'mongoose';
import SuspiciousActivity, { ISuspiciousActivity, SuspiciousActivityType, ActivitySeverity } from '../models/SuspiciousActivity';
import CompetitionParticipant from '../models/CompetitionParticipant';
import { AUTOMATION_CONFIG } from '../config/automationConfig';
import { eventBus, EVENTS } from '../events/eventBus';

export interface AntiCheatAnalysisResult {
  isFlagged: boolean;
  severity: ActivitySeverity;
  flagReasons: string[];
  metrics: {
    averageTimePerQuestion: number;
    suspiciouslyFastCount: number;
    totalTimeSpentSeconds: number;
    isImpossibleSpeed: boolean;
  };
}

export class AntiCheatService {
  /**
   * Analyzes an exam or competition submission for anomalous and suspicious cheating signals
   */
  public static analyzeSubmissionTiming(
    answers: { questionId: string; timeSpentSeconds?: number }[],
    totalTimeSpentSeconds: number,
    allocatedDurationMinutes: number
  ): AntiCheatAnalysisResult {
    const questionCount = answers.length;
    const avgTimePerQuestion = questionCount > 0 ? totalTimeSpentSeconds / questionCount : 0;

    let suspiciouslyFastCount = 0;
    answers.forEach((ans) => {
      if (ans.timeSpentSeconds !== undefined && ans.timeSpentSeconds < AUTOMATION_CONFIG.antiCheat.minimumSecondsPerQuestion) {
        suspiciouslyFastCount += 1;
      }
    });

    const allocatedTotalSeconds = allocatedDurationMinutes * 60;
    const isImpossibleSpeed =
      allocatedTotalSeconds > 0 &&
      totalTimeSpentSeconds < allocatedTotalSeconds * AUTOMATION_CONFIG.antiCheat.impossibleSpeedMultiplier &&
      questionCount >= 10;

    const flagReasons: string[] = [];
    let severity: ActivitySeverity = 'low';

    if (isImpossibleSpeed) {
      flagReasons.push(
        `Completed entire exam in ${totalTimeSpentSeconds}s (less than ${AUTOMATION_CONFIG.antiCheat.impossibleSpeedMultiplier * 100}% of allocated ${allocatedDurationMinutes} mins)`
      );
      severity = 'high';
    }

    if (questionCount > 0 && suspiciouslyFastCount / questionCount > 0.4) {
      flagReasons.push(
        `${suspiciouslyFastCount} out of ${questionCount} questions were answered in under ${AUTOMATION_CONFIG.antiCheat.minimumSecondsPerQuestion}s`
      );
      if (severity !== 'high') severity = 'medium';
    }

    if (avgTimePerQuestion < 1.5 && questionCount >= 10) {
      flagReasons.push(`Average time per question was impossibly fast (${avgTimePerQuestion.toFixed(1)}s/question)`);
      severity = 'high';
    }

    return {
      isFlagged: flagReasons.length > 0,
      severity,
      flagReasons,
      metrics: {
        averageTimePerQuestion: Math.round(avgTimePerQuestion * 10) / 10,
        suspiciouslyFastCount,
        totalTimeSpentSeconds,
        isImpossibleSpeed,
      },
    };
  }

  /**
   * Records a suspicious activity flag in the database for admin review
   */
  public static async flagActivity(params: {
    user?: string | mongoose.Types.ObjectId;
    type: SuspiciousActivityType;
    severity: ActivitySeverity;
    source: 'competition' | 'quiz' | 'auth' | 'referral' | 'api';
    referenceId?: string;
    details: Record<string, any>;
    clientIp?: string;
    userAgent?: string;
  }): Promise<ISuspiciousActivity> {
    const suspicious = await SuspiciousActivity.create({
      user: params.user,
      type: params.type,
      severity: params.severity,
      source: params.source,
      referenceId: params.referenceId,
      details: params.details,
      clientIp: params.clientIp,
      userAgent: params.userAgent,
      status: 'pending',
      actionTaken: 'none',
    });

    console.warn(`⚠️ [Anti-Cheat Flag] Suspicious activity flagged (${params.type}, ${params.severity}) for user ${params.user || 'Unknown'}:`, params.details);

    eventBus.emitEvent(EVENTS.SECURITY_ALERT, {
      activityId: suspicious._id,
      userId: params.user,
      type: params.type,
      severity: params.severity,
      source: params.source,
    });

    return suspicious;
  }
}
