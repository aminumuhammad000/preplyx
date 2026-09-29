import mongoose, { Document, Schema } from 'mongoose';

export type CompetitionStatus =
  | 'draft'
  | 'scheduled'
  | 'registration'
  | 'active'
  | 'ended'
  | 'results'
  | 'completed';

export interface ICompetitionPrize {
  rank: number;
  title: string;
  cashNgn?: number;
  xpBonus: number;
}

export interface ICompetition extends Document {
  title: string;
  slug: string;
  description: string;
  exam: string;
  subjects: string[];
  questions: mongoose.Types.ObjectId[];
  durationMinutes: number;
  registrationStartDate: Date;
  registrationEndDate: Date;
  startTime: Date;
  endTime: Date;
  status: CompetitionStatus;
  entryFeeNgn: number;
  maxParticipants?: number;
  currentParticipantsCount: number;
  totalSubmissionsCount: number;
  prizes: ICompetitionPrize[];
  rules: string[];
  bannerUrl?: string;
  isResultsPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const competitionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    exam: {
      type: String,
      required: true,
      default: 'JAMB',
      index: true,
    },
    subjects: [
      {
        type: String,
        required: true,
      },
    ],
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    durationMinutes: {
      type: Number,
      required: true,
      default: 45,
    },
    registrationStartDate: {
      type: Date,
      required: true,
    },
    registrationEndDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'registration',
        'active',
        'ended',
        'results',
        'completed',
      ],
      default: 'draft',
      index: true,
    },
    entryFeeNgn: {
      type: Number,
      default: 0,
    },
    maxParticipants: {
      type: Number,
    },
    currentParticipantsCount: {
      type: Number,
      default: 0,
    },
    totalSubmissionsCount: {
      type: Number,
      default: 0,
    },
    prizes: [
      {
        rank: Number,
        title: String,
        cashNgn: { type: Number, default: 0 },
        xpBonus: { type: Number, default: 0 },
      },
    ],
    rules: [{ type: String }],
    bannerUrl: { type: String },
    isResultsPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Competition = mongoose.model<ICompetition>('Competition', competitionSchema);

export default Competition;
