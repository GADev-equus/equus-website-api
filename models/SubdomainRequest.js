const mongoose = require('mongoose');

/**
 * Subdomain Access Request Model
 * Tracks user requests for access to protected subdomains
 */
const subdomainRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subdomainId: {
    type: String,
    required: true,
    enum: ['ai-trl', 'ai-tutot'], // Must match SUBDOMAIN_CONFIG keys
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'revoked'],
    default: 'pending',
    index: true
  },
  requestReason: {
    type: String,
    maxlength: 500,
    trim: true
  },
  adminMessage: {
    type: String,
    maxlength: 500,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null // Optional: Set expiration for approved access
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    requestSource: {
      type: String,
      default: 'dashboard'
    }
  }
}, {
  timestamps: true,
  collection: 'subdomain_requests'
});

// Compound indexes for efficient queries
subdomainRequestSchema.index({ userId: 1, subdomainId: 1 });
subdomainRequestSchema.index({ status: 1, createdAt: -1 });
subdomainRequestSchema.index({ reviewedBy: 1, reviewedAt: -1 });

// Ensure only one active request per user per subdomain
subdomainRequestSchema.index(
  { userId: 1, subdomainId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

// Static methods
subdomainRequestSchema.statics = {
  /**
   * Create a new subdomain access request
   */
  async createRequest(userId, subdomainId, requestData = {}) {
    const { requestReason, ipAddress, userAgent } = requestData;
    
    // Check if user already has a pending request for this subdomain
    const existingRequest = await this.findOne({
      userId,
      subdomainId,
      status: 'pending'
    });
    
    if (existingRequest) {
      throw new Error('You already have a pending request for this resource');
    }
    
    // Check if user already has approved access
    const approvedRequest = await this.findOne({
      userId,
      subdomainId,
      status: 'approved',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });
    
    if (approvedRequest) {
      throw new Error('You already have access to this resource');
    }
    
    const request = new this({
      userId,
      subdomainId,
      requestReason: requestReason || '',
      metadata: {
        ipAddress,
        userAgent,
        requestSource: 'dashboard'
      }
    });
    
    return await request.save();
  },

  /**
   * Get pending requests with user details
   */
  async getPendingRequests(options = {}) {
    const { limit = 50, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = options;
    
    return await this.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email role emailVerified')
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip)
      .lean();
  },

  /**
   * Get requests by status with filtering
   */
  async getRequestsByStatus(status, options = {}) {
    const { userId, subdomainId, limit = 50, skip = 0 } = options;
    
    const filter = { status };
    if (userId) filter.userId = userId;
    if (subdomainId) filter.subdomainId = subdomainId;
    
    return await this.find(filter)
      .populate('userId', 'firstName lastName email role')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  },

  /**
   * Get user's request history
   */
  async getUserRequests(userId, options = {}) {
    const { subdomainId, status, limit = 20 } = options;
    
    const filter = { userId };
    if (subdomainId) filter.subdomainId = subdomainId;
    if (status) filter.status = status;
    
    return await this.find(filter)
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  /**
   * Check if user has active access to subdomain
   */
  async hasActiveAccess(userId, subdomainId) {
    const activeRequest = await this.findOne({
      userId,
      subdomainId,
      status: 'approved',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });
    
    return !!activeRequest;
  },

  /**
   * Get statistics for admin dashboard
   */
  async getRequestStats() {
    const stats = await this.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      total: 0,
      pending: 0,
      approved: 0,
      denied: 0,
      revoked: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });
    
    return result;
  }
};

// Instance methods
subdomainRequestSchema.methods = {
  /**
   * Approve the request
   */
  async approve(reviewerId, adminMessage = '', expiresAt = null) {
    this.status = 'approved';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.adminMessage = adminMessage;
    if (expiresAt) this.expiresAt = expiresAt;
    
    return await this.save();
  },

  /**
   * Deny the request
   */
  async deny(reviewerId, adminMessage = '') {
    this.status = 'denied';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.adminMessage = adminMessage;
    
    return await this.save();
  },

  /**
   * Revoke approved access
   */
  async revoke(reviewerId, adminMessage = '') {
    if (this.status !== 'approved') {
      throw new Error('Can only revoke approved requests');
    }
    
    this.status = 'revoked';
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
    this.adminMessage = adminMessage;
    
    return await this.save();
  },

  /**
   * Check if request is expired
   */
  isExpired() {
    return this.expiresAt && this.expiresAt < new Date();
  },

  /**
   * Get safe response object
   */
  toSafeObject() {
    const obj = this.toObject();
    return {
      id: obj._id,
      subdomainId: obj.subdomainId,
      status: obj.status,
      requestReason: obj.requestReason,
      adminMessage: obj.adminMessage,
      reviewedAt: obj.reviewedAt,
      expiresAt: obj.expiresAt,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      isExpired: this.isExpired()
    };
  }
};

// Pre-save middleware
subdomainRequestSchema.pre('save', function(next) {
  // Validate subdomain exists in configuration
  const validSubdomains = ['ai-trl', 'ai-tutot'];
  if (!validSubdomains.includes(this.subdomainId)) {
    return next(new Error(`Invalid subdomain: ${this.subdomainId}`));
  }
  
  next();
});

module.exports = mongoose.model('SubdomainRequest', subdomainRequestSchema);