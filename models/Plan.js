const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    monthly: {
      type: Number,
      required: true,
      min: 0
    },
    yearly: {
      type: Number,
      required: true,
      min: 0
    }
  },
  stripe: {
    monthlyPriceId: String,
    yearlyPriceId: String
  },
  limits: {
    maxTunnels: {
      type: Number,
      required: true,
      min: 0
    },
    maxAgents: {
      type: Number,
      required: true,
      min: 0
    },
    bandwidthLimit: {
      type: Number,
      required: true,
      min: 0
    },
    customDomains: {
      type: Number,
      default: 0
    },
    sslCertificates: {
      type: Number,
      default: 0
    },
    prioritySupport: {
      type: Boolean,
      default: false
    }
  },
  features: [{
    name: String,
    description: String,
    included: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
planSchema.index({ name: 1, isActive: 1 });
planSchema.index({ sortOrder: 1 });

// Virtual for yearly discount percentage
planSchema.virtual('yearlyDiscount').get(function() {
  const monthlyTotal = this.price.monthly * 12;
  const yearlyPrice = this.price.yearly;
  return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
});

// Method to check if plan has feature
planSchema.methods.hasFeature = function(featureName) {
  const feature = this.features.find(f => f.name === featureName);
  return feature ? feature.included : false;
};

// Method to get plan limits
planSchema.methods.getLimits = function() {
  return {
    maxTunnels: this.limits.maxTunnels,
    maxAgents: this.limits.maxAgents,
    bandwidthLimit: this.limits.bandwidthLimit,
    customDomains: this.limits.customDomains,
    sslCertificates: this.limits.sslCertificates,
    prioritySupport: this.limits.prioritySupport
  };
};

// Static method to get active plans
planSchema.statics.getActivePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

// Static method to get plan by name
planSchema.statics.getPlanByName = function(name) {
  return this.findOne({ name, isActive: true });
};

module.exports = mongoose.model('Plan', planSchema);
