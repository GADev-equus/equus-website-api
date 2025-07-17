# Page Views and Analytics Tracking System

## Overview

This document outlines the implementation of a comprehensive page views and analytics tracking system for the Equus website. The system will track page hits, user interactions, and provide analytics insights for both casual visitors and registered users.

## Current State

**Status: NOT IMPLEMENTED**

The current codebase has:
- Complete user authentication system with JWT tokens
- Role-based access control (user/admin roles)
- User activity tracking (login events, IP addresses)
- Contact form submissions tracking
- Rate limiting violation logging
- Comprehensive user analytics planning documents
- No page view tracking or general website analytics

## Alignment with Existing System

This page views system is designed to integrate seamlessly with:

### **Existing Authentication System**
- Uses existing JWT authentication patterns
- Leverages `optionalAuth` middleware for user identification
- Aligns with current user role system (admin access to analytics)
- Integrates with existing User model and permissions

### **Existing Analytics Planning**
- Complements the comprehensive analytics plans in `casual_visitors.md` and `registered_visitors.md`
- Focuses specifically on page hit tracking as foundation for broader analytics
- Uses similar database patterns and API endpoint structures
- Provides base data for future user engagement and retention analytics

### **Current Database Patterns**
- Follows existing Mongoose schema conventions
- Uses MongoDB ObjectId references for user linkage
- Implements proper indexing patterns like existing models
- Aligns with current timestamp and metadata patterns

## Implementation Plan

### Phase 1: Documentation ✅
- [x] Create this documentation file
- [ ] Review existing analytics planning documents
- [ ] Align with existing user management system

### Phase 2: Backend Implementation

#### 2.1 Analytics Model
**File:** `/api/models/Analytics.js`

```javascript
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Page Information
  path: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for anonymous users
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Request Information
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  referer: {
    type: String,
    default: null
  },
  
  // Response Information
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number, // in milliseconds
    required: true
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Aggregation helpers
  dateOnly: {
    type: String, // YYYY-MM-DD format
    required: true,
    index: true
  },
  hourOnly: {
    type: String, // YYYY-MM-DD-HH format
    required: true,
    index: true
  }
});

// Indexes for performance
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ path: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ dateOnly: 1 });
analyticsSchema.index({ hourOnly: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
```

#### 2.2 Analytics Middleware
**File:** `/api/middleware/analytics.js`

```javascript
const Analytics = require('../models/Analytics');
const { optionalAuth } = require('./auth');
const { v4: uuidv4 } = require('uuid');

// Use existing optionalAuth middleware for user identification
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
    
    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Skip analytics tracking for certain paths
      const skipPaths = ['/favicon.ico', '/robots.txt', '/api/analytics', '/health'];
      if (!skipPaths.includes(req.path) && !req.path.startsWith('/api/analytics/')) {
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
        
        // Save analytics data (fire and forget)
        Analytics.create(analyticsData).catch(error => {
          console.error('Analytics tracking error:', error.message);
        });
      }
      
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  }
];

module.exports = analyticsMiddleware;
```

#### 2.3 Analytics Controller
**File:** `/api/controllers/analyticsController.js`

```javascript
const Analytics = require('../models/Analytics');

const analyticsController = {
  // Get general analytics overview
  async getOverview(req, res) {
    try {
      const { period = '7d' } = req.query;
      const startDate = getStartDate(period);
      
      const [
        totalPageViews,
        uniqueVisitors,
        topPages,
        trafficByHour
      ] = await Promise.all([
        Analytics.countDocuments({ timestamp: { $gte: startDate } }),
        Analytics.distinct('sessionId', { timestamp: { $gte: startDate } }),
        Analytics.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: { _id: '$path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        Analytics.aggregate([
          { $match: { timestamp: { $gte: startDate } } },
          { $group: { _id: '$hourOnly', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      ]);
      
      res.json({
        success: true,
        data: {
          totalPageViews,
          uniqueVisitors: uniqueVisitors.length,
          topPages,
          trafficByHour
        }
      });
    } catch (error) {
      console.error('Analytics overview error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics overview'
      });
    }
  },
  
  // Get traffic analytics
  async getTrafficAnalytics(req, res) {
    try {
      const { period = '7d' } = req.query;
      const startDate = getStartDate(period);
      
      const trafficData = await Analytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: '$dateOnly',
            pageViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$sessionId' },
            registeredUsers: {
              $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            date: '$_id',
            pageViews: 1,
            uniqueVisitors: { $size: '$uniqueVisitors' },
            registeredUsers: 1
          }
        },
        { $sort: { date: 1 } }
      ]);
      
      res.json({
        success: true,
        data: trafficData
      });
    } catch (error) {
      console.error('Traffic analytics error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch traffic analytics'
      });
    }
  },
  
  // Get page performance analytics
  async getPagePerformance(req, res) {
    try {
      const { period = '7d' } = req.query;
      const startDate = getStartDate(period);
      
      const performanceData = await Analytics.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: '$path',
            avgResponseTime: { $avg: '$responseTime' },
            totalViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$sessionId' }
          }
        },
        {
          $project: {
            path: '$_id',
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            totalViews: 1,
            uniqueVisitors: { $size: '$uniqueVisitors' }
          }
        },
        { $sort: { totalViews: -1 } }
      ]);
      
      res.json({
        success: true,
        data: performanceData
      });
    } catch (error) {
      console.error('Page performance analytics error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch page performance analytics'
      });
    }
  }
};

function getStartDate(period) {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

module.exports = analyticsController;
```

#### 2.4 Analytics Routes
**File:** `/api/routes/analyticsRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// All analytics routes require admin role (using existing auth patterns)
router.use(auth);
router.use(requireRole('admin'));

// Analytics endpoints
router.get('/overview', analyticsController.getOverview);
router.get('/traffic', analyticsController.getTrafficAnalytics);
router.get('/performance', analyticsController.getPagePerformance);

module.exports = router;
```

### Phase 3: Frontend Integration

#### 3.1 Analytics Service
**File:** `/client/src/services/analyticsService.js`

```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const analyticsService = {
  // Get analytics overview
  async getOverview(period = '7d') {
    const response = await axios.get(`${API_URL}/api/analytics/overview?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },
  
  // Get traffic analytics
  async getTrafficAnalytics(period = '7d') {
    const response = await axios.get(`${API_URL}/api/analytics/traffic?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  },
  
  // Get page performance analytics
  async getPagePerformance(period = '7d') {
    const response = await axios.get(`${API_URL}/api/analytics/performance?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  }
};

export default analyticsService;
```

#### 3.2 Analytics Dashboard Component
**File:** `/client/src/pages/admin/PageViews.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';

const PageViews = () => {
  const [period, setPeriod] = useState('7d');
  const [overview, setOverview] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchAnalytics();
  }, [period]);
  
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewData, trafficData, performanceData] = await Promise.all([
        analyticsService.getOverview(period),
        analyticsService.getTrafficAnalytics(period),
        analyticsService.getPagePerformance(period)
      ]);
      
      setOverview(overviewData.data);
      setTraffic(trafficData.data);
      setPerformance(performanceData.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div className="analytics-dashboard">
      <h1>Page Views Analytics</h1>
      
      <div className="period-selector">
        <label>Period: </label>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>
      
      {overview && (
        <div className="overview-cards">
          <div className="card">
            <h3>Total Page Views</h3>
            <p>{overview.totalPageViews}</p>
          </div>
          <div className="card">
            <h3>Unique Visitors</h3>
            <p>{overview.uniqueVisitors}</p>
          </div>
        </div>
      )}
      
      <div className="analytics-sections">
        <div className="top-pages">
          <h3>Top Pages</h3>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {overview?.topPages.map((page, index) => (
                <tr key={index}>
                  <td>{page._id}</td>
                  <td>{page.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="page-performance">
          <h3>Page Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Views</th>
                <th>Avg Response Time</th>
                <th>Unique Visitors</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((page, index) => (
                <tr key={index}>
                  <td>{page.path}</td>
                  <td>{page.totalViews}</td>
                  <td>{page.avgResponseTime}ms</td>
                  <td>{page.uniqueVisitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageViews;
```

### Phase 4: Integration Steps

#### 4.1 Server Integration
1. Add analytics middleware to main server file (after existing auth setup)
2. Add analytics routes to server (following existing route patterns)
3. Integrate with existing middleware stack order

**Server.js Integration:**
```javascript
// Add after existing middleware, before routes
app.use(analyticsMiddleware);

// Add analytics routes
app.use('/api/analytics', analyticsRoutes);
```

#### 4.2 Frontend Integration
1. Add analytics page to admin navigation (following existing admin patterns)
2. Update admin routes to include analytics (using existing role-based routing)
3. Add analytics dashboard to admin panel (consistent with existing admin UI)

### Phase 5: Testing & Optimization

#### 5.1 Testing Checklist
- [ ] Page views are tracked correctly
- [ ] User sessions are tracked properly
- [ ] Response times are measured accurately
- [ ] Analytics data is aggregated correctly
- [ ] Admin dashboard displays data properly
- [ ] Performance impact is minimal

#### 5.2 Optimization Considerations
- Index optimization for query performance
- Data retention policies (archive old data)
- Batch analytics processing for high traffic
- Caching for frequently accessed analytics

## Security Considerations

1. **Privacy**: No sensitive user data in analytics
2. **Access Control**: Analytics only accessible to admin users
3. **Data Retention**: Implement data retention policies
4. **IP Anonymization**: Consider IP anonymization for privacy
5. **Performance**: Ensure analytics don't impact site performance

## Performance Considerations

1. **Indexes**: Proper database indexes for query performance
2. **Aggregation**: Pre-aggregate data for faster queries
3. **Caching**: Cache frequently accessed analytics data
4. **Async Processing**: Analytics tracking should be non-blocking

## Dependencies

### Backend
- mongoose (already installed)
- uuid (for session ID generation)

**Note:** No additional dependencies required - leverages existing authentication and middleware systems.

### Frontend
- axios (already installed)
- chart.js or similar (for data visualization)

## Database Schema

The analytics system will use MongoDB collections:

1. **analytics** - Raw analytics data
2. **analytics_daily** - Daily aggregated data (future optimization)
3. **analytics_sessions** - Session tracking data (future enhancement)

## API Endpoints

### Admin Analytics Endpoints
- `GET /api/analytics/overview?period=7d` - Overview statistics
- `GET /api/analytics/traffic?period=7d` - Traffic analytics
- `GET /api/analytics/performance?period=7d` - Page performance

## Integration with Existing System

The analytics system will integrate seamlessly with:

### **Authentication & Authorization**
- Uses existing `optionalAuth` middleware for user identification
- Leverages existing `auth` and `requireRole('admin')` for analytics access
- Integrates with current JWT token system
- Respects existing user roles and permissions

### **Database Integration**
- Uses existing MongoDB connection and Mongoose patterns
- Follows existing schema conventions (timestamps, indexing)
- References existing User model with ObjectId
- Maintains consistency with existing models

### **Server Architecture**
- Integrates with existing middleware stack order
- Uses existing trust proxy configuration for IP addresses
- Follows existing error handling patterns
- Maintains existing CORS and security configurations

### **Frontend Integration**
- Uses existing admin dashboard patterns
- Follows existing React component structure
- Integrates with existing authentication service
- Maintains consistency with existing admin UI/UX

## Future Enhancements

### **Integration with Planned Analytics System**
1. **Foundation for Advanced Analytics**: This page views system provides the base data layer for the comprehensive analytics planned in `casual_visitors.md` and `registered_visitors.md`
2. **User Behavior Tracking**: Extend to track user journeys and engagement patterns
3. **Cohort Analysis**: Build on user data for retention and engagement analytics
4. **Conversion Funnel Analysis**: Track user progression through site features

### **Technical Enhancements**
1. Real-time analytics with WebSockets
2. Advanced filtering and segmentation
3. Export functionality for analytics data
4. Email reports for administrators
5. Integration with third-party analytics services
6. User behavior tracking and heatmaps
7. A/B testing framework integration

### **Performance & Scale**
1. Data archiving and retention policies
2. Advanced caching strategies
3. Analytics data aggregation optimization
4. Real-time dashboard updates

## Conclusion

This page views analytics system provides a solid foundation for website traffic analysis while maintaining perfect alignment with the existing codebase architecture. The system:

- **Leverages existing authentication and authorization patterns**
- **Integrates seamlessly with current middleware stack**
- **Follows established database and API conventions**
- **Provides foundation for future advanced analytics features**
- **Maintains security and performance standards**

The implementation respects all existing patterns while providing immediate value through page hit tracking and establishing the groundwork for the comprehensive analytics system outlined in the existing planning documents.