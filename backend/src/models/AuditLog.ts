import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  adminUser?: mongoose.Types.ObjectId;
  adminEmail?: string;
  action: string; // e.g. 'CREDIT_WALLET', 'UPDATE_USER_STATUS', 'APPROVE_AI_QUESTION', 'RUN_JOB_MANUALLY'
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  clientIp?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema(
  {
    adminUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    adminEmail: {
      type: String,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    clientIp: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
