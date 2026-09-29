import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion extends Document {
  exam: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  year?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'published' | 'draft' | 'archived';
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  cognitiveTrap?: string;
  conceptSummary?: string;
  source?: 'official_past_question' | 'verified_curriculum' | 'ai_practice';
  isVerified?: boolean;
  qualityFlags?: string[];
  duplicateOf?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema(
  {
    exam: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    topic: {
      type: String,
      default: 'General',
      trim: true,
      index: true,
    },
    subtopic: {
      type: String,
      default: '',
      trim: true,
    },
    year: {
      type: String,
      default: '2024',
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'published',
      index: true,
    },
    source: {
      type: String,
      enum: ['official_past_question', 'verified_curriculum', 'ai_practice'],
      default: 'official_past_question',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    cognitiveTrap: {
      type: String,
      default: '',
    },
    conceptSummary: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      required: true,
    },
    options: [
      {
        type: String,
        required: true,
      },
    ],
    correctAnswer: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
    },
    qualityFlags: [
      {
        type: String,
      },
    ],
    duplicateOf: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient quiz generation, adaptive selection, and question retrieval
questionSchema.index({ exam: 1, subject: 1, topic: 1, difficulty: 1, status: 1 });
questionSchema.index({ exam: 1, subject: 1, year: 1, status: 1 });

const Question = mongoose.model<IQuestion>('Question', questionSchema);

export default Question;
