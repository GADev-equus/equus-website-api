const Analytics = require('../models/Analytics');

const analyticsController = {
  // Get general analytics overview
  async getOverview(req, res) {
    try {
      const { period = '7d' } = req.query;
      const { startDate, endDate } = getDateRange(period);

      const [
        totalPageViews,
        uniqueVisitors,
        authenticatedPageViews,
        topPages,
        trafficByHour,
        statusCodeStats,
      ] = await Promise.all([
        Analytics.getPageViews(startDate, endDate),
        Analytics.getUniqueVisitors(startDate, endDate),
        Analytics.getPageViews(startDate, endDate, { userId: { $ne: null } }),
        Analytics.getTopPages(startDate, endDate, 10),
        Analytics.getTrafficByPeriod(startDate, endDate, 'hourly'),
        Analytics.aggregate([
          { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: '$statusCode', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

      // Calculate unique visitors count
      const uniqueVisitorsCount = Array.isArray(uniqueVisitors)
        ? uniqueVisitors.length
        : uniqueVisitors;

      // Calculate average response time
      const avgResponseTime = await Analytics.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, avgResponseTime: { $avg: '$responseTime' } } },
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalPageViews,
          uniqueVisitors: uniqueVisitorsCount,
          authenticatedPageViews,
          averageResponseTime:
            avgResponseTime.length > 0
              ? Math.round(avgResponseTime[0].avgResponseTime)
              : 0,
          topPages,
          trafficByHour,
          statusCodeStats,
          period: {
            start: startDate,
            end: endDate,
            period,
          },
        },
      });
    } catch (error) {
      console.error('Analytics overview error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to fetch analytics overview',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Get traffic analytics with time-based data
  async getTrafficAnalytics(req, res) {
    try {
      const { period = '7d', granularity = 'daily' } = req.query;
      const { startDate, endDate } = getDateRange(period);

      const [trafficData, userTypeBreakdown, methodBreakdown, referrerStats] =
        await Promise.all([
          Analytics.getTrafficByPeriod(startDate, endDate, granularity),
          Analytics.aggregate([
            { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
            {
              $group: {
                _id: {
                  $cond: [
                    { $ne: ['$userId', null] },
                    'authenticated',
                    'anonymous',
                  ],
                },
                count: { $sum: 1 },
                uniqueVisitors: { $addToSet: '$sessionId' },
              },
            },
            {
              $project: {
                userType: '$_id',
                count: 1,
                uniqueVisitors: { $size: '$uniqueVisitors' },
              },
            },
          ]),
          Analytics.aggregate([
            { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: '$method', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          Analytics.aggregate([
            {
              $match: {
                timestamp: { $gte: startDate, $lte: endDate },
                referer: { $ne: null, $ne: '' },
              },
            },
            {
              $group: {
                _id: '$referer',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ]),
        ]);

      res.status(200).json({
        success: true,
        data: {
          trafficData,
          userTypeBreakdown,
          methodBreakdown,
          referrerStats,
          period: {
            start: startDate,
            end: endDate,
            period,
            granularity,
          },
        },
      });
    } catch (error) {
      console.error('Traffic analytics error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to fetch traffic analytics',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Get page performance analytics
  async getPagePerformance(req, res) {
    try {
      const { period = '7d', sortBy = 'totalViews', limit = 20 } = req.query;
      const { startDate, endDate } = getDateRange(period);

      const performanceData = await Analytics.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: '$path',
            totalViews: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$sessionId' },
            avgResponseTime: { $avg: '$responseTime' },
            minResponseTime: { $min: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            authenticatedViews: {
              $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] },
            },
            errorCount: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            path: '$_id',
            totalViews: 1,
            uniqueVisitors: { $size: '$uniqueVisitors' },
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            minResponseTime: 1,
            maxResponseTime: 1,
            authenticatedViews: 1,
            errorCount: 1,
            errorRate: {
              $round: [
                {
                  $multiply: [{ $divide: ['$errorCount', '$totalViews'] }, 100],
                },
                2,
              ],
            },
          },
        },
        { $sort: { [sortBy]: -1 } },
        { $limit: parseInt(limit) },
      ]);

      // Get overall performance stats
      const overallStats = await Analytics.aggregate([
        { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            avgResponseTime: { $avg: '$responseTime' },
            slowRequests: {
              $sum: { $cond: [{ $gt: ['$responseTime', 1000] }, 1, 0] },
            },
            errorRequests: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            totalRequests: 1,
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            slowRequestsPercentage: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$slowRequests', '$totalRequests'] },
                    100,
                  ],
                },
                2,
              ],
            },
            errorRate: {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$errorRequests', '$totalRequests'] },
                    100,
                  ],
                },
                2,
              ],
            },
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          performanceData,
          overallStats: overallStats[0] || {},
          period: {
            start: startDate,
            end: endDate,
            period,
          },
        },
      });
    } catch (error) {
      console.error('Page performance analytics error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to fetch page performance analytics',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Get user analytics (authenticated users only)
  async getUserAnalytics(req, res) {
    try {
      const { period = '7d' } = req.query;
      const { startDate, endDate } = getDateRange(period);

      const userAnalytics = await Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            userId: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$userId',
            totalViews: { $sum: 1 },
            uniqueSessions: { $addToSet: '$sessionId' },
            avgResponseTime: { $avg: '$responseTime' },
            lastActivity: { $max: '$timestamp' },
            firstActivity: { $min: '$timestamp' },
            pagesVisited: { $addToSet: '$path' },
          },
        },
        {
          $project: {
            userId: '$_id',
            totalViews: 1,
            uniqueSessions: { $size: '$uniqueSessions' },
            avgResponseTime: { $round: ['$avgResponseTime', 2] },
            lastActivity: 1,
            firstActivity: 1,
            pagesVisited: { $size: '$pagesVisited' },
            sessionDuration: {
              $divide: [
                { $subtract: ['$lastActivity', '$firstActivity'] },
                60000,
              ],
            },
          },
        },
        { $sort: { totalViews: -1 } },
        { $limit: 50 },
      ]);

      // Get user activity summary
      const activitySummary = await Analytics.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            userId: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            totalAuthenticatedViews: { $sum: 1 },
            uniqueAuthenticatedUsers: { $addToSet: '$userId' },
            avgViewsPerUser: { $avg: 1 },
          },
        },
        {
          $project: {
            totalAuthenticatedViews: 1,
            uniqueAuthenticatedUsers: { $size: '$uniqueAuthenticatedUsers' },
            avgViewsPerUser: { $round: ['$avgViewsPerUser', 2] },
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          userAnalytics,
          activitySummary: activitySummary[0] || {},
          period: {
            start: startDate,
            end: endDate,
            period,
          },
        },
      });
    } catch (error) {
      console.error('User analytics error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to fetch user analytics',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  // Public endpoint for page views count (no authentication required)
  async getPublicPageViews(req, res) {
    try {
      const { period = '30d' } = req.query;
      const { startDate, endDate } = getDateRange(period);

      const totalPageViews = await Analytics.getPageViews(startDate, endDate);

      res.status(200).json({
        success: true,
        data: {
          totalPageViews,
          period: {
            start: startDate,
            end: endDate,
            range: period,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Public page views error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch page views',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Internal server error',
      });
    }
  },

  // Client-side tracking endpoint for SPA page views
  async trackClientEvent(req, res) {
    try {
      const {
        path,
        method = 'GET',
        userId = null,
        sessionId,
        userAgent,
        referer = null,
        timestamp,
        clientTracked = true,
      } = req.body;

      // Validate required fields
      if (!path || !sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Path and sessionId are required',
        });
      }

      // Create analytics record
      const now = timestamp ? new Date(timestamp) : new Date();
      const analyticsData = {
        path,
        method,
        userId,
        sessionId,
        ipAddress: req.ip,
        userAgent: userAgent || req.get('User-Agent') || 'Unknown',
        referer,
        statusCode: 200, // Assume success for client-tracked views
        responseTime: 0, // Not applicable for client-tracked views
        timestamp: now,
        dateOnly: now.toISOString().split('T')[0],
        hourOnly:
          now.toISOString().split('T')[0] +
          '-' +
          now.getHours().toString().padStart(2, '0'),
        clientTracked,
      };

      // Save analytics data
      await Analytics.create(analyticsData);

      res.status(200).json({
        success: true,
        message: 'Analytics event tracked successfully',
      });
    } catch (error) {
      console.error('Client analytics tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track analytics event',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Internal server error',
      });
    }
  },
};

// Helper function to get date range based on period
function getDateRange(period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate: now };
}

module.exports = analyticsController;
