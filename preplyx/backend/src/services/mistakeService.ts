import mongoose from 'mongoose';
import MistakeLog, { IMistakeLog } from '../models/MistakeLog';
import Question, { IQuestion } from '../models/Question';
import { generateAgentRouterCompletion } from './agentRouterService';

export interface LogMistakeInput {
  userId: string | mongoose.Types.ObjectId;
  exam: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  questionId: string;
  questionText: string;
  options: string[];
  selectedAnswer: string;
  correctAnswer: string;
  confidence?: 'very_sure' | 'somewhat_sure' | 'guessing' | 'high' | 'medium' | 'low' | string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeSpentSeconds?: number;
}

export interface WhyWrongResponse {
  correctAnswer: string;
  relevantConcept: string;
  whySelectedIsIncorrect: string;
  whySelectedIsTempting: string;
  correctReasoning: string;
  simpleExplanation: string;
  example: string;
  similarPracticeQuestion: {
    text: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
}

export class MistakeService {
  /**
   * Log or update a student mistake
   */
  public static async logMistake(input: LogMistakeInput): Promise<IMistakeLog> {
    const {
      userId,
      exam,
      subject,
      topic = 'General',
      subtopic = '',
      questionId,
      questionText,
      options,
      selectedAnswer,
      correctAnswer,
      confidence = 'somewhat_sure',
      difficulty = 'medium',
      timeSpentSeconds = 0,
    } = input;

    let normalizedConfidence: 'very_sure' | 'somewhat_sure' | 'guessing' = 'somewhat_sure';
    if (confidence === 'high' || confidence === 'very_sure') normalizedConfidence = 'very_sure';
    else if (confidence === 'low' || confidence === 'guessing') normalizedConfidence = 'guessing';
    else normalizedConfidence = 'somewhat_sure';

    // Check if mistake already logged for this user & question
    let mistake = await MistakeLog.findOne({
      user: userId,
      questionId,
    });

    if (mistake) {
      mistake.attemptsCount += 1;
      mistake.selectedAnswer = selectedAnswer;
      mistake.confidence = normalizedConfidence;
      mistake.timeSpentSeconds = timeSpentSeconds;
      mistake.lastAttemptDate = new Date();
      mistake.mastered = false;
      // Reset review stage back to 0 for repeated mistake
      mistake.reviewStage = 0;
      mistake.nextReviewDate = new Date(); // Due today
      await mistake.save();
      return mistake;
    }

    // Determine initial cognitive trap and concept summary
    const cognitiveAnalysis = this.analyzeCognitiveTrap(
      subject,
      topic,
      selectedAnswer,
      correctAnswer,
      questionText
    );

    const now = new Date();
    mistake = new MistakeLog({
      user: userId,
      exam,
      subject,
      topic,
      subtopic,
      questionId,
      questionText,
      options,
      selectedAnswer,
      correctAnswer,
      confidence: normalizedConfidence,
      cognitiveTrap: cognitiveAnalysis.trap,
      conceptSummary: cognitiveAnalysis.concept,
      difficulty,
      timeSpentSeconds,
      attemptsCount: 1,
      reviewStage: 0,
      nextReviewDate: now, // Due immediately
      mastered: false,
      lastAttemptDate: now,
    });

    await mistake.save();
    return mistake;
  }

  /**
   * Retrieve user mistakes with flexible filtering
   */
  public static async getUserMistakes(
    userId: string | mongoose.Types.ObjectId,
    options: {
      exam?: string;
      subject?: string;
      dueOnly?: boolean;
      mastered?: boolean;
      limit?: number;
    } = {}
  ): Promise<{ mistakes: IMistakeLog[]; totalDue: number; totalUnmastered: number }> {
    const query: any = { user: userId };

    if (options.exam && options.exam !== 'all') {
      query.exam = options.exam;
    }
    if (options.subject && options.subject !== 'all') {
      query.subject = options.subject;
    }
    if (options.mastered !== undefined) {
      query.mastered = options.mastered;
    }

    const now = new Date();
    if (options.dueOnly) {
      query.nextReviewDate = { $lte: now };
      query.mastered = false;
    }

    const mistakes = await MistakeLog.find(query)
      .sort({ nextReviewDate: 1, attemptsCount: -1 })
      .limit(options.limit || 50);

    const totalDue = await MistakeLog.countDocuments({
      user: userId,
      mastered: false,
      nextReviewDate: { $lte: now },
    });

    const totalUnmastered = await MistakeLog.countDocuments({
      user: userId,
      mastered: false,
    });

    return { mistakes, totalDue, totalUnmastered };
  }

  /**
   * Process a spaced review retest result
   */
  public static async processReviewAttempt(
    mistakeId: string,
    isCorrect: boolean
  ): Promise<IMistakeLog | null> {
    const mistake = await MistakeLog.findById(mistakeId);
    if (!mistake) return null;

    const stages = [0, 1, 3, 7, 14];
    const currentIndex = stages.indexOf(mistake.reviewStage);

    if (isCorrect) {
      if (currentIndex >= stages.length - 1 || mistake.reviewStage >= 14) {
        // Mastered after passing 14-day check!
        mistake.mastered = true;
        mistake.reviewStage = 14;
      } else {
        const nextStage = stages[currentIndex + 1] || 14;
        mistake.reviewStage = nextStage;
        // Schedule next review date X days from now
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + nextStage);
        mistake.nextReviewDate = nextDate;
      }
    } else {
      // Failed retest -> reset to Day 1
      mistake.reviewStage = 1;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 1);
      mistake.nextReviewDate = nextDate;
      mistake.mastered = false;
      mistake.attemptsCount += 1;
    }

    mistake.lastAttemptDate = new Date();
    await mistake.save();
    return mistake;
  }

  /**
   * In-depth "Why was my answer wrong?" contextual AI analysis
   */
  public static async explainWhyWrong(
    questionText: string,
    selectedAnswer: string,
    correctAnswer: string,
    subject: string,
    topic: string,
    options: string[] = []
  ): Promise<WhyWrongResponse> {
    const prompt = `A Nigerian secondary student preparing for ${subject} examination made a mistake on this question.
Question: "${questionText}"
All Options: ${options.join(' | ')}
Student Selected (Incorrect): "${selectedAnswer}"
Correct Answer: "${correctAnswer}"
Subject: ${subject}
Topic: ${topic}

Analyze the student's mistake and return ONLY valid JSON matching this schema:
{
  "correctAnswer": "${correctAnswer}",
  "relevantConcept": "The core rule, law, or definition in 1-2 sentences",
  "whySelectedIsIncorrect": "Direct explanation of what is false or flawed about option '${selectedAnswer}'",
  "whySelectedIsTempting": "Why a student might easily pick '${selectedAnswer}' (e.g., misread formula, common trap, partial calculation)",
  "correctReasoning": "Step-by-step correct derivation or logic",
  "simpleExplanation": "Plain English explanation a high-school student easily understands",
  "example": "A quick illustrative parallel example",
  "similarPracticeQuestion": {
    "text": "A fresh practice question testing the exact same concept",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact matching string from options",
    "explanation": "Clear explanation of the solution"
  }
}`;

    try {
      const aiResponse = await generateAgentRouterCompletion(prompt, {
        subject,
        questionText,
        options,
      });

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.relevantConcept && parsed.whySelectedIsIncorrect) {
          return parsed as WhyWrongResponse;
        }
      }
    } catch (err) {
      console.warn('[MistakeService] Live AI explanation fallback used:', err);
    }

    // High-quality deterministic academic fallback
    return this.buildDeterministicExplanation(
      questionText,
      selectedAnswer,
      correctAnswer,
      subject,
      topic,
      options
    );
  }

  /**
   * Deterministic explanation builder when AI is offline or rate limited
   */
  private static buildDeterministicExplanation(
    questionText: string,
    selectedAnswer: string,
    correctAnswer: string,
    subject: string,
    topic: string,
    options: string[]
  ): WhyWrongResponse {
    return {
      correctAnswer,
      relevantConcept: `In ${subject} (${topic}), problems of this nature rely on standard definitions, principles, and direct relationships rather than common distractors.`,
      whySelectedIsIncorrect: `You selected "${selectedAnswer}". This option is incorrect because it does not satisfy the foundational criteria or standard mathematical/conceptual conditions of ${topic}.`,
      whySelectedIsTempting: `"${selectedAnswer}" is a classic examination distractor designed to catch candidates who apply an incomplete formula, invert a ratio, or overlook boundary conditions.`,
      correctReasoning: `1. Identify the given parameters in "${questionText}".\n2. Apply the fundamental rule of ${topic}.\n3. Conclude that "${correctAnswer}" is the only option mathematically and conceptually sound.`,
      simpleExplanation: `Always check whether the units, signs, and definitions match. In this case, "${correctAnswer}" directly satisfies the question requirement.`,
      example: `For example, in similar ${subject} questions, verify each term before finalizing your answer.`,
      similarPracticeQuestion: {
        text: `Under standard examination conditions in ${subject} (${topic}), which parameter correctly reflects the core rule?`,
        options: [
          correctAnswer,
          selectedAnswer,
          `Alternative distractor 1`,
          `Alternative distractor 2`,
        ].sort(() => Math.random() - 0.5),
        correctAnswer,
        explanation: `The solution directly follows the established principle of ${topic} in ${subject}.`,
      },
    };
  }

  /**
   * Helper to identify cognitive trap
   */
  private static analyzeCognitiveTrap(
    subject: string,
    topic: string,
    selectedAnswer: string,
    correctAnswer: string,
    questionText: string
  ): { trap: string; concept: string } {
    const subjLower = subject.toLowerCase();
    if (subjLower.includes('math') || subjLower.includes('physic')) {
      return {
        trap: `Likely applied an incomplete formula, sign error, or inverted the proportionality between variables.`,
        concept: `Verify equations and units step-by-step before selecting an option in ${topic}.`,
      };
    }
    if (subjLower.includes('chem')) {
      return {
        trap: `Confused similar compound nomenclature, valence states, or reaction conditions.`,
        concept: `Review IUPAC nomenclature and standard states for ${topic}.`,
      };
    }
    if (subjLower.includes('english')) {
      return {
        trap: `Fell for an attractive false synonym or misidentified the grammatical function of the clause.`,
        concept: `Analyze grammatical structure and contextual tone rather than isolated word similarity.`,
      };
    }
    return {
      trap: `Selected a distractor that resembles the correct concept but omits a critical condition.`,
      concept: `Ensure all parts of the condition in "${questionText}" are satisfied by the chosen option.`,
    };
  }
}
