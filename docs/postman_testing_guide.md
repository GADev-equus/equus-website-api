# Postman Testing Guide for Authentication System

This guide provides step-by-step instructions for testing all authentication endpoints using Postman.

## Prerequisites

### 1. Server Setup
Ensure your server is running:
```bash
cd api/
npm run dev
```

### 2. Environment Variables
Create a `.env` file in the `api/` directory with:
```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/equus-website

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-token-secret-here-at-least-32-characters-long
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (for testing, you can use a test service)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@equus-website.com

# Frontend URLs
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_URL=http://localhost:5173/reset-password
EMAIL_VERIFICATION_URL=http://localhost:5173/verify-email

# Initial Admin User
INITIAL_ADMIN_EMAIL=admin@test.com
INITIAL_ADMIN_PASSWORD=AdminPass123!
```

### 3. Postman Environment Setup
Create a new Postman environment with these variables:
- `baseUrl`: `http://localhost:8000`
- `token`: (will be set automatically)
- `refreshToken`: (will be set automatically)
- `userId`: (will be set automatically)
- `verificationToken`: (will be set manually from database)
- `resetToken`: (will be set manually from database)

## Testing Flow Overview

Follow this order for comprehensive testing:

1. **Health Check** - Verify server is running
2. **User Registration** - Create new user account
3. **Email Verification** - Verify email address
4. **User Login** - Authenticate user
5. **Profile Management** - Update user profile
6. **Password Reset Flow** - Reset password
7. **Token Refresh** - Refresh JWT token
8. **Admin Functions** - Test admin endpoints
9. **Error Scenarios** - Test error handling

---

## Step-by-Step Testing Guide

### Step 1: Health Check

**Request:**
```
GET {{baseUrl}}/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": {
      "status": "connected",
      "host": "localhost:27017",
      "database": "equus-website"
    },
    "auth": {
      "configured": true,
      "saltRounds": 12,
      "jwtExpiresIn": "24h",
      "jwtRefreshExpiresIn": "7d"
    }
  }
}
```

### Step 2: User Registration

**Request:**
```
POST {{baseUrl}}/api/auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "username": "johndoe"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "user": {
    "id": "user_id_here",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": false,
    "role": "user"
  },
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "expiresIn": 86400
}
```

**Postman Test Script:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("token", response.token);
    pm.environment.set("refreshToken", response.refreshToken);
    pm.environment.set("userId", response.user.id);
}
```

### Step 3: Email Verification

**Note:** You need to get the verification token from the database. In a real application, this would be in the email link.

**Get Verification Token from Database:**
```javascript
// In MongoDB or your database client
db.tokens.findOne({
  userId: ObjectId("your_user_id"),
  type: "email_verification",
  used: false
})
```

**Request:**
```
POST {{baseUrl}}/api/auth/verify-email
Content-Type: application/json

{
  "token": "your_verification_token_here"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email address has been verified successfully.",
  "user": {
    "id": "user_id_here",
    "email": "john.doe@example.com",
    "emailVerified": true
  }
}
```

### Step 4: User Login

**Request:**
```
POST {{baseUrl}}/api/auth/signin
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "rememberMe": false
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user_id_here",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  },
  "token": "new_jwt_token_here",
  "refreshToken": "new_refresh_token_here",
  "expiresIn": 86400
}
```

**Postman Test Script:**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.token);
    pm.environment.set("refreshToken", response.refreshToken);
}
```

### Step 5: Get User Profile

**Request:**
```
GET {{baseUrl}}/api/users/profile
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id_here",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "role": "user",
    "emailVerified": true,
    "registrationDate": "2024-01-15T10:00:00.000Z",
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

### Step 6: Update User Profile

**Request:**
```
PUT {{baseUrl}}/api/users/profile
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "firstName": "Jonathan",
  "bio": "Software developer passionate about web technologies"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "user_id_here",
    "email": "john.doe@example.com",
    "firstName": "Jonathan",
    "lastName": "Doe",
    "username": "johndoe",
    "bio": "Software developer passionate about web technologies",
    "role": "user"
  }
}
```

### Step 7: Password Reset Flow

#### 7.1 Request Password Reset

**Request:**
```
POST {{baseUrl}}/api/auth/request-reset
Content-Type: application/json

{
  "email": "john.doe@example.com"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password reset link has been sent to your email address.",
  "resetTokenExpiry": "2024-01-15T11:30:00.000Z"
}
```

#### 7.2 Reset Password

**Get Reset Token from Database:**
```javascript
// In MongoDB or your database client
db.tokens.findOne({
  userId: ObjectId("your_user_id"),
  type: "password_reset",
  used: false
})
```

**Request:**
```
POST {{baseUrl}}/api/auth/reset
Content-Type: application/json

{
  "token": "your_reset_token_here",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password.",
  "user": {
    "id": "user_id_here",
    "email": "john.doe@example.com",
    "firstName": "Jonathan",
    "lastName": "Doe"
  }
}
```

### Step 8: Change Password (Authenticated)

**Request:**
```
PUT {{baseUrl}}/api/users/password
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "currentPassword": "NewSecurePass123!",
  "newPassword": "AnotherSecurePass123!",
  "confirmPassword": "AnotherSecurePass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Step 9: Token Refresh

**Request:**
```
POST {{baseUrl}}/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{refreshToken}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "new_jwt_token_here",
  "refreshToken": "new_refresh_token_here",
  "expiresIn": 86400
}
```

**Postman Test Script:**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.token);
    pm.environment.set("refreshToken", response.refreshToken);
}
```

### Step 10: Admin Functions

#### 10.1 Login as Admin

**Request:**
```
POST {{baseUrl}}/api/auth/signin
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "AdminPass123!"
}
```

**Postman Test Script:**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("adminToken", response.token);
}
```

#### 10.2 Get All Users (Admin)

**Request:**
```
GET {{baseUrl}}/api/users?page=1&limit=10
Authorization: Bearer {{adminToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id_here",
      "email": "john.doe@example.com",
      "firstName": "Jonathan",
      "lastName": "Doe",
      "role": "user",
      "accountStatus": "active",
      "registrationDate": "2024-01-15T10:00:00.000Z",
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "emailVerified": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalUsers": 1,
    "limit": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

#### 10.3 Update User Role (Admin)

**Request:**
```
PUT {{baseUrl}}/api/users/{{userId}}/role
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "role": "admin",
  "reason": "Promoting to admin for testing"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User role updated to admin successfully",
  "user": {
    "id": "user_id_here",
    "email": "john.doe@example.com",
    "firstName": "Jonathan",
    "lastName": "Doe",
    "role": "admin"
  }
}
```

#### 10.4 Get User Statistics (Admin)

**Request:**
```
GET {{baseUrl}}/api/users/admin/stats
Authorization: Bearer {{adminToken}}
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 2,
    "usersByRole": [
      {
        "_id": "user",
        "count": 1,
        "active": 1
      },
      {
        "_id": "admin",
        "count": 1,
        "active": 1
      }
    ],
    "recentUsers": [
      {
        "id": "user_id_here",
        "email": "john.doe@example.com",
        "firstName": "Jonathan",
        "lastName": "Doe",
        "role": "admin"
      }
    ]
  }
}
```

### Step 11: Logout

**Request:**
```
POST {{baseUrl}}/api/auth/logout
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "refreshToken": "{{refreshToken}}"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Step 12: Delete Account

**Request:**
```
DELETE {{baseUrl}}/api/users/account
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "password": "AnotherSecurePass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## Error Scenarios Testing

### 1. Invalid Login Credentials

**Request:**
```
POST {{baseUrl}}/api/auth/signin
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "WrongPassword"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid Credentials",
  "message": "Invalid email or password"
}
```

### 2. Unauthorized Access

**Request:**
```
GET {{baseUrl}}/api/users/profile
Authorization: Bearer invalid_token
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Access Denied",
  "message": "Invalid token"
}
```

### 3. Rate Limiting

Make 6 rapid requests to the signin endpoint:

**Expected Response (6th request):**
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Too many authentication attempts. Please try again in 15 minutes.",
  "retryAfter": 900
}
```

### 4. Validation Errors

**Request:**
```
POST {{baseUrl}}/api/auth/signup
Content-Type: application/json

{
  "firstName": "J",
  "lastName": "Doe",
  "email": "invalid-email",
  "password": "weak"
}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Please provide a valid email address"
}
```

### 5. Admin Access Required

**Request:**
```
GET {{baseUrl}}/api/users
Authorization: Bearer {{token}}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Admin Access Required",
  "message": "This action requires administrator privileges"
}
```

---

## Postman Collection Setup

### 1. Create Collection
1. Open Postman
2. Create a new collection named "Equus Auth API"
3. Add a description with the testing flow

### 2. Environment Variables
Create environment variables:
- `baseUrl`: `http://localhost:8000`
- `token`: (empty initially)
- `refreshToken`: (empty initially)
- `adminToken`: (empty initially)
- `userId`: (empty initially)

### 3. Collection Variables
Add these to your collection:
- `testEmail`: `john.doe@example.com`
- `testPassword`: `SecurePass123!`
- `adminEmail`: `admin@test.com`
- `adminPassword`: `AdminPass123!`

### 4. Pre-request Scripts
Add this to collection pre-request script:
```javascript
// Auto-refresh token if expired
if (pm.environment.get("token") && pm.request.url.toString().includes("/api/users/") || pm.request.url.toString().includes("/api/auth/logout")) {
    // Token refresh logic can be added here
}
```

### 5. Test Scripts
Add token extraction scripts to login endpoints as shown above.

---

## Troubleshooting

### Common Issues

1. **Server not starting**
   - Check if MongoDB is running
   - Verify environment variables are set
   - Check port 8000 is available

2. **Database connection failed**
   - Ensure MongoDB is running on localhost:27017
   - Check MONGODB_URI in .env file

3. **Email verification/reset not working**
   - Check email service configuration
   - Verify EMAIL_* variables in .env
   - For testing, retrieve tokens directly from database

4. **JWT errors**
   - Ensure JWT_SECRET is at least 32 characters
   - Check token expiration times
   - Verify token format in Authorization header

5. **Rate limiting issues**
   - Wait for rate limit window to reset
   - Check IP address in rate limiter
   - Adjust rate limits for testing if needed

### Database Queries for Testing

Get verification token:
```javascript
db.tokens.findOne({type: "email_verification", used: false})
```

Get reset token:
```javascript
db.tokens.findOne({type: "password_reset", used: false})
```

Check user status:
```javascript
db.users.findOne({email: "john.doe@example.com"})
```

---

## Testing Checklist

- [ ] Server health check passes
- [ ] User registration works
- [ ] Email verification works
- [ ] User login works
- [ ] Profile retrieval works
- [ ] Profile update works
- [ ] Password reset flow works
- [ ] Password change works
- [ ] Token refresh works
- [ ] Admin login works
- [ ] Admin functions work
- [ ] Logout works
- [ ] Account deletion works
- [ ] Error scenarios work
- [ ] Rate limiting works
- [ ] Unauthorized access blocked

This comprehensive testing guide ensures your authentication system is working correctly and securely!