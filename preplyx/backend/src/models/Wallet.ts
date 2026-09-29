import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  user: mongoose.Types.ObjectId;
  balance: number;
  totalFunded: number;
  totalSpent: number;
  welcomeBonus: number;
  virtualAccount?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
}

const walletSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    totalFunded: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    welcomeBonus: {
      type: Number,
      default: 0,
    },
    virtualAccount: {
      bankName: String,
      accountName: String,
      accountNumber: String,
    },
  },
  {
    timestamps: true,
  }
);

const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);

export default Wallet;
