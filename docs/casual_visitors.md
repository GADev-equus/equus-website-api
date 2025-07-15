# Analytics System Implementation Plan

## Overview
Implement a comprehensive web analytics system for the Equus website API, focusing on traffic metrics, engagement indicators, and acquisition data.

## Database Models (3 new models)

### 1. `models/AnalyticsEvent.js`
Raw event tracking model for all user interactions:
- **Fields**: sessionId, visitorId, eventType, pageUrl, referrer, timestamp, userAgent, ipAddress, deviceInfo, geolocation
- **Event Types**: page_view, session_start, session_end, click, scroll, form_submit
- **Indexing**: sessionId, visitorId, eventType, timestamp, pageUrl

### 2. `models/Session.js` 
Session management and tracking:
- **Fields**: sessionId, visitorId, startTime, endTime, pageViews, isActive, lastActivity, entryPage, exitPage, duration
- **Methods**: extendSession(), endSession(), calculateDuration()
- **Indexing**: sessionId, visitorId, startTime, isActive

### 3. `models/AnalyticsAggregate.js`
Aggregated analytics data for reporting:
- **Fields**: date, totalPageViews, uniqueVisitors, totalSessions, avgSessionDuration, bounceRate, topPages, topReferrers, deviceBreakdown
- **Aggregation levels**: daily, weekly, monthly
- **Indexing**: date, aggregationType

## Controllers & Endpoints

### 1. `controllers/analyticsController.js`
**Tracking Endpoints:**
- `POST /api/analytics/track` - Track any analytics event
- `POST /api/analytics/page-view` - Track page views specifically
- `POST /api/analytics/session` - Start/extend sessions

**Reporting Endpoints:**
- `GET /api/analytics/overview` - Basic metrics dashboard
- `GET /api/analytics/traffic` - Traffic metrics (A)
- `GET /api/analytics/engagement` - Engagement metrics (B)  
- `GET /api/analytics/acquisition` - Acquisition metrics (C)
- `GET /api/analytics/aggregate` - Get aggregated data by date range

### 2. Route Integration
- `routes/analyticsRoutes.js` - All analytics endpoints
- Update `server.js` to include: `app.use('/api/analytics', analyticsRoutes)`

## Utility Functions

### 1. `utils/analyticsService.js`
- **Session Management**: createSession(), extendSession(), endSession()
- **Visitor Identification**: generateVisitorId() using IP + User-Agent fingerprinting
- **Device Detection**: parseUserAgent(), detectDevice(), detectBrowser()
- **Geolocation**: getLocationFromIP() (basic country/region)

### 2. `utils/aggregationService.js`
- **Data Aggregation**: aggregateDaily(), aggregateWeekly(), aggregateMonthly()
- **Metrics Calculation**: calculateBounceRate(), calculateAvgSessionDuration()
- **Report Generation**: generateTrafficReport(), generateEngagementReport()

## Key Features

### A. Basic Traffic Metrics
- **Page Views**: Count all page view events, deduplicated appropriately
- **Unique Visitors**: Track using IP + User-Agent fingerprint combination
- **Sessions**: 30-minute timeout-based session management

### B. Engagement Indicators  
- **Bounce Rate**: Sessions with only 1 page view / total sessions
- **Time on Page**: Calculate from consecutive page view timestamps
- **Pages per Session**: Average page views per session
- **Click Patterns**: Track click events and user journey paths

### C. Acquisition Metrics
- **Traffic Sources**: Extract and categorize referrer URLs
- **Device/Browser**: Parse User-Agent for device and browser info
- **Geolocation**: Basic IP-to-location mapping for country/region
- **Session Frequency**: Track new vs returning visitors

## Data Flow
1. **Real-time Tracking**: Frontend calls track endpoints → Store raw events
2. **Session Management**: Automatic session creation/extension on events
3. **Periodic Aggregation**: Daily cron job to generate aggregate reports
4. **Reporting**: API endpoints serve aggregated data for dashboards

## Implementation Benefits
- **Scalable**: Raw events + aggregated data approach
- **Privacy-Focused**: IP + User-Agent fingerprinting (no persistent cookies)
- **Comprehensive**: Covers all requested metrics (A, B, C)
- **API-First**: Clean separation of concerns, ready for multiple frontends
- **MongoDB Optimized**: Proper indexing and aggregation pipeline usage

## Detailed Implementation Specifications

### Database Schema Details

#### AnalyticsEvent Model
```javascript
{
  sessionId: String (required, indexed),
  visitorId: String (required, indexed),
  eventType: String (required, enum: ['page_view', 'session_start', 'session_end', 'click', 'scroll', 'form_submit']),
  pageUrl: String (required, indexed),
  referrer: String,
  timestamp: Date (required, indexed, default: Date.now),
  userAgent: String,
  ipAddress: String (required),
  deviceInfo: {
    type: String, // mobile, tablet, desktop
    browser: String,
    os: String,
    screenResolution: String
  },
  geolocation: {
    country: String,
    region: String,
    city: String
  },
  metadata: {
    scrollDepth: Number,
    clickPosition: { x: Number, y: Number },
    formFields: [String]
  }
}
```

#### Session Model
```javascript
{
  sessionId: String (required, unique, indexed),
  visitorId: String (required, indexed),
  startTime: Date (required, indexed),
  endTime: Date,
  pageViews: Number (default: 0),
  isActive: Boolean (default: true, indexed),
  lastActivity: Date (required),
  entryPage: String,
  exitPage: String,
  duration: Number, // in milliseconds
  totalClicks: Number (default: 0),
  totalScrolls: Number (default: 0),
  ipAddress: String,
  userAgent: String
}
```

#### AnalyticsAggregate Model
```javascript
{
  date: Date (required, indexed),
  aggregationType: String (required, enum: ['daily', 'weekly', 'monthly']),
  totalPageViews: Number (default: 0),
  uniqueVisitors: Number (default: 0),
  totalSessions: Number (default: 0),
  avgSessionDuration: Number (default: 0),
  bounceRate: Number (default: 0),
  topPages: [{
    url: String,
    views: Number,
    uniqueVisitors: Number
  }],
  topReferrers: [{
    domain: String,
    visits: Number,
    percentage: Number
  }],
  deviceBreakdown: {
    desktop: Number,
    mobile: Number,
    tablet: Number
  },
  browserBreakdown: [{
    browser: String,
    percentage: Number
  }],
  geolocationBreakdown: [{
    country: String,
    visits: Number,
    percentage: Number
  }]
}
```

### API Endpoint Specifications

#### Tracking Endpoints

**POST /api/analytics/track**
```javascript
// Request Body
{
  eventType: 'page_view' | 'click' | 'scroll' | 'form_submit',
  pageUrl: string,
  referrer?: string,
  sessionId?: string,
  metadata?: object
}

// Response
{
  success: boolean,
  sessionId: string,
  visitorId: string,
  eventId: string
}
```

**POST /api/analytics/page-view**
```javascript
// Request Body
{
  pageUrl: string,
  referrer?: string,
  sessionId?: string,
  title?: string
}

// Response
{
  success: boolean,
  sessionId: string,
  visitorId: string,
  isNewSession: boolean
}
```

**POST /api/analytics/session**
```javascript
// Request Body
{
  action: 'start' | 'extend' | 'end',
  sessionId?: string,
  pageUrl?: string
}

// Response
{
  success: boolean,
  sessionId: string,
  visitorId: string,
  sessionDuration?: number
}
```

#### Reporting Endpoints

**GET /api/analytics/overview**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31&granularity=daily

// Response
{
  success: boolean,
  data: {
    totalPageViews: number,
    uniqueVisitors: number,
    totalSessions: number,
    avgSessionDuration: number,
    bounceRate: number,
    growthMetrics: {
      pageViewsGrowth: number,
      visitorsGrowth: number,
      sessionsGrowth: number
    }
  }
}
```

**GET /api/analytics/traffic**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31&groupBy=day

// Response
{
  success: boolean,
  data: {
    pageViews: [{
      date: string,
      count: number
    }],
    uniqueVisitors: [{
      date: string,
      count: number
    }],
    sessions: [{
      date: string,
      count: number
    }],
    topPages: [{
      url: string,
      views: number,
      uniqueVisitors: number
    }]
  }
}
```

**GET /api/analytics/engagement**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31

// Response
{
  success: boolean,
  data: {
    bounceRate: number,
    avgTimeOnPage: number,
    avgPagesPerSession: number,
    sessionDurationDistribution: [{
      range: string, // "0-30s", "30s-1m", etc.
      count: number,
      percentage: number
    }],
    clickPatterns: [{
      page: string,
      clicks: number,
      heatmapData: [{ x: number, y: number, intensity: number }]
    }],
    pathAnalysis: [{
      path: [string], // sequence of pages
      frequency: number,
      averageDuration: number
    }]
  }
}
```

**GET /api/analytics/acquisition**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31

// Response
{
  success: boolean,
  data: {
    trafficSources: [{
      source: string,
      visits: number,
      percentage: number,
      category: 'direct' | 'referral' | 'search' | 'social'
    }],
    deviceBreakdown: {
      desktop: { count: number, percentage: number },
      mobile: { count: number, percentage: number },
      tablet: { count: number, percentage: number }
    },
    browserBreakdown: [{
      browser: string,
      count: number,
      percentage: number
    }],
    geolocation: [{
      country: string,
      visits: number,
      percentage: number
    }],
    sessionFrequency: {
      newVisitors: number,
      returningVisitors: number,
      newVisitorPercentage: number
    }
  }
}
```

### Utility Service Functions

#### analyticsService.js Functions

**Session Management**
```javascript
createSession(visitorId, pageUrl, ipAddress, userAgent)
extendSession(sessionId, pageUrl)
endSession(sessionId)
getActiveSession(visitorId)
```

**Visitor Identification**
```javascript
generateVisitorId(ipAddress, userAgent) // Creates consistent fingerprint
isNewVisitor(visitorId)
getVisitorHistory(visitorId)
```

**Device Detection**
```javascript
parseUserAgent(userAgent)
detectDevice(userAgent) // mobile, tablet, desktop
detectBrowser(userAgent)
detectOS(userAgent)
```

**Geolocation**
```javascript
getLocationFromIP(ipAddress) // Basic country/region lookup
categorizeTrafficSource(referrer)
```

#### aggregationService.js Functions

**Data Aggregation**
```javascript
aggregateDaily(date)
aggregateWeekly(startDate)
aggregateMonthly(year, month)
runAggregation(type, date)
```

**Metrics Calculation**
```javascript
calculateBounceRate(sessions)
calculateAvgSessionDuration(sessions)
calculatePageViewsPerSession(sessions)
calculateTopPages(events, limit)
calculateTopReferrers(sessions, limit)
```

**Report Generation**
```javascript
generateTrafficReport(startDate, endDate, granularity)
generateEngagementReport(startDate, endDate)
generateAcquisitionReport(startDate, endDate)
```

## Implementation Priority

### Phase 1: Core Infrastructure
1. Create database models (AnalyticsEvent, Session, AnalyticsAggregate)
2. Implement basic analyticsService.js functions
3. Create basic tracking endpoints (track, page-view, session)

### Phase 2: Reporting System
1. Implement aggregationService.js
2. Create reporting endpoints (overview, traffic, engagement, acquisition)
3. Add data aggregation scheduling

### Phase 3: Advanced Features
1. Path analysis and click patterns
2. Enhanced geolocation
3. Performance optimization
4. Advanced filtering and segmentation

## Security Considerations

1. **IP Address Handling**: Hash IP addresses for privacy
2. **Rate Limiting**: Implement rate limiting on tracking endpoints
3. **Data Validation**: Sanitize all input data
4. **CORS**: Configure proper CORS for tracking endpoints
5. **Data Retention**: Implement configurable data retention policies

## Performance Optimizations

1. **Indexing**: Proper MongoDB indexing for time-based queries
2. **Aggregation Pipeline**: Use MongoDB aggregation for complex queries
3. **Caching**: Cache frequent queries and aggregated data
4. **Batch Processing**: Process events in batches for better performance
5. **Connection Pooling**: Optimize database connections

## Testing Strategy

1. **Unit Tests**: Test individual functions and models
2. **Integration Tests**: Test API endpoints and data flow
3. **Load Testing**: Test tracking endpoints under load
4. **Data Integrity**: Verify aggregation accuracy
5. **Performance Tests**: Test query performance with large datasets

## Monitoring and Maintenance

1. **Health Checks**: Include analytics service in health endpoints
2. **Logging**: Comprehensive logging for tracking and errors
3. **Metrics**: Monitor API performance and usage
4. **Alerts**: Set up alerts for service failures
5. **Backup**: Regular backup of analytics data

This implementation provides a comprehensive, scalable analytics system that captures all requested metrics while maintaining performance and privacy considerations.