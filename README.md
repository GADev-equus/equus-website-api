# Equus Website API

Node.js/Express backend API for the Equus website with comprehensive authentication system.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

The server will run on **port 8000** by default.



## API Endpoints

### Health Check
- `GET /` - API status and health check
- `GET /health` - Health check endpoint (includes database and auth status)

### Authentication
- `POST /api/auth/signup` - User registration with email verification
- `POST /api/auth/signin` - User login with JWT token
- `POST /api/auth/request-reset` - Request password reset token
- `POST /api/auth/reset` - Reset password with token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout and invalidate token

### User Management
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password
- `DELETE /api/users/account` - Delete user account
- `GET /api/users` - Admin: Get all users
- `GET /api/users/:id` - Admin: Get user by ID
- `PUT /api/users/:id/role` - Admin: Update user role
- `PUT /api/users/:id/status` - Admin: Update user status
- `GET /api/users/admin/stats` - Admin: Get user statistics

### Analytics (Admin Only)
- `GET /api/analytics/overview` - Get analytics overview (page views, visitors, response times)
- `GET /api/analytics/traffic` - Get traffic analytics (user types, methods, referrers)
- `GET /api/analytics/performance` - Get page performance metrics
- `GET /api/analytics/users` - Get authenticated user analytics

### Contact Management (Admin Only)
- `GET /api/contacts` - Get all contacts with filtering and pagination
- `GET /api/contacts/:id` - Get contact by ID
- `PUT /api/contacts/:id/status` - Update contact status (pending/read/replied/archived)
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/stats` - Get contact statistics
- `GET /api/contacts/recent` - Get recent contacts

### Email Service
- `POST /api/email/contact` - Contact form submission with database storage
- `POST /api/email/send` - Generic email sending
- `GET /api/email/status` - Email service health check

## Documentation

- [Authentication System](docs/auth.md) - Complete authentication documentation
- [Email Service](docs/email_service.md) - Email service documentation
- [Contact Management](docs/admin_contact_form.md) - Complete contact management system implementation
- [Page Views Analytics](docs/page_views.md) - Complete analytics system implementation
- [Postman Testing Guide](docs/postman_testing_guide.md) - Step-by-step API testing guide
- [Casual Visitors Analytics](docs/casual_visitors.md) - Analytics for anonymous users
- [Registered Users Analytics](docs/registered_visitors.md) - Analytics for authenticated users

## Project Structure

```
api/
├── server.js                    # Main server file
├── package.json                 # Dependencies and scripts
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── config/
│   └── dbConfig.js            # MongoDB connection configuration
├── controllers/
│   ├── authController.js      # Authentication handlers
│   ├── userController.js      # User management handlers
│   ├── emailController.js     # Email and contact form handlers
│   ├── contactController.js   # Contact management handlers (admin)
│   └── analyticsController.js # Analytics and page views handlers
├── docs/
│   ├── auth.md               # Authentication system documentation
│   ├── email_service.md      # Email service documentation
│   ├── postman_testing_guide.md # API testing guide
│   ├── casual_visitors.md    # Casual visitor analytics plan
│   └── registered_visitors.md # Registered user analytics plan
├── middleware/
│   ├── auth.js               # JWT authentication middleware
│   ├── roles.js              # Role-based access control
│   ├── rateLimiter.js        # Rate limiting middleware
│   ├── errorHandler.js       # Error handling middleware
│   └── analytics.js          # Analytics collection middleware
├── models/
│   ├── User.js               # User model with authentication
│   ├── Token.js              # Token model for auth tokens
│   ├── Contact.js            # Contact form database model
│   └── Analytics.js          # Analytics data model
├── routes/
│   ├── authRoutes.js         # Authentication routes
│   ├── userRoutes.js         # User management routes
│   ├── emailRoutes.js        # Email service routes
│   ├── contactRoutes.js      # Contact management routes (admin)
│   └── analyticsRoutes.js    # Analytics endpoints
└── utils/
    ├── authService.js        # Authentication utilities
    ├── emailTemplates.js     # Email templates
    └── emailService.js       # Email service utility
```

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (setup required)

### Dependencies
- **express** - Web framework
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **nodemon** - Development server with auto-restart
- **mongoose** - MongoDB object modeling
- **nodemailer** - Email sending service
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT token management
- **express-rate-limit** - Rate limiting
- **validator** - Input validation
- **uuid** - Session ID generation for analytics

## Security Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 🔒 **Password Security** - Bcrypt hashing with salt
- 🛡️ **Rate Limiting** - Prevent brute force attacks
- 🔑 **Role-Based Access** - Admin and user roles with automatic redirect
- 📧 **Email Verification** - Secure email verification
- 🔄 **Password Reset** - Secure password reset flow
- 🚫 **Account Lockout** - Automatic account lockout after failed attempts
- 🛡️ **Input Validation** - Comprehensive input validation
- 🔍 **Security Headers** - Proper security headers

## API Features

### Authentication System
- ✅ User registration with email verification
- ✅ Secure login with JWT tokens
- ✅ Password reset with email tokens
- ✅ Token refresh mechanism
- ✅ Role-based access control (admin/user) with automatic dashboard routing
- ✅ Account lockout after failed attempts
- ✅ Rate limiting for security
- ✅ Password strength validation
- ✅ Email verification system
- ✅ Secure logout with token invalidation

### Core Features
- ✅ Express server setup
- ✅ CORS configuration
- ✅ Environment variable support
- ✅ JSON request/response handling
- ✅ Health check endpoints (with database and auth status)
- ✅ MongoDB integration with Mongoose
- ✅ Email service with Nodemailer
- ✅ Contact form with database storage
- ✅ IP address tracking and email validation
- ✅ Error handling middleware
- ✅ Organized folder structure with documentation

### User Management
- ✅ User profile management
- ✅ Password change functionality
- ✅ Account deletion
- ✅ Admin user management
- ✅ User role elevation
- ✅ User statistics and analytics
- ✅ Account status management

### Analytics System
- ✅ Real-time page views tracking
- ✅ Session-based visitor analytics
- ✅ User authentication tracking
- ✅ Performance monitoring (response times, error rates)
- ✅ Admin-only analytics dashboard
- ✅ Time-based analytics (1h, 24h, 7d, 30d, 90d)
- ✅ Database optimization with proper indexing
- ✅ Comprehensive analytics API endpoints

### Contact Management System
- ✅ Complete contact form storage and management
- ✅ Admin-only contact management endpoints
- ✅ Status workflow management (pending/read/replied/archived)
- ✅ Contact statistics and recent submissions
- ✅ Full CRUD operations with proper validation
- ✅ Role-based access control with authentication
- ✅ Database integration with Contact model
- ✅ Comprehensive error handling and validation

## Testing

Use the comprehensive [Postman Testing Guide](docs/postman_testing_guide.md) to test all endpoints systematically.

### Quick Test
```bash
# Test server health
curl http://localhost:8000/health

# Test user registration
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

## Initial Admin User

The system automatically creates an initial admin user on first startup if configured in environment variables:

- **Email**: Set in `INITIAL_ADMIN_EMAIL`
- **Password**: Set in `INITIAL_ADMIN_PASSWORD`

## Rate Limiting

The API implements rate limiting for security:

- **Authentication endpoints**: 5 attempts per 15 minutes
- **Password reset**: 3 attempts per hour
- **Registration**: 3 attempts per hour
- **General API**: 100 requests per 15 minutes
- **Admin actions**: 50 requests per 5 minutes

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": "Technical details (development only)"
}
```

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Configure secure JWT secrets
3. Set up HTTPS
4. Configure email service
5. Set up MongoDB cluster
6. Configure rate limiting for production traffic
7. Set up monitoring and logging

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include rate limiting for new endpoints
4. Add authentication middleware where needed
5. Update documentation
6. Write tests for new features

## License

This project is licensed under the ISC License.
