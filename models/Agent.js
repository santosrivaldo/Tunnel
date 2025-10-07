const mongoose = require('mongoose');
const crypto = require('crypto');

const agentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  socketId: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'connecting', 'error'],
    default: 'offline'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  system: {
    os: String,
    arch: String,
    platform: String,
    version: String,
    hostname: String
  },
  network: {
    ip: String,
    userAgent: String,
    location: {
      country: String,
      region: String,
      city: String
    }
  },
  stats: {
    uptime: {
      type: Number,
      default: 0
    },
    totalConnections: {
      type: Number,
      default: 0
    },
    bytesTransferred: {
      type: Number,
      default: 0
    },
    lastConnection: Date
  },
  config: {
    autoReconnect: {
      type: Boolean,
      default: true
    },
    heartbeatInterval: {
      type: Number,
      default: 30000 // 30 seconds
    },
    maxReconnectAttempts: {
      type: Number,
      default: 5
    },
    reconnectDelay: {
      type: Number,
      default: 5000 // 5 seconds
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
  error: {
    message: String,
    timestamp: Date,
    code: String,
    stack: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
agentSchema.index({ userId: 1, isActive: 1 });
agentSchema.index({ token: 1 });
agentSchema.index({ socketId: 1 });
agentSchema.index({ status: 1 });

// Method to add log entry
agentSchema.methods.addLog = function(level, message, metadata = {}) {
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

// Method to update heartbeat
agentSchema.methods.updateHeartbeat = function() {
  this.lastSeen = new Date();
  this.status = 'online';
  return this.save();
};

// Method to set offline
agentSchema.methods.setOffline = function() {
  this.status = 'offline';
  this.socketId = undefined;
  return this.save();
};

// Method to set error
agentSchema.methods.setError = function(message, code = 'UNKNOWN', stack = null) {
  this.status = 'error';
  this.error = {
    message,
    code,
    stack,
    timestamp: new Date()
  };
  return this.save();
};

// Method to clear error
agentSchema.methods.clearError = function() {
  this.status = 'online';
  this.error = undefined;
  return this.save();
};

// Method to update stats
agentSchema.methods.updateStats = function(bytesTransferred = 0) {
  this.stats.bytesTransferred += bytesTransferred;
  this.stats.lastConnection = new Date();
  return this.save();
};

// Static method to generate new token
agentSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Virtual for connection duration
agentSchema.virtual('connectionDuration').get(function() {
  if (this.status === 'online' && this.lastSeen) {
    return Date.now() - this.lastSeen.getTime();
  }
  return 0;
});

module.exports = mongoose.model('Agent', agentSchema);
