# Authentication & Authorization System Implementation Plan

## Overview
Implement a comprehensive authentication and authorization system with JWT tokens, bcrypt password hashing, role-based access control (admin/regular users), and secure password reset functionality.

## Required Dependencies
Add to package.json:
- `bcrypt` - Password hashing with salt
- `jsonwebtoken` - JWT token generation and validation
- `express-rate-limit` - Rate limiting for security
- `validator` - Email validation
- `crypto` - Token generation for password reset

## Core Components

### 1. Database Models
- **Enhanced User Model** (`models/User.js`): Add authentication fields, roles, and security tokens
- **Token Model** (`models/Token.js`): Store password reset and email verification tokens

### 2. Authentication Middleware
- **Auth Middleware** (`middleware/auth.js`): JWT validation and user authentication
- **Role Middleware** (`middleware/roles.js`): Role-based access control
- **Rate Limiting** (`middleware/rateLimiter.js`): Prevent brute force attacks

### 3. Controllers & Routes
- **Auth Controller** (`controllers/authController.js`): Handle signup, signin, password reset
- **User Controller** (`controllers/userController.js`): User management and role elevation
- **Auth Routes** (`routes/authRoutes.js`): Authentication endpoints
- **User Routes** (`routes/userRoutes.js`): User management endpoints

### 4. Utility Services
- **Auth Service** (`utils/authService.js`): JWT generation, password hashing, token validation
- **Email Templates** (`utils/emailTemplates.js`): Password reset and verification email templates

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/signup` - User registration with email verification
- `POST /api/auth/signin` - User login with JWT token
- `POST /api/auth/request-reset` - Request password reset token
- `POST /api/auth/reset` - Reset password with token
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout and invalidate token

### User Management Endpoints
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/:id/role` - Admin: Elevate user role
- `GET /api/users` - Admin: Get all users
- `DELETE /api/users/:id` - Admin: Delete user account

## Security Features
- **Password Hashing**: Bcrypt with salt rounds
- **JWT Security**: Secure token storage and validation
- **Rate Limiting**: Prevent brute force attacks
- **Email Validation**: Validate email format and existence
- **Token Expiration**: Time-limited reset and verification tokens
- **HTTPS Enforcement**: Secure transmission
- **Input Sanitization**: Prevent injection attacks

## Role-Based Access Control
- **Regular User**: Basic access to user endpoints
- **Admin**: Full access including user management and role elevation
- **Manual Admin Creation**: Admins created through database seeding or existing admin

## Implementation Priority
1. **Phase 1**: Core authentication (signup, signin, password reset)
2. **Phase 2**: Role-based access control and admin functionality
3. **Phase 3**: Security enhancements and email verification
4. **Phase 4**: Advanced features and monitoring

## Detailed Implementation Specifications

### Database Schema Details

#### Enhanced User Model
```javascript
{
  // Authentication
  email: String (required, unique, indexed, lowercase),
  password: String (required, hashed with bcrypt),
  emailVerified: Boolean (default: false),
  
  // Profile
  firstName: String (required),
  lastName: String (required),
  username: String (unique, indexed),
  avatar: String,
  bio: String,
  
  // Role and Permissions
  role: String (enum: ['user', 'admin'], default: 'user'),
  permissions: [String], // granular permissions if needed
  
  // Security and Tracking
  lastLogin: Date,
  loginAttempts: Number (default: 0),
  accountLocked: Boolean (default: false),
  lockUntil: Date,
  
  // Metadata
  registrationDate: Date (default: Date.now),
  registrationIP: String,
  lastLoginIP: String,
  
  // Status
  isActive: Boolean (default: true),
  accountStatus: String (enum: ['active', 'suspended', 'deactivated'], default: 'active'),
  
  // Referral (if using referral system)
  referredBy: ObjectId (ref: 'User'),
  referralCode: String (unique)
}
```

#### Token Model
```javascript
{
  userId: ObjectId (required, ref: 'User'),
  token: String (required, unique, indexed),
  type: String (required, enum: ['email_verification', 'password_reset', 'refresh']),
  expiresAt: Date (required, indexed),
  used: Boolean (default: false),
  usedAt: Date,
  ipAddress: String,
  userAgent: String,
  createdAt: Date (default: Date.now)
}
```

### API Endpoint Specifications

#### Authentication Endpoints

**POST /api/auth/signup**
```javascript
// Request Body
{
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  username?: string,
  referralCode?: string
}

// Response
{
  success: boolean,
  message: string,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    emailVerified: boolean,
    role: string
  },
  token: string,
  expiresIn: number
}
```

**POST /api/auth/signin**
```javascript
// Request Body
{
  email: string,
  password: string,
  rememberMe?: boolean
}

// Response
{
  success: boolean,
  message: string,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: string,
    lastLogin: string
  },
  token: string,
  refreshToken: string,
  expiresIn: number
}
```

**POST /api/auth/request-reset**
```javascript
// Request Body
{
  email: string
}

// Response
{
  success: boolean,
  message: string,
  resetTokenExpiry: string // when token expires
}
```

**POST /api/auth/reset**
```javascript
// Request Body
{
  token: string,
  newPassword: string,
  confirmPassword: string
}

// Response
{
  success: boolean,
  message: string,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string
  }
}
```

**POST /api/auth/verify-email**
```javascript
// Request Body
{
  token: string
}

// Response
{
  success: boolean,
  message: string,
  user: {
    id: string,
    email: string,
    emailVerified: boolean
  }
}
```

**POST /api/auth/refresh**
```javascript
// Request Body
{
  refreshToken: string
}

// Response
{
  success: boolean,
  token: string,
  refreshToken: string,
  expiresIn: number
}
```

**POST /api/auth/logout**
```javascript
// Request Headers
Authorization: Bearer <token>

// Response
{
  success: boolean,
  message: string
}
```

#### User Management Endpoints

**GET /api/users/profile**
```javascript
// Request Headers
Authorization: Bearer <token>

// Response
{
  success: boolean,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    username: string,
    avatar: string,
    bio: string,
    role: string,
    emailVerified: boolean,
    registrationDate: string,
    lastLogin: string
  }
}
```

**PUT /api/users/profile**
```javascript
// Request Headers
Authorization: Bearer <token>

// Request Body
{
  firstName?: string,
  lastName?: string,
  username?: string,
  bio?: string,
  avatar?: string
}

// Response
{
  success: boolean,
  message: string,
  user: {
    // updated user object
  }
}
```

**PUT /api/users/:id/role** (Admin only)
```javascript
// Request Headers
Authorization: Bearer <token>

// Request Body
{
  role: string, // 'user' or 'admin'
  reason?: string
}

// Response
{
  success: boolean,
  message: string,
  user: {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: string
  }
}
```

**GET /api/users** (Admin only)
```javascript
// Request Headers
Authorization: Bearer <token>

// Query Parameters
?page=1&limit=10&role=all&status=active&search=term

// Response
{
  success: boolean,
  users: [{
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    role: string,
    accountStatus: string,
    registrationDate: string,
    lastLogin: string,
    emailVerified: boolean
  }],
  pagination: {
    currentPage: number,
    totalPages: number,
    totalUsers: number,
    limit: number
  }
}
```

### Middleware Specifications

#### Auth Middleware (`middleware/auth.js`)
```javascript
// JWT Token Validation
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied',
        message: 'Invalid token or user inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Access Denied',
      message: 'Invalid token'
    });
  }
};
```

#### Role Middleware (`middleware/roles.js`)
```javascript
// Role-based Access Control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Usage: requireRole(['admin'])
```

#### Rate Limiting (`middleware/rateLimiter.js`)
```javascript
const rateLimit = require('express-rate-limit');

// General auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict password reset limiting
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many password reset attempts, please try again later'
  }
});
```

### Utility Service Functions

#### Auth Service (`utils/authService.js`)
```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Password hashing
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT token generation
const generateToken = (userId, expiresIn = '24h') => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Token generation for password reset/email verification
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Email validation
const validateEmail = (email) => {
  const validator = require('validator');
  return validator.isEmail(email);
};

// Password strength validation
const validatePassword = (password) => {
  return {
    isValid: password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password),
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  };
};
```

#### Email Templates (`utils/emailTemplates.js`)
```javascript
// Password reset email template
const passwordResetTemplate = (name, resetLink) => {
  return {
    subject: 'Password Reset Request - Equus Website',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>You requested a password reset for your account. Click the link below to reset your password:</p>
      <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>Equus Website Team</p>
    `
  };
};

// Email verification template
const emailVerificationTemplate = (name, verificationLink) => {
  return {
    subject: 'Verify Your Email - Equus Website',
    html: `
      <h2>Welcome to Equus Website!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>Best regards,<br>Equus Website Team</p>
    `
  };
};
```

### Security Implementation Details

#### Password Security
- **Bcrypt Hashing**: Use bcrypt with salt rounds of 12
- **Password Validation**: Enforce strong password requirements
- **Password History**: Prevent reuse of recent passwords
- **Account Lockout**: Lock accounts after failed attempts

#### JWT Security
- **Token Expiration**: Short-lived access tokens (24h)
- **Refresh Tokens**: Longer-lived refresh tokens (7d)
- **Token Blacklisting**: Invalidate tokens on logout
- **Secure Storage**: Use httpOnly cookies for tokens

#### Rate Limiting
- **Authentication Endpoints**: 5 attempts per 15 minutes
- **Password Reset**: 3 attempts per hour
- **Registration**: 3 attempts per hour per IP
- **Progressive Delays**: Increase delay after failed attempts

#### Input Validation
- **Email Validation**: Use validator library
- **Sanitization**: Sanitize all user inputs
- **XSS Prevention**: Escape HTML in user data
- **SQL Injection**: Use parameterized queries

### Environment Variables

Add to `.env` file:
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_SALT_ROUNDS=12
ACCOUNT_LOCKOUT_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30

# Email Configuration (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@equus-website.com

# Frontend URLs
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_URL=http://localhost:5173/reset-password
EMAIL_VERIFICATION_URL=http://localhost:5173/verify-email
```

### Error Handling

#### Authentication Errors
- **401 Unauthorized**: Invalid credentials, expired token
- **403 Forbidden**: Insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded
- **400 Bad Request**: Invalid input data

#### Custom Error Classes
```javascript
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = 403;
  }
}
```

### Testing Strategy

#### Unit Tests
- Password hashing and validation
- JWT token generation and verification
- Input validation functions
- Email template generation

#### Integration Tests
- Authentication flow end-to-end
- Role-based access control
- Password reset workflow
- Email verification process

#### Security Tests
- Rate limiting effectiveness
- Token expiration handling
- SQL injection prevention
- XSS attack prevention

### Deployment Considerations

#### Production Security
- **HTTPS Only**: Enforce HTTPS in production
- **Secure Headers**: Use helmet.js for security headers
- **CORS Configuration**: Restrict origins in production
- **Environment Variables**: Use secure secret management

#### Monitoring
- **Failed Login Attempts**: Monitor and alert on suspicious activity
- **Token Usage**: Track token generation and validation
- **Performance**: Monitor authentication endpoint performance
- **Security Events**: Log security-related events

### Admin User Creation

#### Database Seeding
```javascript
// Create initial admin user
const createInitialAdmin = async () => {
  const adminExists = await User.findOne({ role: 'admin' });
  
  if (!adminExists) {
    const hashedPassword = await hashPassword(process.env.INITIAL_ADMIN_PASSWORD);
    
    const admin = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: process.env.INITIAL_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
      isActive: true
    });
    
    await admin.save();
    console.log('Initial admin user created');
  }
};
```

This comprehensive authentication system provides robust security, role-based access control, and all the requested features while maintaining compatibility with the existing API architecture.