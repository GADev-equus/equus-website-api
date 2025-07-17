const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Page Information
  path: {
    type: String,
    required: [true, 'Path is required'],
    trim: true,
    index: true
  },
  method: {
    type: String,
    required: [true, 'HTTP method is required'],
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    uppercase: true
  },
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for anonymous users
    index: true
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    trim: true,
    index: true
  },
  
  // Request Information
  ipAddress: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true
  },
  userAgent: {
    type: String,
    required: [true, 'User agent is required'],
    trim: true
  },
  referer: {
    type: String,
    default: null,
    trim: true
  },
  
  // Response Information
  statusCode: {
    type: Number,
    required: [true, 'Status code is required'],
    min: [100, 'Status code must be at least 100'],
    max: [599, 'Status code must not exceed 599']
  },
  responseTime: {
    type: Number,
    required: [true, 'Response time is required'],
    min: [0, 'Response time must be non-negative']
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Aggregation helpers for performance
  dateOnly: {
    type: String, // YYYY-MM-DD format
    required: true,
    index: true
  },
  hourOnly: {
    type: String, // YYYY-MM-DD-HH format
    required: true,
    index: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Compound indexes for performance optimization
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ path: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1, timestamp: -1 });
analyticsSchema.index({ dateOnly: 1, timestamp: -1 });
analyticsSchema.index({ hourOnly: 1, timestamp: -1 });
analyticsSchema.index({ statusCode: 1, timestamp: -1 });

// Virtual for determining if request was from authenticated user
analyticsSchema.virtual('isAuthenticated').get(function() {
  return this.userId !== null;
});

// Virtual for determining if request was successful
analyticsSchema.virtual('isSuccessful').get(function() {
  return this.statusCode >= 200 && this.statusCode < 300;
});

// Static methods for common queries
analyticsSchema.statics.getPageViews = function(startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    },
    method: 'GET',
    statusCode: { $gte: 200, $lt: 300 },
    ...filters
  };
  
  return this.countDocuments(query);
};

analyticsSchema.statics.getUniqueVisitors = function(startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    },
    method: 'GET',
    statusCode: { $gte: 200, $lt: 300 },
    ...filters
  };
  
  return this.distinct('sessionId', query);
};

analyticsSchema.statics.getTopPages = function(startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        method: 'GET',
        statusCode: { $gte: 200, $lt: 300 }
      }
    },
    {
      $group: {
        _id: '$path',
        count: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        path: '$_id',
        count: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

analyticsSchema.statics.getTrafficByPeriod = function(startDate, endDate, granularity = 'daily') {
  const groupByFormat = granularity === 'hourly' ? '$hourOnly' : '$dateOnly';
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        method: 'GET',
        statusCode: { $gte: 200, $lt: 300 }
      }
    },
    {
      $group: {
        _id: groupByFormat,
        pageViews: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$sessionId' },
        authenticatedUsers: {
          $addToSet: {
            $cond: [{ $ne: ['$userId', null] }, '$userId', null]
          }
        }
      }
    },
    {
      $project: {
        period: '$_id',
        pageViews: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' },
        authenticatedUsers: {
          $size: {
            $filter: {
              input: '$authenticatedUsers',
              cond: { $ne: ['$$this', null] }
            }
          }
        }
      }
    },
    { $sort: { period: 1 } }
  ]);
};

// Instance methods
analyticsSchema.methods.getDeviceInfo = function() {
  const ua = this.userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  if (ua.includes('mobile')) deviceType = 'mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';
  
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';
  
  return { deviceType, browser };
};

// Pre-save middleware to set aggregation helpers
analyticsSchema.pre('save', function(next) {
  const date = new Date(this.timestamp);
  this.dateOnly = date.toISOString().split('T')[0];
  this.hourOnly = date.toISOString().split('T')[0] + '-' + date.getHours().toString().padStart(2, '0');
  next();
});

// Export the model
module.exports = mongoose.model('Analytics', analyticsSchema);