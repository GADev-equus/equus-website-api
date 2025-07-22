const SubdomainRequest = require('../models/SubdomainRequest');
const User = require('../models/User');
const authService = require('../utils/authService');
const emailService = require('../utils/emailService');
const emailTemplates = require('../utils/emailTemplates');

/**
 * Subdomain Request Controller
 * Handles subdomain access request management for users and admins
 */
const subdomainRequestController = {
  /**
   * Submit a new subdomain access request
   * POST /api/subdomain-requests
   */
  async submitRequest(req, res) {
    try {
      const { subdomainId, requestReason } = req.body;
      const userId = req.user._id;

      // Validate required fields
      if (!subdomainId) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Subdomain ID is required'
        });
      }

      // Validate subdomain exists
      const validSubdomains = ['ai-trl', 'ai-tutot'];
      if (!validSubdomains.includes(subdomainId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Subdomain',
          message: 'The requested subdomain does not exist'
        });
      }

      // Get client information
      const ipAddress = authService.getClientIpAddress(req);
      const userAgent = req.get('User-Agent');

      // Create the request
      const request = await SubdomainRequest.createRequest(userId, subdomainId, {
        requestReason: authService.sanitizeInput(requestReason || ''),
        ipAddress,
        userAgent
      });

      // Populate user details for response
      await request.populate('userId', 'firstName lastName email role');

      // Send notification email to admins (optional)
      try {
        const adminUsers = await User.find({ role: 'admin', isActive: true, emailVerified: true });
        const subdomainNames = {
          'ai-trl': 'AI Training & Learning Platform',
          'ai-tutot': 'AI Tutorial Platform'
        };

        for (const admin of adminUsers) {
          await emailService.sendEmail({
            to: admin.email,
            subject: `New Subdomain Access Request - ${subdomainNames[subdomainId]}`,
            html: `
              <h3>New Subdomain Access Request</h3>
              <p><strong>User:</strong> ${request.userId.firstName} ${request.userId.lastName} (${request.userId.email})</p>
              <p><strong>Resource:</strong> ${subdomainNames[subdomainId]}</p>
              <p><strong>Reason:</strong> ${requestReason || 'No reason provided'}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
              <p>Please review this request in the admin dashboard.</p>
            `
          });
        }
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError.message);
        // Continue even if email fails
      }


      res.status(201).json({
        success: true,
        message: 'Access request submitted successfully. Administrators will review your request.',
        request: request.toSafeObject()
      });

    } catch (error) {

      // Handle duplicate request error
      if (error.message.includes('pending request')) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate Request',
          message: error.message
        });
      }

      if (error.message.includes('already have access')) {
        return res.status(400).json({
          success: false,
          error: 'Access Already Granted',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to submit access request. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Get user's own subdomain requests
   * GET /api/subdomain-requests/my-requests
   */
  async getMyRequests(req, res) {
    try {
      const userId = req.user._id;
      const { subdomainId, status } = req.query;

      const requests = await SubdomainRequest.getUserRequests(userId, {
        subdomainId,
        status,
        limit: 50
      });

      res.status(200).json({
        success: true,
        requests: requests.map(req => ({
          ...req,
          id: req._id,
          isExpired: req.expiresAt && req.expiresAt < new Date()
        }))
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve your requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Check user's active access status for subdomains
   * GET /api/subdomain-requests/access-status
   */
  async getAccessStatus(req, res) {
    try {
      const userId = req.user._id;
      const { subdomainId } = req.query;

      if (subdomainId) {
        // Check specific subdomain
        const hasAccess = await SubdomainRequest.hasActiveAccess(userId, subdomainId);
        return res.status(200).json({
          success: true,
          subdomainId,
          hasAccess
        });
      }

      // Check all subdomains
      const validSubdomains = ['ai-trl', 'ai-tutot'];
      const accessStatus = {};

      for (const subdomain of validSubdomains) {
        accessStatus[subdomain] = await SubdomainRequest.hasActiveAccess(userId, subdomain);
      }

      res.status(200).json({
        success: true,
        accessStatus
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to check access status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Admin: Get all requests with filtering
   * GET /api/subdomain-requests/admin/all
   */
  async getAllRequests(req, res) {
    try {
      // Ensure user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Administrator privileges required'
        });
      }

      const { 
        status = 'all', 
        subdomainId,
        limit = 50,
        skip = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      let requests;
      const options = {
        limit: parseInt(limit),
        skip: parseInt(skip),
        sortBy,
        sortOrder: sortOrder === 'desc' ? -1 : 1
      };

      if (status === 'all') {
        // Get all requests
        const filter = {};
        if (subdomainId) filter.subdomainId = subdomainId;

        requests = await SubdomainRequest.find(filter)
          .populate('userId', 'firstName lastName email role emailVerified')
          .populate('reviewedBy', 'firstName lastName email')
          .sort({ [sortBy]: options.sortOrder })
          .limit(options.limit)
          .skip(options.skip)
          .lean();
      } else {
        // Get requests by status
        requests = await SubdomainRequest.getRequestsByStatus(status, {
          subdomainId,
          ...options
        });
      }

      // Add computed fields
      const enhancedRequests = requests.map(req => ({
        ...req,
        id: req._id,
        isExpired: req.expiresAt && req.expiresAt < new Date(),
        subdomainName: req.subdomainId === 'ai-trl' ? 'AI Training & Learning Platform' : 'AI Tutorial Platform'
      }));

      res.status(200).json({
        success: true,
        requests: enhancedRequests,
        pagination: {
          limit: options.limit,
          skip: options.skip,
          total: await SubdomainRequest.countDocuments(status === 'all' ? {} : { status })
        }
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Admin: Get pending requests
   * GET /api/subdomain-requests/admin/pending
   */
  async getPendingRequests(req, res) {
    try {
      // Ensure user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Administrator privileges required'
        });
      }

      const { limit = 50, skip = 0 } = req.query;

      const requests = await SubdomainRequest.getPendingRequests({
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      // Add computed fields
      const enhancedRequests = requests.map(req => ({
        ...req,
        id: req._id,
        subdomainName: req.subdomainId === 'ai-trl' ? 'AI Training & Learning Platform' : 'AI Tutorial Platform'
      }));

      res.status(200).json({
        success: true,
        requests: enhancedRequests
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve pending requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Admin: Approve a request
   * PUT /api/subdomain-requests/admin/:id/approve
   */
  async approveRequest(req, res) {
    try {
      // Ensure user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Administrator privileges required'
        });
      }

      const { id } = req.params;
      const { adminMessage, expiresAt } = req.body;
      const reviewerId = req.user._id;

      // Find the request
      const request = await SubdomainRequest.findById(id).populate('userId', 'firstName lastName email');
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Request Not Found',
          message: 'The specified request was not found'
        });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Status',
          message: 'Only pending requests can be approved'
        });
      }

      // Approve the request
      await request.approve(reviewerId, adminMessage, expiresAt ? new Date(expiresAt) : null);

      // Send approval email to user
      try {
        const subdomainNames = {
          'ai-trl': 'AI Training & Learning Platform',
          'ai-tutot': 'AI Tutorial Platform'
        };

        await emailService.sendEmail({
          to: request.userId.email,
          subject: `Subdomain Access Approved - ${subdomainNames[request.subdomainId]}`,
          html: `
            <h3>Access Request Approved</h3>
            <p>Dear ${request.userId.firstName},</p>
            <p>Your request for access to <strong>${subdomainNames[request.subdomainId]}</strong> has been approved!</p>
            ${adminMessage ? `<p><strong>Admin Note:</strong> ${adminMessage}</p>` : ''}
            ${expiresAt ? `<p><strong>Access Expires:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
            <p>You can now access this resource from your dashboard.</p>
            <p>Best regards,<br>Equus Systems Team</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError.message);
        // Continue even if email fails
      }


      res.status(200).json({
        success: true,
        message: 'Request approved successfully',
        request: request.toSafeObject()
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to approve request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Admin: Deny a request
   * PUT /api/subdomain-requests/admin/:id/deny
   */
  async denyRequest(req, res) {
    try {
      // Ensure user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Administrator privileges required'
        });
      }

      const { id } = req.params;
      const { adminMessage } = req.body;
      const reviewerId = req.user._id;

      // Find the request
      const request = await SubdomainRequest.findById(id).populate('userId', 'firstName lastName email');
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Request Not Found',
          message: 'The specified request was not found'
        });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Status',
          message: 'Only pending requests can be denied'
        });
      }

      // Deny the request
      await request.deny(reviewerId, adminMessage);

      // Send denial email to user
      try {
        const subdomainNames = {
          'ai-trl': 'AI Training & Learning Platform',
          'ai-tutot': 'AI Tutorial Platform'
        };

        await emailService.sendEmail({
          to: request.userId.email,
          subject: `Subdomain Access Request Update - ${subdomainNames[request.subdomainId]}`,
          html: `
            <h3>Access Request Update</h3>
            <p>Dear ${request.userId.firstName},</p>
            <p>We have reviewed your request for access to <strong>${subdomainNames[request.subdomainId]}</strong>.</p>
            <p>Unfortunately, we are unable to approve your request at this time.</p>
            ${adminMessage ? `<p><strong>Reason:</strong> ${adminMessage}</p>` : ''}
            <p>If you have questions about this decision, please contact our support team.</p>
            <p>Best regards,<br>Equus Systems Team</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send denial email:', emailError.message);
        // Continue even if email fails
      }


      res.status(200).json({
        success: true,
        message: 'Request denied successfully',
        request: request.toSafeObject()
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to deny request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Admin: Get request statistics
   * GET /api/subdomain-requests/admin/stats
   */
  async getRequestStats(req, res) {
    try {
      // Ensure user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Administrator privileges required'
        });
      }

      const stats = await SubdomainRequest.getRequestStats();

      res.status(200).json({
        success: true,
        stats
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Admin: Fix expired approval (temporary endpoint)
   * PUT /api/subdomain-requests/admin/:id/fix-expiration
   */
  async fixExpiredApproval(req, res) {
    try {
      // Ensure user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Administrator privileges required'
        });
      }

      const { id } = req.params;

      // Find and update the expired approval
      const request = await SubdomainRequest.findById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Request Not Found',
          message: 'The specified request was not found'
        });
      }

      if (request.status !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Invalid Status',
          message: 'Only approved requests can be fixed'
        });
      }

      // Remove expiration date (make it permanent)
      request.expiresAt = undefined;
      await request.save();


      res.status(200).json({
        success: true,
        message: 'Expiration date removed - access is now permanent',
        request: request.toSafeObject()
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to fix expired approval',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * Admin: Clear all subdomain requests (development/testing)
   * DELETE /api/subdomain-requests/admin/clear-all
   */
  async clearAllRequests(req, res) {
    try {
      // Ensure user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Administrator privileges required'
        });
      }

      // Delete all subdomain requests
      const result = await SubdomainRequest.deleteMany({});


      res.status(200).json({
        success: true,
        message: `Successfully cleared ${result.deletedCount} subdomain request entries`,
        deletedCount: result.deletedCount
      });

    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to clear subdomain requests',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = subdomainRequestController;