import mongoose, { Document, Schema } from 'mongoose';

export type ParticipantStatus =
  | 'registered'
  | 'in_progress'
  | 'submitted'
  | 'disqualified'
  | 'did_not_start';

export interface ICompetitionParticipant extends Document {
  competition: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  status: ParticipantStatus;
  startedAt?: Date;
  submittedAt?: Date;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  rank?: number;
  isFlagged: boolean;
  flagReasons: string[];
  xpAwarded: number;
  prizeAwarded?: string;
  createdAt: Date;
  updatedAt: Date;
}

const competitionParticipantSchema = new Schema(
  {
    competition: {
      type: Schema.Types.ObjectId,
      ref: 'Competition',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'registered',
        'in_progress',
        'submitted',
        'disqualified',
        'did_not_start',
      ],
      default: 'registered',
      index: true,
    },
    startedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReasons: [{ type: String }],
    xpAwarded: {
      type: Number,
      default: 0,
    },
    prizeAwarded: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

competitionParticipantSchema.index({ competition: 1, user: 1 }, { unique: true });
competitionParticipantSchema.index({ competition: 1, score: -1, timeSpentSeconds: 1 });

const CompetitionParticipant = mongoose.model<ICompetitionParticipant>(
  'CompetitionParticipant',
  competitionParticipantSchema
);

export default CompetitionParticipant;
