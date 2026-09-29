import mongoose, { Document, Schema } from 'mongoose';

export interface IAutomationJobState extends Document {
  jobName: string; // e.g. 'daily_challenge_generation', 'daily_quiz_generation', 'competition_state_processor', etc.
  displayName: string;
  category: 'learning' | 'gamification' | 'competition' | 'business' | 'retention' | 'analytics';
  cronSchedule: string;
  isEnabled: boolean;
  lastRunStartTime?: Date;
  lastRunEndTime?: Date;
  lastRunStatus?: 'success' | 'failed' | 'running';
  lastRunDurationMs?: number;
  lastError?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const automationJobStateSchema = new Schema(
  {
    jobName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['learning', 'gamification', 'competition', 'business', 'retention', 'analytics'],
      default: 'learning',
    },
    cronSchedule: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    lastRunStartTime: {
      type: Date,
    },
    lastRunEndTime: {
      type: Date,
    },
    lastRunStatus: {
      type: String,
      enum: ['success', 'failed', 'running'],
    },
    lastRunDurationMs: {
      type: Number,
    },
    lastError: {
      type: String,
    },
    totalRuns: {
      type: Number,
      default: 0,
    },
    successfulRuns: {
      type: Number,
      default: 0,
    },
    failedRuns: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const AutomationJobState = mongoose.model<IAutomationJobState>(
  'AutomationJobState',
  automationJobStateSchema
);

export default AutomationJobState;
