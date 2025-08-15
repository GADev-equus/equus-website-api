const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { adminActionLimiter } = require('../middleware/rateLimiter');

// Public analytics routes (no authentication required)
router.get('/public/page-views', analyticsController.getPublicPageViews);
router.post('/track', analyticsController.trackClientEvent);

// All other analytics routes require authentication and admin role
router.use(auth);
router.use(requireRole('admin'));
// router.use(adminActionLimiter); // Rate limiting for admin actions - COMMENTED OUT FOR TESTING

// Analytics overview endpoint
router.get('/overview', analyticsController.getOverview);

// Traffic analytics endpoint
router.get('/traffic', analyticsController.getTrafficAnalytics);

// Page performance analytics endpoint
router.get('/performance', analyticsController.getPagePerformance);

// User analytics endpoint (authenticated users only)
router.get('/users', analyticsController.getUserAnalytics);

module.exports = router;
