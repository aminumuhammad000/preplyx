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
    if (exam) query.exam = exam;
    if (subject) query.subject = subject;
    if (year && year !== 'All') query.year = year;

    // Use aggregation to fetch random questions with strict projection (no answer leakage)
    const questions = await Question.aggregate([
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
        },
      },
    ]);

    res.json(questions);
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
