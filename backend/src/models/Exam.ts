import mongoose, { Document, Schema } from 'mongoose';

export interface IExam extends Document {
  name: string;
  displayName: string;
  subjects: string[];
  color: string;
  years: string;
  description: string;
  questionCount?: string;
}

const examSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    subjects: [{
      type: String,
      required: true,
    }],
    color: {
      type: String,
      required: true,
    },
    years: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    questionCount: {
      type: String,
      default: '0',
    },
  },
  {
    timestamps: true,
  }
);

const Exam = mongoose.model<IExam>('Exam', examSchema);

export default Exam;
