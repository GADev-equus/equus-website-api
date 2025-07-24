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

// Test endpoint to verify deployment
router.get('/test-deployment', (req, res) => {
  res.json({
    message: 'Deployment test successful!',
    timestamp: new Date().toISOString(),
    version: '2.0',
    validateTokenAvailable: typeof authController.validateToken === 'function'
  });
});

// Debug endpoint to check cookies (temporary)
router.get('/debug-cookies', (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent'],
      authorization: req.headers.authorization
    },
    timestamp: new Date().toISOString()
  });
});

// Protected routes (authentication required)

// User logout
router.post('/logout', auth, authController.logout);

module.exports = router;