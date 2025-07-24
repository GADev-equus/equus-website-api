const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { 
  authLimiter, 
  passwordResetLimiter, 
  registrationLimiter, 
  emailVerificationLimiter,
  tokenRefreshLimiter
} = require('../middleware/rateLimiter');

// Public routes (no authentication required)

// User registration
router.post('/signup', /* registrationLimiter, */ authController.signup);

// User login
router.post('/signin', /* authLimiter, */ authController.signin);

// Request password reset
router.post('/request-reset', /* passwordResetLimiter, */ authController.requestPasswordReset);

// Reset password with token
router.post('/reset', /* passwordResetLimiter, */ authController.resetPassword);

// Verify email address
router.post('/verify-email', /* emailVerificationLimiter, */ authController.verifyEmail);

// Refresh JWT token
router.post('/refresh', /* tokenRefreshLimiter, */ authController.refreshToken);

// Token validation for subdomains (public endpoint for subdomain authentication)  
router.get('/validate-token', authController.validateToken);

// Protected routes (authentication required)

// User logout
router.post('/logout', auth, authController.logout);

module.exports = router;