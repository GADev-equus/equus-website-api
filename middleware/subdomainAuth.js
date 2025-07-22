/**
 * Subdomain Authentication Middleware
 * 
 * This middleware should be deployed on each protected subdomain to validate
 * user authentication and access permissions before serving content.
 * 
 * Usage: Deploy this on your protected subdomains (ai-trl.equussystems.co, ai-tutor.equussystems.co)
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

/**
 * Subdomain authentication configuration
 */
const SUBDOMAIN_AUTH_CONFIG = {
  // Main API URL for authentication verification
  MAIN_API_URL: process.env.MAIN_API_URL || 'https://equus-website-api.onrender.com',
  
  // Subdomain identification
  SUBDOMAIN_MAPPINGS: {
    'ai-tfl.equussystems.co': 'ai-trl',
    'ai-tutor.equussystems.co': 'ai-tutot'
  },
  
  // JWT configuration (should match main API)
  JWT_SECRET: process.env.JWT_SECRET,
  
  // Redirect URLs
  MAIN_SITE_URL: process.env.MAIN_SITE_URL || 'https://equus-website.onrender.com',
  LOGIN_URL: process.env.LOGIN_URL || 'https://equus-website.onrender.com/auth/signin'
};

/**
 * Extract JWT token from cookies or headers
 */
const extractToken = (req) => {
  // Check cookies first (set by main domain)
  if (req.cookies && req.cookies.equus_subdomain_auth) {
    return req.cookies.equus_subdomain_auth;
  }
  
  // Check localStorage cookie (backup)
  if (req.cookies && req.cookies.equus_auth_token) {
    return req.cookies.equus_auth_token;
  }
  
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Verify token with main API and check subdomain access
 */
const verifySubdomainAccess = async (token, subdomainId) => {
  try {
    const response = await axios.get(
      `${SUBDOMAIN_AUTH_CONFIG.MAIN_API_URL}/api/subdomain-requests/verify-access/${subdomainId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    throw error;
  }
};

/**
 * Generate access denied HTML page
 */
const generateAccessDeniedPage = (reason, subdomainName, loginUrl, mainSiteUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied - ${subdomainName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            margin: 1rem;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            color: #333;
            margin-bottom: 1rem;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 1.5rem;
        }
        .reason {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #dc3545;
            margin: 1rem 0;
            color: #dc3545;
        }
        .buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-primary:hover {
            background: #5a67d8;
        }
        .btn-secondary {
            background: #e2e8f0;
            color: #4a5568;
        }
        .btn-secondary:hover {
            background: #cbd5e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔒</div>
        <h1>Access Denied</h1>
        <p>You don't have permission to access <strong>${subdomainName}</strong>.</p>
        
        <div class="reason">
            <strong>Reason:</strong> ${reason}
        </div>
        
        <p>If you believe you should have access to this resource, please contact your administrator or request access through the main site.</p>
        
        <div class="buttons">
            <a href="${loginUrl}" class="btn btn-primary">Sign In</a>
            <a href="${mainSiteUrl}" class="btn btn-secondary">Return to Main Site</a>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Main subdomain authentication middleware
 */
const subdomainAuthMiddleware = async (req, res, next) => {
  try {
    // Get subdomain ID from hostname
    const hostname = req.get('host') || req.hostname;
    const subdomainId = SUBDOMAIN_AUTH_CONFIG.SUBDOMAIN_MAPPINGS[hostname];
    
    if (!subdomainId) {
      return res.status(400).send('Invalid subdomain configuration');
    }
    
    // Extract authentication token
    const token = extractToken(req);
    
    if (!token) {
      const subdomainName = subdomainId === 'ai-trl' ? 'AI Training & Learning Platform' : 'AI Tutorial Platform';
      const accessDeniedPage = generateAccessDeniedPage(
        'Authentication required. Please sign in to access this resource.',
        subdomainName,
        SUBDOMAIN_AUTH_CONFIG.LOGIN_URL,
        SUBDOMAIN_AUTH_CONFIG.MAIN_SITE_URL
      );
      return res.status(401).send(accessDeniedPage);
    }
    
    // Verify access with main API
    const verification = await verifySubdomainAccess(token, subdomainId);
    
    if (!verification.success || !verification.hasAccess) {
      const subdomainName = subdomainId === 'ai-trl' ? 'AI Training & Learning Platform' : 'AI Tutorial Platform';
      const reason = verification.accessDenialReason || 'Access not granted';
      
      const accessDeniedPage = generateAccessDeniedPage(
        reason,
        subdomainName,
        SUBDOMAIN_AUTH_CONFIG.LOGIN_URL,
        SUBDOMAIN_AUTH_CONFIG.MAIN_SITE_URL
      );
      return res.status(403).send(accessDeniedPage);
    }
    
    // Access granted - attach user info to request
    req.user = verification.user;
    req.subdomainAccess = {
      subdomainId,
      accessMethod: verification.accessMethod,
      verifiedAt: new Date().toISOString()
    };
    
    next();
    
  } catch (error) {
    console.error('Subdomain authentication error:', error);
    
    const errorPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Authentication Service Unavailable</h1>
        <p>We're experiencing technical difficulties. Please try again in a few moments.</p>
        <a href="${SUBDOMAIN_AUTH_CONFIG.MAIN_SITE_URL}" style="color: white;">Return to Main Site</a>
    </div>
</body>
</html>`;
    
    return res.status(500).send(errorPage);
  }
};

module.exports = {
  subdomainAuthMiddleware,
  SUBDOMAIN_AUTH_CONFIG,
  extractToken,
  verifySubdomainAccess,
  generateAccessDeniedPage
};