const authService = require('../utils/authService');
const User = require('../models/User');

// Main authentication middleware
const auth = async (req, res, next) => {
  try {
    let token;

    // Check for token in cookies first (for subdomain access)
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } else {
      // Fallback to Authorization header
      const authHeader = req.header('Authorization');
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Access Denied',
          message: 'No authorization token provided'
        });
      }

      token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access Denied',
          message: 'No token provided'
        });
      }
    }

    // Verify the token
    const decoded = authService.verifyToken(token);
    
    // Find the user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied',
        message: 'User not found'
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied',
        message: 'Account is deactivated'
      });
    }

    // Check if user account is not suspended
    if (user.accountStatus === 'suspended') {
      return res.status(401).json({
        success: false,
        error: 'Access Denied',
        message: 'Account is suspended'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        error: 'Access Denied',
        message: 'Account is temporarily locked'
      });
    }

    // Attach user to request object
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // Handle specific JWT errors
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        error: 'Token Expired',
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid Token',
        message: 'Your session is invalid. Please log in again.'
      });
    }
    
    // Generic authentication error
    return res.status(401).json({
      success: false,
      error: 'Authentication Failed',
      message: 'Authentication failed. Please log in again.'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in cookies first (for subdomain access)
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    } else {
      // Fallback to Authorization header
      const authHeader = req.header('Authorization');
      
      if (!authHeader) {
        return next();
      }

      token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        return next();
      }
    }

    // Verify the token
    const decoded = authService.verifyToken(token);
    
    // Find the user
    const user = await User.findById(decoded.id).select('-password');
    
    if (user && user.isActive && user.accountStatus === 'active' && !user.isLocked) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // In optional auth, we don't fail on errors, just continue without user
    next();
  }
};

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }
  
  next();
};

// Middleware to check if user's email is verified
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email Verification Required',
      message: 'Please verify your email address to access this resource'
    });
  }
  
  next();
};

// Middleware to check if user owns the resource
const requireResourceOwnership = (resourceUserIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Check if user is admin (admins can access all resources)
      if (req.user.role === 'admin') {
        return next();
      }

      // Get resource user ID from request params or body
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Resource user ID is required'
        });
      }

      // Check if the authenticated user owns the resource
      if (req.user._id.toString() !== resourceUserId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only access your own resources'
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error.message);
      
      return res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to verify resource ownership'
      });
    }
  };
};

// Middleware to check if user can modify the resource (owner or admin)
const requireResourceAccess = (resourceUserIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Admins can access all resources
      if (req.user.role === 'admin') {
        return next();
      }

      // Get resource user ID from request params or body
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Resource user ID is required'
        });
      }

      // Check if the user owns the resource
      if (req.user._id.toString() === resourceUserId.toString()) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    } catch (error) {
      console.error('Resource access check error:', error.message);
      
      return res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to verify resource access'
      });
    }
  };
};

// Middleware to validate user status for sensitive operations
const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to perform this action'
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Account Inactive',
      message: 'Your account is inactive. Please contact support.'
    });
  }

  if (req.user.accountStatus !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'Account Restricted',
      message: `Your account is ${req.user.accountStatus}. Please contact support.`
    });
  }

  if (req.user.isLocked) {
    return res.status(403).json({
      success: false,
      error: 'Account Locked',
      message: 'Your account is temporarily locked. Please try again later.'
    });
  }

  next();
};

module.exports = {
  auth,
  optionalAuth,
  requireAuth,
  requireEmailVerification,
  requireResourceOwnership,
  requireResourceAccess,
  requireActiveUser
};