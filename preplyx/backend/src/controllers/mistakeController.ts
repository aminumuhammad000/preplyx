import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { MistakeService } from '../services/mistakeService';

export const logMistake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const {
      exam,
      subject,
      topic,
      subtopic,
      questionId,
      questionText,
      options,
      selectedAnswer,
      correctAnswer,
      confidence,
      difficulty,
      timeSpentSeconds,
    } = req.body;

    if (!exam || !subject || !questionId || !questionText || !selectedAnswer || !correctAnswer) {
      res.status(400).json({ message: 'Missing required mistake fields' });
      return;
    }

    const mistake = await MistakeService.logMistake({
      userId: req.user._id,
      exam,
      subject,
      topic,
      subtopic,
      questionId,
      questionText,
      options: options || [],
      selectedAnswer,
      correctAnswer,
      confidence,
      difficulty,
      timeSpentSeconds,
    });

    res.status(201).json(mistake);
  } catch (error: any) {
    console.error('Error logging mistake:', error);
    res.status(500).json({ message: error.message || 'Error logging mistake' });
  }
};

export const getMistakes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { exam, subject, dueOnly, mastered, limit } = req.query;

    const result = await MistakeService.getUserMistakes(req.user._id, {
      exam: exam as string,
      subject: subject as string,
      dueOnly: dueOnly === 'true',
      mastered: mastered !== undefined ? mastered === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching mistakes:', error);
    res.status(500).json({ message: error.message || 'Error fetching mistakes' });
  }
};

export const explainWhyWrong = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      questionId,
      questionText,
      selectedAnswer,
      correctAnswer,
      subject = 'General',
      topic = 'General',
      options = [],
    } = req.body;

    if (!selectedAnswer) {
      res.status(400).json({ message: 'selectedAnswer is required' });
      return;
    }

    let qText = questionText;
    let qCorrect = correctAnswer;
    let qSubject = subject;
    let qTopic = topic;
    let qOptions = options;

    // Authoritative lookup if questionId is provided
    if (questionId) {
      const Question = (await import('../models/Question')).default;
      const foundQ = await Question.findById(questionId);
      if (foundQ) {
        qText = foundQ.text;
        qCorrect = foundQ.correctAnswer;
        qSubject = foundQ.subject || subject;
        qTopic = foundQ.topic || topic;
        qOptions = foundQ.options && foundQ.options.length > 0 ? foundQ.options : options;
      }
    }

    if (!qText || !qCorrect) {
      res.status(400).json({ message: 'questionId or (questionText and correctAnswer) is required' });
      return;
    }

    const explanation = await MistakeService.explainWhyWrong(
      qText,
      selectedAnswer,
      qCorrect,
      qSubject,
      qTopic,
      qOptions
    );

    res.json({
      success: true,
      data: {
        correctAnswer: explanation.correctAnswer,
        relevantConcept: explanation.relevantConcept,
        whySelectedIsIncorrect: explanation.whySelectedIsIncorrect,
        whySelectedIsTempting: explanation.whySelectedIsTempting,
        correctReasoning: explanation.correctReasoning,
        simpleExplanation: explanation.simpleExplanation,
        example: explanation.example,
        trapType: 'cognitive_distractor',
        similarPracticeQuestion: explanation.similarPracticeQuestion,
      },
    });
  } catch (error: any) {
    console.error('Error explaining why wrong:', error);
    res.status(500).json({ message: error.message || 'Error generating explanation' });
  }
};

export const reviewMistake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { isCorrect } = req.body;

    if (isCorrect === undefined) {
      res.status(400).json({ message: 'isCorrect boolean is required' });
      return;
    }

    const MistakeLog = (await import('../models/MistakeLog')).default;
    const mistake = await MistakeLog.findById(id);
    if (!mistake) {
      res.status(404).json({ message: 'Mistake record not found' });
      return;
    }

    // Ownership verification (SEC: Prevent IDOR)
    if (mistake.user.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'Forbidden: You do not own this mistake record' });
      return;
    }

    const updated = await MistakeService.processReviewAttempt(id, isCorrect);
    res.json(updated);
  } catch (error: any) {
    console.error('Error reviewing mistake:', error);
    res.status(500).json({ message: error.message || 'Error updating review' });
  }
};
