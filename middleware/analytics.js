const Analytics = require('../models/Analytics');
const { optionalAuth } = require('./auth');
const { v4: uuidv4 } = require('uuid');

// Analytics middleware that tracks page views and requests
const analyticsMiddleware = [
  optionalAuth,
  (req, res, next) => {
    const startTime = Date.now();
    
    // Generate session ID if not exists (using simple cookie-based sessions)
    if (!req.headers.cookie || !req.headers.cookie.includes('sessionId=')) {
      const sessionId = uuidv4();
      res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      req.sessionId = sessionId;
    } else {
      const sessionMatch = req.headers.cookie.match(/sessionId=([^;]+)/);
      req.sessionId = sessionMatch ? sessionMatch[1] : uuidv4();
    }
    
    // Override res.end to capture response data
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Skip analytics tracking for certain paths to avoid noise
      const skipPaths = [
        '/favicon.ico',
        '/robots.txt',
        '/api/analytics',
        '/health',
        '/api/health',
        '/api/email/status'
      ];
      
      const shouldSkip = skipPaths.includes(req.path) || 
                        req.path.startsWith('/api/analytics/') ||
                        req.path.startsWith('/static/') ||
                        req.path.startsWith('/assets/');
      
      if (!shouldSkip) {
        // Create analytics record
        const now = new Date();
        const analyticsData = {
          path: req.path,
          method: req.method,
          userId: req.user ? req.user._id : null, // Uses existing auth system
          sessionId: req.sessionId,
          ipAddress: req.ip, // Uses existing trust proxy setup
          userAgent: req.get('User-Agent') || 'Unknown',
          referer: req.get('Referer') || null,
          statusCode: res.statusCode,
          responseTime,
          timestamp: now,
          dateOnly: now.toISOString().split('T')[0],
          hourOnly: now.toISOString().split('T')[0] + '-' + now.getHours().toString().padStart(2, '0')
        };
        
        // Save analytics data (fire and forget - don't block response)
        Analytics.create(analyticsData).catch(error => {
          console.error('Analytics tracking error:', error.message);
        });
      }
      
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  }
];

// Alternative middleware for specific route tracking (if needed)
const trackPageView = async (req, res, next) => {
  try {
    // Ensure we have a session ID
    if (!req.sessionId) {
      if (!req.headers.cookie || !req.headers.cookie.includes('sessionId=')) {
        const sessionId = uuidv4();
        res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
        req.sessionId = sessionId;
      } else {
        const sessionMatch = req.headers.cookie.match(/sessionId=([^;]+)/);
        req.sessionId = sessionMatch ? sessionMatch[1] : uuidv4();
      }
    }
    
    const now = new Date();
    const analyticsData = {
      path: req.path,
      method: req.method,
      userId: req.user ? req.user._id : null,
      sessionId: req.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'Unknown',
      referer: req.get('Referer') || null,
      statusCode: 200, // Assume success for page views
      responseTime: 0, // Will be updated if needed
      timestamp: now,
      dateOnly: now.toISOString().split('T')[0],
      hourOnly: now.toISOString().split('T')[0] + '-' + now.getHours().toString().padStart(2, '0')
    };
    
    // Save analytics data (fire and forget)
    Analytics.create(analyticsData).catch(error => {
      console.error('Page view tracking error:', error.message);
    });
    
    next();
  } catch (error) {
    console.error('Page view tracking middleware error:', error.message);
    next(); // Continue even if tracking fails
  }
};

// Utility function to manually track custom events
const trackEvent = async (eventData) => {
  try {
    const now = new Date();
    const analyticsData = {
      ...eventData,
      timestamp: eventData.timestamp || now,
      dateOnly: eventData.dateOnly || now.toISOString().split('T')[0],
      hourOnly: eventData.hourOnly || now.toISOString().split('T')[0] + '-' + now.getHours().toString().padStart(2, '0')
    };
    
    await Analytics.create(analyticsData);
    return { success: true, eventId: analyticsData._id };
  } catch (error) {
    console.error('Event tracking error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  analyticsMiddleware,
  trackPageView,
  trackEvent
};