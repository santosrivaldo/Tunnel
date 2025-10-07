const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free'
  },
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid'],
      default: 'active'
    },
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: Boolean
  },
  limits: {
    maxTunnels: {
      type: Number,
      default: 1
    },
    maxAgents: {
      type: Number,
      default: 1
    },
    bandwidthLimit: {
      type: Number,
      default: 1024 * 1024 * 1024 // 1GB in bytes
    },
    monthlyBandwidth: {
      type: Number,
      default: 0
    }
  },
  usage: {
    totalTunnels: {
      type: Number,
      default: 0
    },
    totalAgents: {
      type: Number,
      default: 0
    },
    bandwidthUsed: {
      type: Number,
      default: 0
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user can create more tunnels
userSchema.methods.canCreateTunnel = function() {
  return this.usage.totalTunnels < this.limits.maxTunnels;
};

// Check if user can create more agents
userSchema.methods.canCreateAgent = function() {
  return this.usage.totalAgents < this.limits.maxAgents;
};

// Check bandwidth limit
userSchema.methods.hasBandwidthLimit = function() {
  return this.usage.bandwidthUsed < this.limits.bandwidthLimit;
};

// Reset monthly usage
userSchema.methods.resetMonthlyUsage = function() {
  this.usage.bandwidthUsed = 0;
  this.usage.lastReset = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
