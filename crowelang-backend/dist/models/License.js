"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.License = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const UsageSchema = new mongoose_1.Schema({
    compilations: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    lastUsed: { type: Date, default: Date.now }
});
const RestrictionsSchema = new mongoose_1.Schema({
    maxCompilations: { type: Number },
    maxUsers: { type: Number },
    allowCommercial: { type: Boolean, default: false }
});
const MetadataSchema = new mongoose_1.Schema({
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
const LicenseSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
LicenseSchema.methods.generateLicenseKey = function () {
    const prefix = 'CL'; // CroweLang
    const version = '1';
    const planCodeMap = {
        'free': 'F',
        'personal': 'P',
        'professional': 'R',
        'team': 'T',
        'enterprise': 'E'
    };
    const planCode = planCodeMap[this.plan] || 'U';
    const uuid = (0, uuid_1.v4)().replace(/-/g, '').toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    // Create checksum
    const data = `${prefix}${version}${planCode}${uuid}${timestamp}`;
    const checksum = crypto_1.default.createHash('sha256').update(data).digest('hex').substring(0, 4).toUpperCase();
    return `${prefix}${version}${planCode}-${uuid.substring(0, 8)}-${uuid.substring(8, 16)}-${uuid.substring(16, 24)}-${timestamp}${checksum}`;
};
// Validate license
LicenseSchema.methods.validateLicense = function () {
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
LicenseSchema.methods.incrementUsage = async function (type) {
    if (type === 'compilation') {
        this.usage.compilations += 1;
    }
    else if (type === 'api') {
        this.usage.apiCalls += 1;
    }
    this.usage.lastUsed = new Date();
    await this.save();
};
// Pre-save middleware to generate license key
LicenseSchema.pre('save', function (next) {
    if (this.isNew && !this.licenseKey) {
        this.licenseKey = this.generateLicenseKey();
    }
    next();
});
// Set default features and restrictions based on plan
LicenseSchema.pre('save', function (next) {
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
exports.License = mongoose_1.default.model('License', LicenseSchema);
