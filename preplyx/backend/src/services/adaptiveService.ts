import mongoose from 'mongoose';
import AdaptiveProfile, { IAdaptiveProfile } from '../models/AdaptiveProfile';
import Question, { IQuestion } from '../models/Question';
import { AUTOMATION_CONFIG } from '../config/automationConfig';

export class AdaptiveService {
  /**
   * Updates student's adaptive difficulty profile based on latest session result
   */
  public static async updateAdaptiveDifficulty(
    userId: string | mongoose.Types.ObjectId,
    exam: string,
    subject: string,
    percentage: number
  ): Promise<'easy' | 'medium' | 'hard'> {
    let profile = await AdaptiveProfile.findOne({ user: userId, exam });

    if (!profile) {
      profile = new AdaptiveProfile({
        user: userId,
        exam,
        globalDifficulty: 'medium',
        subjectLevels: [],
      });
    }

    let subjectLevel = profile.subjectLevels.find((sl) => sl.subject === subject);

    if (!subjectLevel) {
      subjectLevel = {
        subject,
        currentDifficulty: 'medium',
        consecutiveSuccessCount: 0,
        consecutiveFailureCount: 0,
        recentAccuracies: [],
        lastAdjustedAt: new Date(),
      };
      profile.subjectLevels.push(subjectLevel);
    }

    // Append to rolling window (last 5 sessions)
    subjectLevel.recentAccuracies.push(percentage);
    if (subjectLevel.recentAccuracies.length > 5) {
      subjectLevel.recentAccuracies = subjectLevel.recentAccuracies.slice(-5);
    }

    // Rolling average
    const avgRecent =
      subjectLevel.recentAccuracies.reduce((a, b) => a + b, 0) /
      subjectLevel.recentAccuracies.length;

    const previousDifficulty = subjectLevel.currentDifficulty;

    // Check upgrade threshold: avgRecent >= 80% with at least 2 consecutive strong scores
    if (percentage >= AUTOMATION_CONFIG.performance.adaptiveThresholdHigh) {
      subjectLevel.consecutiveSuccessCount += 1;
      subjectLevel.consecutiveFailureCount = 0;

      if (subjectLevel.consecutiveSuccessCount >= 2 || avgRecent >= 80) {
        if (subjectLevel.currentDifficulty === 'easy') {
          subjectLevel.currentDifficulty = 'medium';
          subjectLevel.consecutiveSuccessCount = 0;
        } else if (subjectLevel.currentDifficulty === 'medium') {
          subjectLevel.currentDifficulty = 'hard';
          subjectLevel.consecutiveSuccessCount = 0;
        }
      }
    }
    // Check downgrade threshold: avgRecent < 45% with at least 2 consecutive low scores
    else if (percentage < AUTOMATION_CONFIG.performance.adaptiveThresholdLow) {
      subjectLevel.consecutiveFailureCount += 1;
      subjectLevel.consecutiveSuccessCount = 0;

      if (subjectLevel.consecutiveFailureCount >= 2 || avgRecent < 45) {
        if (subjectLevel.currentDifficulty === 'hard') {
          subjectLevel.currentDifficulty = 'medium';
          subjectLevel.consecutiveFailureCount = 0;
        } else if (subjectLevel.currentDifficulty === 'medium') {
          subjectLevel.currentDifficulty = 'easy';
          subjectLevel.consecutiveFailureCount = 0;
        }
      }
    } else {
      // Moderate score (45-79%): maintain difficulty and reset counters
      subjectLevel.consecutiveSuccessCount = 0;
      subjectLevel.consecutiveFailureCount = 0;
    }

    if (previousDifficulty !== subjectLevel.currentDifficulty) {
      subjectLevel.lastAdjustedAt = new Date();
      console.log(`[Adaptive Engine] Adjusted ${subject} difficulty for user ${userId} from ${previousDifficulty} to ${subjectLevel.currentDifficulty}`);
    }

    await profile.save();
    return subjectLevel.currentDifficulty;
  }

  /**
   * Retrieves recommended question difficulty for user & subject
   */
  public static async getStudentTargetDifficulty(
    userId: string | mongoose.Types.ObjectId,
    exam: string,
    subject: string
  ): Promise<'easy' | 'medium' | 'hard'> {
    const profile = await AdaptiveProfile.findOne({ user: userId, exam });
    const subjectLevel = profile?.subjectLevels.find((sl) => sl.subject === subject);
    return subjectLevel?.currentDifficulty || 'medium';
  }

  /**
   * Selects an adaptively balanced question set:
   * e.g. For 'hard': 60% hard, 30% medium, 10% easy
   *      For 'medium': 20% easy, 60% medium, 20% hard
   *      For 'easy': 60% easy, 30% medium, 10% hard
   */
  public static async selectAdaptiveQuestions(
    exam: string,
    subject: string,
    targetDifficulty: 'easy' | 'medium' | 'hard',
    totalCount: number = 15,
    topic?: string
  ): Promise<IQuestion[]> {
    const baseQuery: any = {
      exam,
      subject,
      status: 'published',
    };
    if (topic && topic !== 'All') {
      baseQuery.topic = topic;
    }

    let easyCount = Math.round(totalCount * 0.2);
    let medCount = Math.round(totalCount * 0.6);
    let hardCount = totalCount - easyCount - medCount;

    if (targetDifficulty === 'easy') {
      easyCount = Math.round(totalCount * 0.6);
      medCount = Math.round(totalCount * 0.3);
      hardCount = totalCount - easyCount - medCount;
    } else if (targetDifficulty === 'hard') {
      hardCount = Math.round(totalCount * 0.6);
      medCount = Math.round(totalCount * 0.3);
      easyCount = totalCount - hardCount - medCount;
    }

    const [easyQuestions, medQuestions, hardQuestions] = await Promise.all([
      Question.aggregate([
        { $match: { ...baseQuery, difficulty: 'easy' } },
        { $sample: { size: easyCount } },
      ]),
      Question.aggregate([
        { $match: { ...baseQuery, difficulty: 'medium' } },
        { $sample: { size: medCount } },
      ]),
      Question.aggregate([
        { $match: { ...baseQuery, difficulty: 'hard' } },
        { $sample: { size: hardCount } },
      ]),
    ]);

    let combined = [...easyQuestions, ...medQuestions, ...hardQuestions];

    // If specific difficulties lacked enough questions, fill remainder with general pool
    if (combined.length < totalCount) {
      const existingIds = combined.map((q) => q._id);
      const remainingNeeded = totalCount - combined.length;
      const fillers = await Question.aggregate([
        { $match: { ...baseQuery, _id: { $nin: existingIds } } },
        { $sample: { size: remainingNeeded } },
      ]);
      combined = [...combined, ...fillers];
    }

    // Shuffle final question order
    return combined.sort(() => Math.random() - 0.5);
  }
}
