const mongoose = require('mongoose');

const tunnelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['http', 'tcp', 'https'],
    default: 'http'
  },
  localPort: {
    type: Number,
    required: true,
    min: 1,
    max: 65535
  },
  localHost: {
    type: String,
    default: 'localhost'
  },
  publicUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'connecting'],
    default: 'connecting'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stats: {
    connections: {
      type: Number,
      default: 0
    },
    bytesTransferred: {
      type: Number,
      default: 0
    },
    lastConnection: Date,
    uptime: {
      type: Number,
      default: 0
    }
  },
  config: {
    customDomain: String,
    auth: {
      enabled: Boolean,
      username: String,
      password: String
    },
    ssl: {
      enabled: Boolean,
      cert: String,
      key: String
    },
    headers: {
      type: Map,
      of: String
    }
  },
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      default: 'info'
    },
    message: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  lastHeartbeat: Date,
  error: {
    message: String,
    timestamp: Date,
    code: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
tunnelSchema.index({ userId: 1, isActive: 1 });
tunnelSchema.index({ status: 1 });

// Virtual for full URL
tunnelSchema.virtual('fullUrl').get(function() {
  const protocol = this.type === 'https' ? 'https' : 'http';
  return `${protocol}://${this.subdomain}.${process.env.BASE_DOMAIN}`;
});

// Method to add log entry
tunnelSchema.methods.addLog = function(level, message, metadata = {}) {
  this.logs.push({
    level,
    message,
    metadata,
    timestamp: new Date()
  });
  
  // Keep only last 100 logs
  if (this.logs.length > 100) {
    this.logs = this.logs.slice(-100);
  }
  
  return this.save();
};

// Method to update stats
tunnelSchema.methods.updateStats = function(bytesTransferred = 0) {
  this.stats.bytesTransferred += bytesTransferred;
  this.stats.lastConnection = new Date();
  this.lastHeartbeat = new Date();
  return this.save();
};

// Method to set error
tunnelSchema.methods.setError = function(message, code = 'UNKNOWN') {
  this.status = 'error';
  this.error = {
    message,
    code,
    timestamp: new Date()
  };
  return this.save();
};

// Method to clear error
tunnelSchema.methods.clearError = function() {
  this.status = 'active';
  this.error = undefined;
  return this.save();
};

module.exports = mongoose.model('Tunnel', tunnelSchema);
