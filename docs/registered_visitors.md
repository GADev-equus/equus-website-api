# Registered User Analytics System Implementation Plan

## Overview
Implement a comprehensive registered user analytics system that tracks user behavior, engagement, onboarding, retention, and referral metrics. This requires building both the user authentication system and the analytics layer.

## Core User System (Foundation)

### 1. `models/User.js`
Complete user model with authentication and tracking fields:
- **Auth Fields**: email, password, emailVerified, verificationToken, resetToken
- **Profile Fields**: firstName, lastName, username, avatar, bio, preferences
- **Tracking Fields**: registrationDate, lastLoginDate, loginCount, activationDate, referredBy
- **Status Fields**: isActive, accountStatus, subscriptionTier

### 2. `models/UserSession.js`
User session tracking (extends analytics sessions):
- **Fields**: userId, sessionId, loginTime, logoutTime, ipAddress, userAgent, deviceInfo
- **Methods**: Track login/logout events, device fingerprinting

## Analytics Models (4 new models)

### 3. `models/UserActivity.js`
Daily user activity tracking:
- **Fields**: userId, date, loginCount, sessionDuration, pageViews, actionsPerformed
- **Activity Types**: login, profile_update, content_create, content_view, search, etc.

### 4. `models/UserOnboarding.js`
Onboarding and activation tracking:
- **Fields**: userId, onboardingStage, completedSteps, timeToActivation, firstKeyAction
- **Key Actions**: profile_complete, first_post, first_connection, etc.

### 5. `models/UserRetention.js`
Retention and churn analysis:
- **Fields**: userId, cohortDate, retentionPeriod, isActive, lastActivityDate, churnPrediction
- **Metrics**: D1/D7/D30 retention, engagement scores

### 6. `models/UserReferral.js`
Referral and viral metrics:
- **Fields**: referrerId, referredUserId, referralCode, conversionDate, referralChannel
- **Tracking**: Invitation flow, conversion rates, viral coefficients

## Controllers & Endpoints

### 1. `controllers/userAnalyticsController.js`
**Activity & Engagement (A):**
- `GET /api/user-analytics/activity` - DAU/MAU metrics
- `GET /api/user-analytics/engagement` - User engagement patterns
- `GET /api/user-analytics/cohort-analysis` - Cohort-based analysis

**Onboarding (B):**
- `GET /api/user-analytics/onboarding` - Activation rates and funnel
- `GET /api/user-analytics/activation-metrics` - Time to first key action

**Retention & Churn (C):**
- `GET /api/user-analytics/retention` - Retention rates and curves
- `GET /api/user-analytics/churn` - Churn analysis and prediction

**Referral & Viral (D):**
- `GET /api/user-analytics/referral` - Referral metrics and conversion
- `GET /api/user-analytics/viral` - Viral coefficients and growth

### 2. `controllers/userController.js`
User management with analytics integration:
- `POST /api/users/register` - User registration with tracking
- `POST /api/users/login` - Login with activity tracking
- `PUT /api/users/profile` - Profile updates with onboarding tracking

## Utility Services

### 1. `utils/userAnalyticsService.js`
- **Activity Tracking**: trackUserActivity(), calculateDAU(), calculateMAU()
- **Engagement Scoring**: calculateEngagementScore(), identifyPowerUsers()
- **Cohort Analysis**: generateCohortData(), calculateRetentionRates()

### 2. `utils/onboardingService.js`
- **Onboarding Tracking**: trackOnboardingStep(), calculateActivationRate()
- **Key Action Detection**: detectFirstKeyAction(), measureTimeToValue()

### 3. `utils/retentionService.js`
- **Retention Analysis**: calculateRetentionCurve(), identifyChurnRisk()
- **Churn Prediction**: predictChurnProbability(), segmentUsers()

### 4. `utils/referralService.js`
- **Referral Tracking**: trackReferral(), calculateViralCoefficient()
- **Conversion Analysis**: measureReferralConversion(), identifyTopReferrers()

## Key Metrics Implementation

### A. User Activity & Engagement
- **Daily Active Users (DAU)**: Unique users with activity in 24h
- **Monthly Active Users (MAU)**: Unique users with activity in 30 days
- **Engagement Score**: Composite score based on login frequency, session duration, actions
- **Feature Adoption**: Track usage of specific features over time

### B. Onboarding & Activation
- **Activation Rate**: % of users completing key onboarding steps
- **Time to First Key Action**: Average time from registration to first meaningful action
- **Onboarding Funnel**: Step-by-step completion rates
- **Activation Cohorts**: Track activation by registration date

### C. Retention & Churn
- **Retention Curves**: D1, D7, D30, D90 retention rates
- **Cohort Retention**: Retention by registration cohort
- **Churn Rate**: % of users who become inactive
- **Churn Prediction**: ML-based churn risk scoring

### D. Referral & Viral
- **Referral Conversion Rate**: % of invitations that result in registrations
- **Viral Coefficient**: Average invitations per user × conversion rate
- **Referral Channel Performance**: Track performance by referral source
- **Network Effects**: Measure user growth from referrals

## Implementation Priority

### Phase 1: User Foundation
1. Implement User and UserSession models
2. Create authentication system with analytics hooks
3. Basic activity tracking for login/logout events

### Phase 2: Core Analytics Models
1. Implement UserActivity, UserOnboarding, UserRetention, UserReferral models
2. Create basic tracking endpoints and services
3. Implement DAU/MAU calculation

### Phase 3: Advanced Analytics
1. Build comprehensive reporting endpoints
2. Implement cohort analysis and retention curves
3. Add churn prediction and referral tracking

### Phase 4: Optimization
1. Add real-time dashboards
2. Implement automated alerts for key metrics
3. Advanced segmentation and personalization

## Detailed Implementation Specifications

### Database Schema Details

#### User Model
```javascript
{
  // Authentication
  email: String (required, unique, indexed),
  password: String (required, hashed),
  emailVerified: Boolean (default: false),
  verificationToken: String,
  resetToken: String,
  resetTokenExpiry: Date,
  
  // Profile
  firstName: String (required),
  lastName: String (required),
  username: String (unique, indexed),
  avatar: String,
  bio: String,
  dateOfBirth: Date,
  location: String,
  preferences: {
    notifications: Boolean,
    newsletter: Boolean,
    privacy: String // public, private, friends
  },
  
  // Tracking
  registrationDate: Date (required, default: Date.now),
  registrationSource: String, // organic, referral, social, etc.
  lastLoginDate: Date,
  loginCount: Number (default: 0),
  activationDate: Date,
  firstKeyActionDate: Date,
  referredBy: ObjectId (ref: 'User'),
  referralCode: String (unique),
  
  // Status
  isActive: Boolean (default: true),
  accountStatus: String (enum: ['active', 'suspended', 'deactivated']),
  subscriptionTier: String (enum: ['free', 'premium', 'enterprise']),
  
  // Metadata
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    type: String,
    browser: String,
    os: String
  }
}
```

#### UserSession Model
```javascript
{
  userId: ObjectId (required, ref: 'User', indexed),
  sessionId: String (required, unique, indexed),
  loginTime: Date (required, indexed),
  logoutTime: Date,
  duration: Number, // in milliseconds
  ipAddress: String (required),
  userAgent: String,
  deviceInfo: {
    type: String, // mobile, tablet, desktop
    browser: String,
    os: String,
    location: String
  },
  activities: [{
    action: String, // page_view, click, form_submit, etc.
    timestamp: Date,
    metadata: Object
  }],
  isActive: Boolean (default: true)
}
```

#### UserActivity Model
```javascript
{
  userId: ObjectId (required, ref: 'User', indexed),
  date: Date (required, indexed), // daily aggregation
  loginCount: Number (default: 0),
  sessionDuration: Number (default: 0), // total for day
  pageViews: Number (default: 0),
  actionsPerformed: Number (default: 0),
  features: [{
    feature: String,
    usageCount: Number,
    lastUsed: Date
  }],
  engagementScore: Number (default: 0),
  activityLevel: String (enum: ['low', 'medium', 'high']),
  
  // Detailed activity breakdown
  activities: [{
    type: String, // login, profile_update, content_create, etc.
    count: Number,
    firstOccurrence: Date,
    lastOccurrence: Date
  }]
}
```

#### UserOnboarding Model
```javascript
{
  userId: ObjectId (required, ref: 'User', indexed),
  startDate: Date (required, default: Date.now),
  currentStage: String (indexed),
  completedSteps: [String],
  totalSteps: Number,
  completionPercentage: Number (default: 0),
  
  // Key milestones
  profileCompleted: Boolean (default: false),
  profileCompletedDate: Date,
  firstKeyAction: String,
  firstKeyActionDate: Date,
  timeToActivation: Number, // in milliseconds
  
  // Onboarding funnel
  steps: [{
    stepName: String,
    stepOrder: Number,
    completed: Boolean,
    completedDate: Date,
    timeSpent: Number,
    attempts: Number
  }],
  
  // Activation metrics
  isActivated: Boolean (default: false),
  activationDate: Date,
  activationTrigger: String, // what caused activation
  
  // Drop-off analysis
  lastActiveStep: String,
  lastActiveDate: Date,
  droppedOff: Boolean (default: false),
  dropOffReason: String
}
```

#### UserRetention Model
```javascript
{
  userId: ObjectId (required, ref: 'User', indexed),
  cohortDate: Date (required, indexed), // registration date
  
  // Retention periods
  day1Retention: Boolean (default: false),
  day7Retention: Boolean (default: false),
  day30Retention: Boolean (default: false),
  day90Retention: Boolean (default: false),
  
  // Activity tracking
  lastActivityDate: Date (indexed),
  daysSinceLastActivity: Number,
  totalActiveDays: Number (default: 0),
  longestActiveStreak: Number (default: 0),
  currentActiveStreak: Number (default: 0),
  
  // Engagement metrics
  averageSessionDuration: Number,
  averageActionsPerSession: Number,
  lifetimeValue: Number,
  
  // Churn prediction
  churnRisk: String (enum: ['low', 'medium', 'high']),
  churnPrediction: Number, // 0-1 probability
  churnDate: Date,
  churnReason: String,
  
  // Reactivation
  reactivationAttempts: Number (default: 0),
  lastReactivationDate: Date,
  reactivated: Boolean (default: false)
}
```

#### UserReferral Model
```javascript
{
  referrerId: ObjectId (required, ref: 'User', indexed),
  referredUserId: ObjectId (ref: 'User', indexed),
  referralCode: String (required, indexed),
  invitationDate: Date (required, default: Date.now),
  conversionDate: Date,
  
  // Referral channel
  referralChannel: String (enum: ['email', 'social', 'direct_link', 'sms']),
  referralSource: String, // specific platform or method
  
  // Conversion tracking
  isConverted: Boolean (default: false),
  conversionTime: Number, // time from invitation to signup
  
  // Referral context
  invitationMethod: String,
  personalMessage: String,
  campaignId: String,
  
  // Success metrics
  referredUserActivated: Boolean (default: false),
  referredUserRetained: Boolean (default: false),
  referralReward: {
    type: String, // points, discount, premium_time
    amount: Number,
    claimed: Boolean
  }
}
```

### API Endpoint Specifications

#### User Analytics Endpoints

**GET /api/user-analytics/activity**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31&granularity=daily&segment=all

// Response
{
  success: boolean,
  data: {
    dau: [{
      date: string,
      activeUsers: number,
      newUsers: number,
      returningUsers: number
    }],
    mau: [{
      month: string,
      activeUsers: number,
      growth: number
    }],
    engagement: {
      averageSessionDuration: number,
      averageActionsPerUser: number,
      engagementScore: number
    },
    userSegments: [{
      segment: string, // new, active, inactive, power_user
      count: number,
      percentage: number
    }]
  }
}
```

**GET /api/user-analytics/onboarding**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31&cohort=weekly

// Response
{
  success: boolean,
  data: {
    activationRate: number,
    averageTimeToActivation: number,
    funnelSteps: [{
      stepName: string,
      completionRate: number,
      averageTimeSpent: number,
      dropOffRate: number
    }],
    cohortActivation: [{
      cohort: string,
      totalUsers: number,
      activatedUsers: number,
      activationRate: number
    }],
    keyActions: [{
      action: string,
      averageTimeToComplete: number,
      completionRate: number
    }]
  }
}
```

**GET /api/user-analytics/retention**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31&cohortPeriod=monthly

// Response
{
  success: boolean,
  data: {
    retentionCurve: [{
      period: string, // D1, D7, D30, D90
      retentionRate: number,
      cohortSize: number
    }],
    cohortRetention: [{
      cohort: string,
      cohortSize: number,
      day1: number,
      day7: number,
      day30: number,
      day90: number
    }],
    churnAnalysis: {
      churnRate: number,
      averageLifespan: number,
      churnReasons: [{
        reason: string,
        percentage: number
      }],
      highRiskUsers: number
    }
  }
}
```

**GET /api/user-analytics/referral**
```javascript
// Query Parameters
?startDate=2024-01-01&endDate=2024-01-31&channel=all

// Response
{
  success: boolean,
  data: {
    referralMetrics: {
      totalReferrals: number,
      conversionRate: number,
      viralCoefficient: number,
      averageConversionTime: number
    },
    channelPerformance: [{
      channel: string,
      invitations: number,
      conversions: number,
      conversionRate: number
    }],
    topReferrers: [{
      userId: string,
      userName: string,
      totalReferrals: number,
      successfulReferrals: number,
      conversionRate: number
    }],
    viralGrowth: [{
      period: string,
      organicSignups: number,
      referralSignups: number,
      viralCoefficient: number
    }]
  }
}
```

### Utility Service Functions

#### userAnalyticsService.js Functions

**Activity Tracking**
```javascript
trackUserActivity(userId, activityType, metadata)
calculateDAU(date)
calculateMAU(month, year)
calculateEngagementScore(userId, period)
identifyPowerUsers(threshold)
generateActivityReport(startDate, endDate)
```

**Segmentation**
```javascript
segmentUsers(criteria)
identifyUserTrends(userId, period)
calculateUserLifetimeValue(userId)
predictUserValue(userId)
```

#### onboardingService.js Functions

**Onboarding Tracking**
```javascript
trackOnboardingStep(userId, stepName, completed)
calculateActivationRate(cohort)
measureTimeToValue(userId)
detectFirstKeyAction(userId, action)
identifyOnboardingBottlenecks()
```

**Funnel Analysis**
```javascript
generateOnboardingFunnel(cohort)
calculateStepConversion(stepName)
identifyDropOffPoints()
optimizeOnboardingFlow()
```

#### retentionService.js Functions

**Retention Analysis**
```javascript
calculateRetentionCurve(cohort)
generateCohortAnalysis(period)
identifyChurnRisk(userId)
predictChurnProbability(userId)
segmentUsersByRetention()
```

**Churn Management**
```javascript
trackChurnReasons()
identifyWinbackOpportunities()
measureReactivationSuccess()
implementRetentionStrategies()
```

#### referralService.js Functions

**Referral Tracking**
```javascript
trackReferral(referrerId, referralCode, channel)
calculateViralCoefficient(period)
measureReferralConversion(referralId)
identifyTopReferrers(limit)
```

**Viral Growth**
```javascript
calculateViralGrowth(period)
optimizeReferralChannels()
measureReferralQuality()
implementViralLoop()
```

## Advanced Features

### Cohort Analysis
- **Registration Cohorts**: Group users by registration date
- **Behavioral Cohorts**: Group users by first action or feature usage
- **Retention Tracking**: Track cohort performance over time
- **Comparative Analysis**: Compare cohort performance

### Predictive Analytics
- **Churn Prediction**: ML models to predict user churn
- **Lifetime Value**: Predict user value based on early behavior
- **Engagement Scoring**: Dynamic scoring based on activity patterns
- **Risk Assessment**: Identify users at risk of churning

### Real-time Insights
- **Live Activity Dashboard**: Real-time user activity monitoring
- **Anomaly Detection**: Detect unusual patterns in user behavior
- **Instant Alerts**: Notifications for significant metric changes
- **Performance Monitoring**: Track system performance impact

## Performance Considerations

### Database Optimization
- **Indexing Strategy**: Optimize for time-based queries
- **Data Archiving**: Archive old activity data
- **Aggregation**: Pre-calculate common metrics
- **Query Optimization**: Efficient MongoDB queries

### Scalability
- **Horizontal Scaling**: Distribute load across multiple servers
- **Caching**: Cache frequently accessed metrics
- **Background Processing**: Process analytics in background jobs
- **API Rate Limiting**: Prevent abuse of analytics endpoints

## Privacy and Security

### Data Protection
- **User Consent**: Obtain consent for analytics tracking
- **Data Anonymization**: Anonymize sensitive user data
- **Retention Policies**: Implement data retention limits
- **GDPR Compliance**: Ensure compliance with privacy regulations

### Security Measures
- **Access Control**: Restrict access to sensitive analytics
- **Audit Logging**: Log all analytics access
- **Data Encryption**: Encrypt sensitive analytics data
- **Secure APIs**: Implement proper authentication and authorization

## Monitoring and Alerting

### Key Metrics Monitoring
- **DAU/MAU Trends**: Monitor active user trends
- **Churn Rate**: Alert on significant churn increases
- **Activation Rate**: Monitor onboarding performance
- **Referral Performance**: Track viral growth metrics

### Automated Alerts
- **Threshold Alerts**: Alert when metrics exceed thresholds
- **Anomaly Detection**: Detect unusual patterns
- **Performance Alerts**: Monitor system performance
- **Data Quality**: Ensure data accuracy and completeness

This comprehensive system provides deep insights into registered user behavior while maintaining privacy and scalability considerations.