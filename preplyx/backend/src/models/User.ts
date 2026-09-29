import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: string;
  exam_type?: string;
  targetExam?: string;
  targetScore?: number;
  examDate?: Date;
  targetCourse?: string;
  targetInstitution?: string;
  subjects?: string[];
  confidenceLevel?: string;
  dailyStudyMinutes?: number;
  onboardingCompleted?: boolean;
  diagnosticCompleted?: boolean;
  diagnosticScore?: number;
  readinessScore?: number;
  wallet?: mongoose.Types.ObjectId;
  status?: 'active' | 'suspended';
  xp?: number;
  settings?: {
    darkMode?: boolean;
    notifications?: boolean;
    emailNotifications?: boolean;
    language?: string;
  };
  achievements?: {
    id: number;
    name: string;
    description: string;
    icon: string;
    color: string;
    unlocked: boolean;
    date?: string;
    progress?: number;
    xp?: number;
  }[];
  notifications?: {
    id: number;
    type: string;
    title: string;
    message: string;
    time: string;
    unread: boolean;
  }[];
  resetPasswordOTP?: string;
  resetPasswordOTPExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'student',
    },
    xp: {
      type: Number,
      default: 100,
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },
    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      default: '',
    },
    exam_type: {
      type: String,
      default: 'JAMB',
    },
    targetExam: {
      type: String,
      default: 'JAMB',
    },
    targetScore: {
      type: Number,
      default: 280,
    },
    examDate: {
      type: Date,
      default: null,
    },
    targetCourse: {
      type: String,
      default: '',
    },
    targetInstitution: {
      type: String,
      default: '',
    },
    subjects: [{ type: String }],
    confidenceLevel: {
      type: String,
      default: 'moderate',
    },
    dailyStudyMinutes: {
      type: Number,
      default: 60,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    diagnosticCompleted: {
      type: Boolean,
      default: false,
    },
    diagnosticScore: {
      type: Number,
      default: 0,
    },
    readinessScore: {
      type: Number,
      default: 50,
    },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    settings: {
      darkMode: {
        type: Boolean,
        default: false,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        default: 'English',
      },
    },
    achievements: { type: Schema.Types.Mixed, default: [] },
    notifications: { type: Schema.Types.Mixed, default: [] },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (this: any) {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
