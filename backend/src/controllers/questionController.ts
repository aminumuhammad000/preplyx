import { Request, Response, NextFunction } from 'express';
import Question from '../models/Question';

/**
 * @desc    Get questions based on query (exam, subject)
 * @route   GET /api/questions
 * @access  Private
 */
export const getQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { exam, subject, year, limit = 50 } = req.query;

    const query: any = {};
    if (exam) query.exam = { $regex: new RegExp(`^${String(exam).trim()}$`, 'i') };
    if (subject) query.subject = { $regex: new RegExp(`^${String(subject).trim()}$`, 'i') };
    if (year && year !== 'All') query.year = String(year).trim();

    // Fetch random questions with full CBT fields
    let questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: Number(limit) } },
      {
        $project: {
          _id: 1,
          text: 1,
          options: 1,
          exam: 1,
          subject: 1,
          topic: 1,
          subtopic: 1,
          difficulty: 1,
          year: 1,
          source: 1,
          correctAnswer: 1,
          explanation: 1,
          cognitiveTrap: 1,
          conceptSummary: 1,
        },
      },
    ]);

    // If query with specific year produced 0 results, fall back to matching exam + subject generally
    if ((!questions || questions.length === 0) && year && year !== 'All') {
      const fallbackQuery: any = {};
      if (exam) fallbackQuery.exam = { $regex: new RegExp(`^${String(exam).trim()}$`, 'i') };
      if (subject) fallbackQuery.subject = { $regex: new RegExp(`^${String(subject).trim()}$`, 'i') };

      questions = await Question.aggregate([
        { $match: fallbackQuery },
        { $sample: { size: Number(limit) } },
        {
          $project: {
            _id: 1,
            text: 1,
            options: 1,
            exam: 1,
            subject: 1,
            topic: 1,
            subtopic: 1,
            difficulty: 1,
            year: 1,
            source: 1,
            correctAnswer: 1,
            explanation: 1,
            cognitiveTrap: 1,
            conceptSummary: 1,
          },
        },
      ]);
    }

    res.json(questions || []);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new question
 * @route   POST /api/questions
 * @access  Private/Admin (Assuming private for now, you can restrict to admin later)
 */
export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { exam, subject, year, text, options, correctAnswer, explanation } = req.body;

    const question = new Question({
      exam,
      subject,
      year: year || '2024',
      text,
      options,
      correctAnswer,
      explanation,
    });

    const createdQuestion = await question.save();
    res.status(201).json(createdQuestion);
  } catch (error) {
    next(error);
  }
};
