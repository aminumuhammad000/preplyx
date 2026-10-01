import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  // Wallet Fees
  examUnlockFee: number;
  welcomeBonus: number;
  virtualAccountFee: number;
  
  // General Platform Settings
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  
  // Security settings
  requireEmailVerification: boolean;
  allowMultipleLogins: boolean;
  
  // Exam Engine
  freeTrialSessions: number;
  globalNegativeMarking: boolean;
  defaultPassMark: number;
  
  // Email & SMTP Configuration
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  smtpFrom: string;

  // Integrations & Credentials
  vtstackPublicKey: string;
  vtstackSecretKey: string;
  vtstackSandbox: boolean;
  geminiApiKey: string;
  anthropicAuthToken: string;
  anthropicBaseUrl: string;
  anthropicModel: string;
  aiProviderKeys: Record<string, any>;
}

const systemConfigSchema = new Schema(
  {
    // Wallet Fees
    examUnlockFee: { type: Number, default: 200 },
    welcomeBonus: { type: Number, default: 500 },
    virtualAccountFee: { type: Number, default: 100 },
    
    // General Settings
    platformName: { type: String, default: 'PreplyX CBT' },
    supportEmail: { type: String, default: 'support@preplyx.com' },
    supportPhone: { type: String, default: '+234 800 123 4567' },

    // Email & SMTP Settings
    smtpHost: { type: String, default: process.env.SMTP_HOST || '' },
    smtpPort: { type: Number, default: Number(process.env.SMTP_PORT) || 587 },
    smtpUser: { type: String, default: process.env.SMTP_USER || '' },
    smtpPass: { type: String, default: process.env.SMTP_PASS || '' },
    smtpSecure: { type: Boolean, default: process.env.SMTP_SECURE === 'true' },
    smtpFrom: { type: String, default: process.env.SMTP_FROM || '"PreplyX CBT" <support@preplyx.com>' },
    
    // Security settings
    requireEmailVerification: { type: Boolean, default: false },
    allowMultipleLogins: { type: Boolean, default: true },
    
    // Exam settings
    freeTrialSessions: { type: Number, default: 3 },
    globalNegativeMarking: { type: Boolean, default: false },
    defaultPassMark: { type: Number, default: 50 },
    
    // API Credentials
    vtstackPublicKey: { type: String, default: '' },
    vtstackSecretKey: { type: String, default: '' },
    vtstackSandbox: { type: Boolean, default: true },
    geminiApiKey: { type: String, default: '' },
    anthropicAuthToken: { type: String, default: process.env.ANTHROPIC_AUTH_TOKEN || '' },
    anthropicBaseUrl: { type: String, default: process.env.ANTHROPIC_BASE_URL || 'https://agentrouter.org' },
    anthropicModel: { type: String, default: process.env.ANTHROPIC_MODEL || 'claude-opus-4-6' },
    aiProviderKeys: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);
export default SystemConfig;
