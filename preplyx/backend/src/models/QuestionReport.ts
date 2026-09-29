import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionReport extends Document {
  user: mongoose.Types.ObjectId;
  questionId: string;
  questionText: string;
  exam: string;
  subject: string;
  reportType:
    | 'incorrect_answer'
    | 'wrong_answer'
    | 'typo'
    | 'bad_explanation'
    | 'technical_issue'
    | 'image_missing'
    | 'ambiguous_question'
    | 'missing_information'
    | 'other';
  userNotes: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionReportSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    exam: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    reportType: {
      type: String,
      enum: [
        'incorrect_answer',
        'wrong_answer',
        'typo',
        'bad_explanation',
        'technical_issue',
        'image_missing',
        'ambiguous_question',
        'missing_information',
        'other',
      ],
      required: true,
    },
    userNotes: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const QuestionReport = mongoose.model<IQuestionReport>('QuestionReport', questionReportSchema);

export default QuestionReport;
