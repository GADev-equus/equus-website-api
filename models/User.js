const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email address'
    },
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters long']
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Profile
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minLength: [2, 'First name must be at least 2 characters long'],
    maxLength: [50, 'First name must not exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minLength: [2, 'Last name must be at least 2 characters long'],
    maxLength: [50, 'Last name must not exceed 50 characters']
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minLength: [3, 'Username must be at least 3 characters long'],
    maxLength: [30, 'Username must not exceed 30 characters'],
    validate: {
      validator: function(username) {
        return /^[a-zA-Z0-9_]+$/.test(username);
      },
      message: 'Username can only contain letters, numbers, and underscores'
    },
    index: true
  },
  avatar: {
    type: String,
    trim: true,
    validate: {
      validator: function(url) {
        return !url || validator.isURL(url);
      },
      message: 'Avatar must be a valid URL'
    }
  },
  bio: {
    type: String,
    trim: true,
    maxLength: [500, 'Bio must not exceed 500 characters']
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  permissions: [{
    type: String,
    trim: true
  }],
  
  // Security and Tracking
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: {
    type: Date
  },
  
  // Metadata
  registrationDate: {
    type: Date,
    default: Date.now
  },
  registrationIP: {
    type: String,
    trim: true
  },
  lastLoginIP: {
    type: String,
    trim: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },
  
  // Referral System
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret.loginAttempts;
      delete ret.accountLocked;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ createdAt: -1 });

// Account lockout virtual
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Instance methods
userSchema.methods.incrementLoginAttempts = function() {
  const maxAttempts = 5;
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes
  
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + lockoutDuration,
      accountLocked: true
    };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { accountLocked: false }
  });
};

userSchema.methods.updateLastLogin = function(ipAddress) {
  return this.updateOne({
    $set: {
      lastLogin: new Date(),
      lastLoginIP: ipAddress
    }
  });
};

userSchema.methods.generateReferralCode = function() {
  const crypto = require('crypto');
  const code = crypto.randomBytes(8).toString('hex').toUpperCase();
  this.referralCode = code;
  return code;
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ 
    isActive: true, 
    accountStatus: 'active' 
  });
};

userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin' });
};

userSchema.statics.getUserStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.registrationDate = new Date();
    
    // Generate referral code if not provided
    if (!this.referralCode) {
      this.generateReferralCode();
    }
  }
  
  next();
});

// Error handling middleware
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    if (error.message.includes('email')) {
      next(new Error('Email address is already registered'));
    } else if (error.message.includes('username')) {
      next(new Error('Username is already taken'));
    } else if (error.message.includes('referralCode')) {
      next(new Error('Referral code conflict'));
    } else {
      next(new Error('Duplicate field error'));
    }
  } else {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;