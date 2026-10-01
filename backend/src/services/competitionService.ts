import mongoose from 'mongoose';
import Competition, { ICompetition, CompetitionStatus } from '../models/Competition';
import CompetitionParticipant, { ICompetitionParticipant } from '../models/CompetitionParticipant';
import CompetitionSubmission from '../models/CompetitionSubmission';
import Question from '../models/Question';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import { AntiCheatService } from './antiCheatService';
import { XPService } from './xpService';
import { StreakService } from './streakService';
import { eventBus, EVENTS } from '../events/eventBus';

export class CompetitionService {
  /**
   * Registers a student for a competition
   */
  public static async registerParticipant(
    competitionId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<ICompetitionParticipant> {
    const comp = await Competition.findById(competitionId);
    if (!comp) {
      throw new Error('Competition not found');
    }

    const now = new Date();
    if (!['scheduled', 'registration', 'active'].includes(comp.status)) {
      throw new Error(`Registration is not available. Competition status is ${comp.status}.`);
    }

    if (now > comp.endTime) {
      throw new Error('Competition has already concluded.');
    }

    // Check existing registration
    let participant = await CompetitionParticipant.findOne({
      competition: comp._id,
      user: userId,
    });

    if (participant) {
      return participant;
    }

    // If entry fee is required, deduct from wallet
    if (comp.entryFeeNgn > 0) {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet || wallet.balance < comp.entryFeeNgn) {
        throw new Error(`Insufficient wallet balance. Entry fee is ₦${comp.entryFeeNgn}. Please fund your wallet.`);
      }

      const prevBalance = wallet.balance;
      wallet.balance -= comp.entryFeeNgn;
      wallet.totalSpent += comp.entryFeeNgn;
      await wallet.save();

      await Transaction.create({
        user: userId,
        type: 'spending',
        amount: comp.entryFeeNgn,
        balanceBefore: prevBalance,
        balanceAfter: wallet.balance,
        status: 'completed',
        description: `Entry Fee for Competition: ${comp.title}`,
      });
    }

    participant = await CompetitionParticipant.create({
      competition: comp._id,
      user: userId,
      status: 'registered',
      score: 0,
      totalQuestions: comp.questions?.length || 0,
      percentage: 0,
      timeSpentSeconds: 0,
      isFlagged: false,
    });

    comp.currentParticipantsCount += 1;
    await comp.save();

    eventBus.emitEvent(EVENTS.COMPETITION_JOINED, {
      competitionId: comp._id,
      userId,
      title: comp.title,
    });

    return participant;
  }

  /**
   * Starts exam session for a participant (Server authoritative start time)
   */
  public static async startParticipantExam(
    competitionId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId
  ): Promise<{
    competition: any;
    questions: any[];
    serverStartTime: Date;
    durationMinutes: number;
  }> {
    const comp = await Competition.findById(competitionId).populate('questions');
    if (!comp) throw new Error('Competition not found');

    if (comp.status !== 'active') {
      throw new Error(`Competition is not currently active. Status: ${comp.status}`);
    }

    const participant = await CompetitionParticipant.findOne({
      competition: comp._id,
      user: userId,
    });

    if (!participant) {
      throw new Error('You must register for this competition first.');
    }

    if (participant.status === 'submitted') {
      throw new Error('You have already submitted your exam for this competition.');
    }

    const now = new Date();
    if (!participant.startedAt) {
      participant.startedAt = now;
      participant.status = 'in_progress';
      await participant.save();
    }

    // Strip correct answers from questions delivered to client
    const safeQuestions = (comp.questions as any[]).map((q) => ({
      _id: q._id,
      text: q.text,
      options: q.options,
      subject: q.subject,
      topic: q.topic,
    }));

    return {
      competition: {
        id: comp._id,
        title: comp.title,
        description: comp.description,
        exam: comp.exam,
        subjects: comp.subjects,
        durationMinutes: comp.durationMinutes,
      },
      questions: safeQuestions,
      serverStartTime: participant.startedAt,
      durationMinutes: comp.durationMinutes,
    };
  }

  /**
   * Submits exam answers with server-authoritative scoring and anti-cheat validation
   */
  public static async submitParticipantExam(
    competitionId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    answers: { questionId: string; userAnswer: string; timeSpentSeconds?: number }[],
    clientIp?: string,
    userAgent?: string
  ): Promise<{
    score: number;
    total: number;
    percentage: number;
    timeSpentSeconds: number;
    isFlagged: boolean;
  }> {
    const comp = await Competition.findById(competitionId).populate('questions');
    if (!comp) throw new Error('Competition not found');

    const participant = await CompetitionParticipant.findOne({
      competition: comp._id,
      user: userId,
    });

    if (!participant) throw new Error('Participant record not found');
    if (participant.status === 'submitted') {
      throw new Error('Exam has already been submitted.');
    }

    const serverSubmitTime = new Date();
    const serverStartTime = participant.startedAt || new Date(Date.now() - comp.durationMinutes * 60000);
    const totalTimeSpentSeconds = Math.round((serverSubmitTime.getTime() - serverStartTime.getTime()) / 1000);

    // Score answers against database questions
    const questionsList = (comp.questions as any[]) || [];
    const qMap = new Map(questionsList.map((q) => [q._id.toString(), q]));

    let correctCount = 0;
    const detailedAnswers = answers.map((ans) => {
      const q = qMap.get(ans.questionId);
      const isCorrect = q ? q.correctAnswer.trim().toLowerCase() === ans.userAnswer.trim().toLowerCase() : false;
      if (isCorrect) correctCount += 1;

      return {
        questionId: ans.questionId,
        userAnswer: ans.userAnswer,
        correctAnswer: q?.correctAnswer || '',
        isCorrect,
        timeSpentSeconds: ans.timeSpentSeconds || 0,
      };
    });

    const totalQuestions = questionsList.length || answers.length || 1;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // Run Anti-Cheat heuristics
    const antiCheatResult = AntiCheatService.analyzeSubmissionTiming(
      answers,
      totalTimeSpentSeconds,
      comp.durationMinutes
    );

    if (antiCheatResult.isFlagged) {
      await AntiCheatService.flagActivity({
        user: userId,
        type: antiCheatResult.metrics.isImpossibleSpeed ? 'impossible_speed' : 'rapid_answering',
        severity: antiCheatResult.severity,
        source: 'competition',
        referenceId: comp._id.toString(),
        details: {
          competitionTitle: comp.title,
          flagReasons: antiCheatResult.flagReasons,
          totalTimeSpentSeconds,
          averageTimePerQuestion: antiCheatResult.metrics.averageTimePerQuestion,
          score: correctCount,
          totalQuestions,
        },
        clientIp,
        userAgent,
      });
    }

    // Save submission
    await CompetitionSubmission.create({
      competition: comp._id,
      participant: participant._id,
      user: userId,
      answers: detailedAnswers,
      score: correctCount,
      totalQuestions,
      percentage,
      totalTimeSpentSeconds,
      clientIp,
      userAgent,
      serverStartTime,
      serverSubmitTime,
      antiCheatMetrics: antiCheatResult.metrics,
    });

    // Update participant
    participant.score = correctCount;
    participant.totalQuestions = totalQuestions;
    participant.percentage = percentage;
    participant.timeSpentSeconds = totalTimeSpentSeconds;
    participant.submittedAt = serverSubmitTime;
    participant.status = 'submitted';
    participant.isFlagged = antiCheatResult.isFlagged;
    participant.flagReasons = antiCheatResult.flagReasons;
    await participant.save();

    comp.totalSubmissionsCount += 1;
    await comp.save();

    // Record streak activity
    await StreakService.recordActivity(userId, 'competition', totalQuestions);

    eventBus.emitEvent(EVENTS.COMPETITION_COMPLETED, {
      competitionId: comp._id,
      userId,
      score: correctCount,
      percentage,
      timeSpentSeconds: totalTimeSpentSeconds,
      isFlagged: antiCheatResult.isFlagged,
    });

    return {
      score: correctCount,
      total: totalQuestions,
      percentage,
      timeSpentSeconds: totalTimeSpentSeconds,
      isFlagged: antiCheatResult.isFlagged,
    };
  }

  /**
   * Automated State Transition Runner:
   * Advances competitions through their lifecycle and calculates final rankings and prizes.
   */
  public static async processCompetitionStateTransitions(): Promise<void> {
    const now = new Date();

    // 1. Advance 'scheduled' -> 'registration'
    const toRegistration = await Competition.find({
      status: 'scheduled',
      registrationStartDate: { $lte: now },
    });
    for (const c of toRegistration) {
      c.status = 'registration';
      await c.save();
      console.log(`[Competition Engine] Started registration for: ${c.title}`);
    }

    // 2. Advance 'registration' -> 'active'
    const toActive = await Competition.find({
      status: { $in: ['scheduled', 'registration'] },
      startTime: { $lte: now },
      endTime: { $gt: now },
    });
    for (const c of toActive) {
      c.status = 'active';
      await c.save();
      console.log(`[Competition Engine] Activated competition: ${c.title}`);
    }

    // 3. Advance 'active' -> 'ended'
    const toEnded = await Competition.find({
      status: 'active',
      endTime: { $lte: now },
    });
    for (const c of toEnded) {
      c.status = 'ended';
      await c.save();
      console.log(`[Competition Engine] Ended competition: ${c.title}`);
    }

    // 4. Process 'ended' -> 'results' (Calculate deterministic ranking, prizes, and winner detection)
    const toResults = await Competition.find({
      status: 'ended',
    });

    for (const comp of toResults) {
      console.log(`[Competition Engine] Computing final rankings for: ${comp.title}`);

      // Sort all submitted participants: Score DESC, TimeSpent ASC, SubmittedAt ASC
      const participants = await CompetitionParticipant.find({
        competition: comp._id,
        status: 'submitted',
      }).sort({
        score: -1,
        timeSpentSeconds: 1,
        submittedAt: 1,
      });

      const prizeMap = new Map((comp.prizes || []).map((p) => [p.rank, p]));

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const rank = i + 1;
        p.rank = rank;

        const prize = prizeMap.get(rank);
        if (prize) {
          p.prizeAwarded = `${prize.title} (₦${prize.cashNgn || 0} + ${prize.xpBonus || 0} XP)`;

          // Award Cash to Wallet if cash prize exists
          if (prize.cashNgn && prize.cashNgn > 0) {
            let wallet = await Wallet.findOne({ user: p.user });
            if (!wallet) {
              wallet = await Wallet.create({ user: p.user, balance: 0, totalFunded: 0, totalSpent: 0, welcomeBonus: 0 });
            }
            const prev = wallet.balance;
            wallet.balance += prize.cashNgn;
            wallet.totalFunded += prize.cashNgn;
            await wallet.save();

            await Transaction.create({
              user: p.user,
              type: 'funding',
              amount: prize.cashNgn,
              balanceBefore: prev,
              balanceAfter: wallet.balance,
              status: 'completed',
              description: `Competition Prize (Rank #${rank}): ${comp.title}`,
            });
          }

          // Award XP
          const xpBonus = prize.xpBonus || (rank === 1 ? 500 : 200);
          p.xpAwarded = xpBonus;

          await XPService.awardXP({
            userId: p.user,
            amount: xpBonus,
            sourceType: 'competition_reward',
            sourceId: comp._id.toString(),
            reason: `Competition Rank #${rank} Prize (${comp.title}) 🏆`,
          });
        } else {
          // Standard participation XP
          p.xpAwarded = 50;
          await XPService.awardXP({
            userId: p.user,
            amount: 50,
            sourceType: 'competition_reward',
            sourceId: comp._id.toString(),
            reason: `Competition Participation (${comp.title})`,
          });
        }

        await p.save();
      }

      comp.status = 'results';
      comp.isResultsPublished = true;
      await comp.save();

      console.log(`[Competition Engine] Results published for ${comp.title}. Ranked ${participants.length} participants.`);
    }
  }

  /**
   * Retrieves official competition leaderboard
   */
  public static async getCompetitionLeaderboard(competitionId: string | mongoose.Types.ObjectId): Promise<any[]> {
    const participants = await CompetitionParticipant.find({
      competition: competitionId,
      status: 'submitted',
    })
      .sort({ rank: 1, score: -1, timeSpentSeconds: 1 })
      .populate('user', 'name email')
      .limit(50);

    return participants.map((p) => {
      const user = p.user as any;
      return {
        rank: p.rank || 0,
        userId: user?._id,
        name: user?.name || 'Preplyx Candidate',
        email: user?.email || '',
        score: p.score,
        totalQuestions: p.totalQuestions,
        percentage: p.percentage,
        timeSpentSeconds: p.timeSpentSeconds,
        isFlagged: p.isFlagged,
        prizeAwarded: p.prizeAwarded,
        xpAwarded: p.xpAwarded,
      };
    });
  }
}
