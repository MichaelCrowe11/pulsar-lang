import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface ILicense extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  licenseKey: string;
  plan: 'free' | 'personal' | 'professional' | 'team' | 'enterprise';
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  issuedAt: Date;
  expiresAt: Date;
  lastValidated: Date;
  usage: {
    compilations: number;
    apiCalls: number;
    lastUsed: Date;
  };
  features: string[];
  restrictions: {
    maxCompilations?: number;
    maxUsers?: number;
    allowCommercial: boolean;
  };
  metadata: {
    stripeSubscriptionId?: string;
    cryptoChargeId?: string;
    customerEmail: string;
    companyName?: string;
    hardwareFingerprint?: string[];
    paymentMethod?: 'stripe' | 'crypto';
    cryptoPayment?: {
      network?: string;
      transactionId?: string;
      amount?: string;
      currency?: string;
      confirmedAt?: Date;
    };
  };
  generateLicenseKey(): string;
  validateLicense(): boolean;
  incrementUsage(type: 'compilation' | 'api'): Promise<void>;
}

const UsageSchema = new Schema({
  compilations: { type: Number, default: 0 },
  apiCalls: { type: Number, default: 0 },
  lastUsed: { type: Date, default: Date.now }
});

const RestrictionsSchema = new Schema({
  maxCompilations: { type: Number },
  maxUsers: { type: Number },
  allowCommercial: { type: Boolean, default: false }
});

const MetadataSchema = new Schema({
  stripeSubscriptionId: { type: String },
  cryptoChargeId: { type: String },
  customerEmail: { type: String, required: true },
  companyName: { type: String },
  hardwareFingerprint: [{ type: String }],
  paymentMethod: { type: String, enum: ['stripe', 'crypto'], default: 'stripe' },
  cryptoPayment: {
    network: { type: String },
    transactionId: { type: String },
    amount: { type: String },
    currency: { type: String },
    confirmedAt: { type: Date }
  }
});

const LicenseSchema = new Schema<ILicense>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  licenseKey: { 
    type: String, 
    unique: true, 
    required: true 
  },
  plan: {
    type: String,
    enum: ['free', 'personal', 'professional', 'team', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'cancelled'],
    default: 'active'
  },
  issuedAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  lastValidated: { 
    type: Date, 
    default: Date.now 
  },
  usage: {
    type: UsageSchema,
    default: () => ({})
  },
  features: [{ 
    type: String 
  }],
  restrictions: {
    type: RestrictionsSchema,
    default: () => ({})
  },
  metadata: {
    type: MetadataSchema,
    required: true
  }
}, {
  timestamps: true
});

// Generate secure license key
LicenseSchema.methods.generateLicenseKey = function(): string {
  const prefix = 'CL'; // CroweLang
  const version = '1';
  const planCodeMap = {
    'free': 'F',
    'personal': 'P', 
    'professional': 'R',
    'team': 'T',
    'enterprise': 'E'
  } as const;
  const planCode = planCodeMap[this.plan as keyof typeof planCodeMap] || 'U';
  
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  
  // Create checksum
  const data = `${prefix}${version}${planCode}${uuid}${timestamp}`;
  const checksum = crypto.createHash('sha256').update(data).digest('hex').substring(0, 4).toUpperCase();
  
  return `${prefix}${version}${planCode}-${uuid.substring(0, 8)}-${uuid.substring(8, 16)}-${uuid.substring(16, 24)}-${timestamp}${checksum}`;
};

// Validate license
LicenseSchema.methods.validateLicense = function(): boolean {
  if (this.status !== 'active') {
    return false;
  }
  
  if (this.expiresAt < new Date()) {
    this.status = 'expired';
    this.save();
    return false;
  }
  
  // Update last validated timestamp
  this.lastValidated = new Date();
  this.save();
  
  return true;
};

// Increment usage counters
LicenseSchema.methods.incrementUsage = async function(type: 'compilation' | 'api'): Promise<void> {
  if (type === 'compilation') {
    this.usage.compilations += 1;
  } else if (type === 'api') {
    this.usage.apiCalls += 1;
  }
  
  this.usage.lastUsed = new Date();
  await this.save();
};

// Pre-save middleware to generate license key
LicenseSchema.pre('save', function(next) {
  if (this.isNew && !this.licenseKey) {
    this.licenseKey = this.generateLicenseKey();
  }
  next();
});

// Set default features and restrictions based on plan
LicenseSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('plan')) {
    switch (this.plan) {
      case 'free':
        this.features = ['basic_compilation'];
        this.restrictions = {
          maxCompilations: 100,
          maxUsers: 1,
          allowCommercial: false
        };
        break;
        
      case 'personal':
        this.features = ['unlimited_compilation', 'python_target', 'typescript_target'];
        this.restrictions = {
          maxUsers: 1,
          allowCommercial: true
        };
        break;
        
      case 'professional':
        this.features = [
          'unlimited_compilation', 
          'all_targets', 
          'api_access', 
          'priority_support',
          'advanced_optimization'
        ];
        this.restrictions = {
          maxUsers: 1,
          allowCommercial: true
        };
        break;
        
      case 'team':
        this.features = [
          'unlimited_compilation',
          'all_targets',
          'api_access',
          'team_collaboration',
          'private_repository',
          'ci_cd_integration'
        ];
        this.restrictions = {
          maxUsers: 5,
          allowCommercial: true
        };
        break;
        
      case 'enterprise':
        this.features = [
          'unlimited_compilation',
          'all_targets',
          'api_access',
          'unlimited_users',
          'on_premise',
          'custom_features',
          'sla_support'
        ];
        this.restrictions = {
          allowCommercial: true
        };
        break;
    }
  }
  next();
});

// Indexes
LicenseSchema.index({ licenseKey: 1 }, { unique: true });
LicenseSchema.index({ userId: 1, status: 1 });
LicenseSchema.index({ expiresAt: 1 });
LicenseSchema.index({ 'metadata.stripeSubscriptionId': 1 });
LicenseSchema.index({ 'metadata.cryptoChargeId': 1 });

export const License = mongoose.model<ILicense>('License', LicenseSchema);