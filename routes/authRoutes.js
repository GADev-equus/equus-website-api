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
router.get('/validate-token', (req, res) => {
  console.log('🔍 Route /validate-token called, calling authController.validateToken');
  if (typeof authController.validateToken === 'function') {
    return authController.validateToken(req, res);
  } else {
    console.error('❌ authController.validateToken is not a function:', typeof authController.validateToken);
    return res.status(500).json({
      success: false,
      error: 'Function Missing',
      message: 'validateToken function not found in authController',
      functionType: typeof authController.validateToken
    });
  }
});

// Test endpoint to verify deployment
router.get('/test-deployment', (req, res) => {
  res.json({
    message: 'Deployment test successful!',
    timestamp: new Date().toISOString(),
    version: '2.0',
    validateTokenAvailable: typeof authController.validateToken === 'function'
  });
});

// Alternative test endpoint that mimics validate-token path structure
router.get('/validate-test', (req, res) => {
  res.json({
    message: 'validate-test endpoint working',
    timestamp: new Date().toISOString(),
    authControllerExists: typeof authController === 'object',
    validateTokenFunction: typeof authController.validateToken,
    functionExists: authController.validateToken !== undefined
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