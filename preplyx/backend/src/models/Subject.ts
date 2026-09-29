import mongoose, { Document, Schema } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  categories: string[];
  icon: string;
  tips: string;
}

const subjectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    categories: [{
      type: String,
      required: true,
    }],
    icon: {
      type: String,
      required: true,
      default: 'BookOpen',
    },
    tips: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Subject = mongoose.model<ISubject>('Subject', subjectSchema);

export default Subject;
