const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const rateLimiter = require('../middleware/rateLimiter');

// All contact management routes require authentication and admin role
router.use(auth.auth);
router.use(roles.requireAdmin);

// Apply rate limiting to all contact management endpoints
// router.use(rateLimiter.adminActionLimiter); // COMMENTED OUT FOR TESTING

/**
 * GET /api/contacts
 * Get all contacts with filtering and pagination
 * Query params: status, page, limit, search, sort, order
 */
router.get('/', contactController.getAllContacts);

/**
 * GET /api/contacts/stats
 * Get contact form statistics
 * Returns total, pending, read, replied, archived counts
 */
router.get('/stats', contactController.getContactStats);

/**
 * GET /api/contacts/recent
 * Get recent contact submissions
 * Query params: limit (default: 5)
 */
router.get('/recent', contactController.getRecentContacts);

/**
 * GET /api/contacts/:id
 * Get specific contact details by ID
 */
router.get('/:id', contactController.getContactById);

/**
 * PUT /api/contacts/:id/status
 * Update contact status (pending -> read -> replied -> archived)
 * Body: { status: 'read' | 'replied' | 'archived' }
 */
router.put('/:id/status', contactController.updateContactStatus);

/**
 * DELETE /api/contacts/:id
 * Delete contact by ID (admin only - use with caution)
 */
router.delete('/:id', contactController.deleteContact);

module.exports = router;