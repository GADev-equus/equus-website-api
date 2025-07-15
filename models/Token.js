const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User',
    index: true
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: [true, 'Token type is required'],
    enum: ['email_verification', 'password_reset', 'refresh'],
    index: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Token expiration is required'],
    index: true
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxLength: [500, 'User agent must not exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance and TTL
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ token: 1, type: 1 });
tokenSchema.index({ createdAt: -1 });

// Virtual for checking if token is expired
tokenSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual for checking if token is valid
tokenSchema.virtual('isValid').get(function() {
  return !this.used && !this.isExpired;
});

// Instance methods
tokenSchema.methods.markAsUsed = function() {
  this.used = true;
  this.usedAt = new Date();
  return this.save();
};

tokenSchema.methods.isValidForUse = function() {
  return !this.used && !this.isExpired;
};

// Static methods
tokenSchema.statics.findValidToken = function(token, type) {
  return this.findOne({
    token: token,
    type: type,
    used: false,
    expiresAt: { $gt: new Date() }
  });
};

tokenSchema.statics.createToken = function(userId, token, type, expiresAt, ipAddress, userAgent) {
  return this.create({
    userId: userId,
    token: token,
    type: type,
    expiresAt: expiresAt,
    ipAddress: ipAddress,
    userAgent: userAgent
  });
};

tokenSchema.statics.cleanupExpiredTokens = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

tokenSchema.statics.cleanupUsedTokens = function() {
  return this.deleteMany({
    used: true,
    usedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours ago
  });
};

tokenSchema.statics.revokeUserTokens = function(userId, type) {
  return this.updateMany(
    { userId: userId, type: type, used: false },
    { $set: { used: true, usedAt: new Date() } }
  );
};

tokenSchema.statics.getTokenStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        used: { $sum: { $cond: ['$used', 1, 0] } },
        expired: {
          $sum: {
            $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Generate different token expiration times based on type
tokenSchema.statics.getExpirationTime = function(type) {
  const now = new Date();
  
  switch (type) {
    case 'email_verification':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    case 'password_reset':
      return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    case 'refresh':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    default:
      return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour default
  }
};

// Pre-save middleware
tokenSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = this.constructor.getExpirationTime(this.type);
  }
  next();
});

// Error handling middleware
tokenSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Token already exists'));
  } else {
    next(error);
  }
});

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;