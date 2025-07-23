const express = require('express');
// const rateLimit = require('express-rate-limit'); // COMMENTED OUT FOR TESTING
const { auth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const subdomainRequestController = require('../controllers/subdomainRequestController');

const router = express.Router();

/**
 * Rate limiting for subdomain request endpoints - DISABLED FOR TESTING
 */
// const requestSubmissionLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // 5 requests per 15 minutes per IP
//   message: {
//     success: false,
//     error: 'Rate Limit',
//     message: 'Too many access requests submitted. Please wait before submitting another request.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false
// });

// const generalLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // 100 requests per 15 minutes per IP
//   message: {
//     success: false,
//     error: 'Rate Limit',
//     message: 'Too many requests. Please try again later.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false
// });

// Dummy rate limiters for testing
const requestSubmissionLimit = (req, res, next) => next();
const generalLimit = (req, res, next) => next();

/**
 * User Routes - Authentication required
 */

// Submit new access request
router.post('/', auth, requestSubmissionLimit, subdomainRequestController.submitRequest);

// Get user's own requests
router.get('/my-requests', auth, generalLimit, subdomainRequestController.getMyRequests);

// Check user's access status
router.get('/access-status', auth, generalLimit, subdomainRequestController.getAccessStatus);

// Verify user's access to specific subdomain (for subdomain authentication)
router.get('/verify-access/:subdomainId', auth, generalLimit, subdomainRequestController.verifySubdomainAccess);

/**
 * Admin Routes - Admin authentication required
 */

// Get all requests (admin only)
router.get('/admin/all', auth, requireAdmin, generalLimit, subdomainRequestController.getAllRequests);

// Get pending requests (admin only)
router.get('/admin/pending', auth, requireAdmin, generalLimit, subdomainRequestController.getPendingRequests);

// Get request statistics (admin only)
router.get('/admin/stats', auth, requireAdmin, generalLimit, subdomainRequestController.getRequestStats);

// Approve a request (admin only)
router.put('/admin/:id/approve', auth, requireAdmin, generalLimit, subdomainRequestController.approveRequest);

// Deny a request (admin only)
router.put('/admin/:id/deny', auth, requireAdmin, generalLimit, subdomainRequestController.denyRequest);

// Fix expired approval (admin only) - temporary endpoint
router.put('/admin/:id/fix-expiration', auth, requireAdmin, generalLimit, subdomainRequestController.fixExpiredApproval);

// Clear all subdomain requests (admin only) - development/testing
router.delete('/admin/clear-all', auth, requireAdmin, generalLimit, subdomainRequestController.clearAllRequests);

module.exports = router;