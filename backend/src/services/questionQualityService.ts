import Question, { IQuestion } from '../models/Question';

export interface QuestionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  potentialDuplicateOf?: {
    id: string;
    text: string;
    similarity: number;
  };
}

export class QuestionQualityService {
  /**
   * Normalizes question text for robust duplicate comparison (lowercasing, punctuation removal, whitespace trimming)
   */
  public static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculates Jaccard similarity index between two texts based on word token sets
   */
  public static calculateTokenSimilarity(text1: string, text2: string): number {
    const norm1 = this.normalizeText(text1);
    const norm2 = this.normalizeText(text2);

    if (norm1 === norm2) return 1.0;

    const words1 = new Set(norm1.split(' ').filter((w) => w.length > 2));
    const words2 = new Set(norm2.split(' ').filter((w) => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Validates question structure, options, answers, and checks for potential duplicates
   */
  public static async validateAndAuditQuestion(
    questionData: Partial<IQuestion>,
    excludeQuestionId?: string
  ): Promise<QuestionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Text validation
    if (!questionData.text || questionData.text.trim().length < 5) {
      errors.push('Question text must be at least 5 characters long.');
    }

    // 2. Options validation
    if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
      errors.push('Question must have at least 2 options.');
    } else {
      const cleanOptions = questionData.options.map((o) => (typeof o === 'string' ? o.trim() : ''));
      if (cleanOptions.some((o) => !o)) {
        errors.push('All options must be non-empty strings.');
      }
      const uniqueOptions = new Set(cleanOptions);
      if (uniqueOptions.size !== cleanOptions.length) {
        warnings.push('Duplicate option choices detected in option list.');
      }
    }

    // 3. Correct answer validation
    if (!questionData.correctAnswer || !questionData.correctAnswer.trim()) {
      errors.push('Correct answer is required.');
    } else if (questionData.options && Array.isArray(questionData.options)) {
      const cleanAnswer = questionData.correctAnswer.trim().toLowerCase();
      const optionMatches = questionData.options.some(
        (opt) => opt.trim().toLowerCase() === cleanAnswer
      );
      if (!optionMatches) {
        warnings.push(`Correct answer "${questionData.correctAnswer}" does not exactly match any of the provided options.`);
      }
    }

    // 4. Subject and Exam validation
    if (!questionData.subject || !questionData.subject.trim()) {
      errors.push('Subject is required.');
    }
    if (!questionData.exam || !questionData.exam.trim()) {
      errors.push('Exam type is required.');
    }

    // 5. Duplicate Detection against existing questions
    let potentialDuplicateOf: QuestionValidationResult['potentialDuplicateOf'];

    if (questionData.text && questionData.subject) {
      const existingCandidates = await Question.find({
        subject: questionData.subject,
        _id: excludeQuestionId ? { $ne: excludeQuestionId } : { $exists: true },
      })
        .select('text _id')
        .limit(200);

      for (const candidate of existingCandidates) {
        const sim = this.calculateTokenSimilarity(questionData.text, candidate.text);
        if (sim >= 0.85) {
          potentialDuplicateOf = {
            id: candidate._id.toString(),
            text: candidate.text,
            similarity: Math.round(sim * 100),
          };
          warnings.push(
            `Potential duplicate detected (${Math.round(sim * 100)}% match with existing question ID ${candidate._id})`
          );
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      potentialDuplicateOf,
    };
  }
}
