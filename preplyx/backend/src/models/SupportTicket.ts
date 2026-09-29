import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportTicket extends Document {
  user: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  adminReply?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supportTicketSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    adminReply: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);

export default SupportTicket;
