import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  company?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  licenses?: mongoose.Types.ObjectId[];
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stripeCustomerId: {
    type: String,
    sparse: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete (ret as any).password;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete (ret as any).password;
      return ret;
    }
  }
});

// Virtual populate for licenses
UserSchema.virtual('licenses', {
  ref: 'License',
  localField: '_id',
  foreignField: 'userId'
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ stripeCustomerId: 1 }, { sparse: true });
UserSchema.index({ createdAt: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);