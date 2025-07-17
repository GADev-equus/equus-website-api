const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, requireActiveUser } = require('../middleware/auth');
const { 
  requireAdmin, 
  requireAdminOrOwnership,
  requireRoleModification,
  logAdminAccess
} = require('../middleware/roles');
const { 
  profileUpdateLimiter, 
  adminActionLimiter
} = require('../middleware/rateLimiter');

// All user routes require authentication
router.use(auth);

// User profile routes

// Get current user profile
router.get('/profile', userController.getProfile);

// Update current user profile
router.put('/profile', /* profileUpdateLimiter, */ requireActiveUser, userController.updateProfile);

// Change password
router.put('/password', /* profileUpdateLimiter, */ requireActiveUser, userController.changePassword);

// Delete own account
router.delete('/account', requireActiveUser, userController.deleteAccount);

// Admin-only routes

// Get all users (Admin only)
router.get('/', 
  requireAdmin, 
  logAdminAccess('view all users'),
  userController.getAllUsers
);

// Get user by ID (Admin only)
router.get('/:id', 
  requireAdmin, 
  logAdminAccess('view user details'),
  userController.getUserById
);

// Update user role (Admin only)
router.put('/:id/role', 
  /* adminActionLimiter, */
  requireAdmin,
  requireRoleModification,
  logAdminAccess('update user role'),
  userController.updateUserRole
);

// Update user status (Admin only)
router.put('/:id/status', 
  /* adminActionLimiter, */
  requireAdmin,
  logAdminAccess('update user status'),
  userController.updateUserStatus
);

// Get user statistics (Admin only)
router.get('/admin/stats', 
  requireAdmin,
  logAdminAccess('view user statistics'),
  userController.getUserStats
);

module.exports = router;