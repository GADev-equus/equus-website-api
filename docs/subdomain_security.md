# Subdomain Security Implementation Guide

This guide explains how to secure your protected subdomains to prevent unauthorized direct access.

## Overview

The Equus website system includes protected subdomains that require authentication and specific permissions:

- `ai-tfl.equussystems.co` - AI Training & Learning Platform (admin/user access)
- `ai-tutor.equussystems.co` - AI Tutorial Platform (admin only access)

## Security Requirements

### 1. **Authentication Verification**
Each subdomain must validate that users have:
- Valid JWT token from the main site
- Appropriate role permissions OR approved access request
- Active account status with email verification

### 2. **Access Control Methods**
Users can gain access through:
- **Role-based access**: Having the required role (admin/user)
- **Request-based access**: Having an approved access request from admin

## Implementation Steps

### Step 1: Deploy Authentication Middleware

Copy the middleware file to each subdomain server:

```bash
# Copy middleware to subdomain servers
scp /path/to/api/middleware/subdomainAuth.js user@ai-tfl-server:/app/middleware/
scp /path/to/api/middleware/subdomainAuth.js user@ai-tutor-server:/app/middleware/
```

### Step 2: Configure Environment Variables

On each subdomain server, set these environment variables:

```env
# Main API URL for verification
MAIN_API_URL=https://equus-website-api.onrender.com

# JWT Secret (must match main API)
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long

# Redirect URLs
MAIN_SITE_URL=https://equus-website.onrender.com
LOGIN_URL=https://equus-website.onrender.com/auth/signin

# Node environment
NODE_ENV=production
```

### Step 3: Apply Middleware to Subdomain Apps

#### For Express.js Applications:

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');
const { subdomainAuthMiddleware } = require('./middleware/subdomainAuth');

const app = express();

// Required middleware
app.use(cookieParser());

// Apply authentication middleware to all routes
app.use(subdomainAuthMiddleware);

// Your protected content routes
app.get('/', (req, res) => {
  // req.user contains authenticated user info
  // req.subdomainAccess contains access verification details
  res.send(`Welcome ${req.user.firstName}! You have access via: ${req.subdomainAccess.accessMethod}`);
});

// Start server
app.listen(3000, () => {
  console.log('Protected subdomain server running on port 3000');
});
```

#### For Static Sites with Nginx:

If your subdomains serve static content, use Nginx with auth_request module:

```nginx
server {
    listen 80;
    server_name ai-tfl.equussystems.co;

    # Authentication endpoint
    location = /auth {
        internal;
        proxy_pass http://localhost:3001/verify-auth;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
        proxy_set_header X-Original-Host $host;
    }

    # Protected content
    location / {
        auth_request /auth;
        
        # On auth failure, redirect to login
        error_page 401 = @error401;
        error_page 403 = @error403;
        
        root /var/www/ai-tfl;
        index index.html;
    }

    # Auth error handling
    location @error401 {
        return 302 https://equus-website.onrender.com/auth/signin;
    }
    
    location @error403 {
        return 302 https://equus-website.onrender.com/unauthorized;
    }
}
```

### Step 4: Create Verification Server (for Nginx setup)

```javascript
// verify-auth-server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const { verifySubdomainAccess, extractToken, SUBDOMAIN_AUTH_CONFIG } = require('./middleware/subdomainAuth');

const app = express();
app.use(cookieParser());

app.get('/verify-auth', async (req, res) => {
  try {
    const hostname = req.get('X-Original-Host');
    const subdomainId = SUBDOMAIN_AUTH_CONFIG.SUBDOMAIN_MAPPINGS[hostname];
    
    if (!subdomainId) {
      return res.status(400).end();
    }
    
    const token = extractToken(req);
    if (!token) {
      return res.status(401).end();
    }
    
    const verification = await verifySubdomainAccess(token, subdomainId);
    
    if (verification.success && verification.hasAccess) {
      res.status(200).end();
    } else {
      res.status(403).end();
    }
    
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).end();
  }
});

app.listen(3001, () => {
  console.log('Auth verification server running on port 3001');
});
```

## Testing the Security

### 1. **Test Unauthenticated Access**
```bash
# Should be redirected or show access denied
curl -v https://ai-tfl.equussystems.co/
```

### 2. **Test Authenticated Access**
```bash
# Should show content if user has access
curl -v https://ai-tfl.equussystems.co/ \
  -H "Cookie: equus_subdomain_auth=your-jwt-token-here"
```

### 3. **Test Access Verification API**
```bash
# Test the verification endpoint directly
curl -X GET https://equus-website-api.onrender.com/api/subdomain-requests/verify-access/ai-trl \
  -H "Authorization: Bearer your-jwt-token-here"
```

## Security Features

### 1. **Multi-layer Protection**
- JWT token validation
- Role-based access control
- Request-based access approval
- Account status verification
- Email verification requirement

### 2. **User Experience**
- Professional access denied pages
- Clear error messaging
- Automatic redirects to login
- Branded error pages matching your design

### 3. **Monitoring & Logging**
- Failed access attempts logged
- Authentication method tracking
- User access patterns monitoring

## Troubleshooting

### Common Issues:

1. **Token Not Found**
   - Check cookie domain settings (should be .equussystems.co)
   - Verify token is being set by main site navigation

2. **API Verification Fails**
   - Check MAIN_API_URL environment variable
   - Verify network connectivity between subdomain and main API
   - Check JWT_SECRET matches main API

3. **Access Denied Despite Permissions**
   - Verify user has approved access request in database
   - Check user role and email verification status
   - Test verification endpoint directly

### Debug Mode:

Add debug logging to middleware:

```javascript
// Add to subdomainAuth.js middleware
console.log('Debug info:', {
  hostname,
  subdomainId,
  hasToken: !!token,
  verification: verification
});
```

## Production Checklist

- [ ] Middleware deployed to all protected subdomains
- [ ] Environment variables configured correctly
- [ ] JWT secrets match between main API and subdomains
- [ ] Cookie domains set to allow subdomain access
- [ ] Error pages branded and user-friendly
- [ ] SSL certificates installed on all subdomains
- [ ] Monitoring and logging configured
- [ ] Backup authentication method in place
- [ ] Performance impact tested under load

## Next Steps

After implementing subdomain security:

1. **Monitor Access Logs** - Track authentication success/failure rates
2. **User Training** - Inform users about access request process
3. **Admin Dashboard** - Use existing admin interface to manage requests
4. **Automated Testing** - Set up continuous testing of authentication flow
5. **Performance Optimization** - Cache verification results if needed

The subdomain security system is now complete and will prevent unauthorized direct access to protected resources while maintaining a smooth user experience for authorized users.