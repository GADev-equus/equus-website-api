// Role-based access control middleware

// Check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Convert single role to array for consistency
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient Permissions',
        message: `This action requires ${allowedRoles.join(' or ')} role`
      });
    }

    next();
  };
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin Access Required',
      message: 'This action requires administrator privileges'
    });
  }

  next();
};

// Check if user has user role (regular user)
const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      error: 'User Access Required',
      message: 'This action is only available to regular users'
    });
  }

  next();
};

// Check if user has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Admin users have all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has the specific permission
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient Permissions',
        message: `This action requires '${permission}' permission`
      });
    }

    next();
  };
};

// Check if user has any of the specified permissions
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Admin users have all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient Permissions',
        message: `This action requires one of: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

// Check if user has all of the specified permissions
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Admin users have all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = permissions.every(permission => userPermissions.includes(permission));

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient Permissions',
        message: `This action requires all of: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

// Check if user can perform admin actions (admin or has admin permissions)
const requireAdminOrPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Admin users can perform all actions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has the specific permission
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient Permissions',
        message: `This action requires administrator privileges or '${permission}' permission`
      });
    }

    next();
  };
};

// Check if user can access user management features
const requireUserManagement = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  // Admin users can manage all users
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user has user management permission
  if (!req.user.permissions || !req.user.permissions.includes('user_management')) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient Permissions',
      message: 'This action requires user management privileges'
    });
  }

  next();
};

// Check if user is admin or owns the resource
const requireAdminOrOwnership = (userIdField = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Admin users can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // Get the user ID from request params
    const resourceUserId = req.params[userIdField];
    
    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'User ID is required'
      });
    }

    // Check if the authenticated user owns the resource
    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only access your own resources or must be an administrator'
      });
    }

    next();
  };
};

// Middleware to check role hierarchy (admin > user)
const requireMinimumRole = (minimumRole) => {
  const roleHierarchy = {
    'user': 1,
    'admin': 2
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'You must be logged in to access this resource'
      });
    }

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const minimumRoleLevel = roleHierarchy[minimumRole] || 0;

    if (userRoleLevel < minimumRoleLevel) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient Role Level',
        message: `This action requires ${minimumRole} role or higher`
      });
    }

    next();
  };
};

// Middleware to log access attempts for admin actions
const logAdminAccess = (action) => {
  return (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      console.log(`Admin Access: ${req.user.email} performed ${action} at ${new Date().toISOString()}`);
    }
    next();
  };
};

// Middleware to check if user can modify another user's role
const requireRoleModification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'You must be logged in to access this resource'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin Access Required',
      message: 'Only administrators can modify user roles'
    });
  }

  // Prevent users from modifying their own role
  const targetUserId = req.params.id;
  if (req.user._id.toString() === targetUserId.toString()) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You cannot modify your own role'
    });
  }

  next();
};

module.exports = {
  requireRole,
  requireAdmin,
  requireUser,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAdminOrPermission,
  requireUserManagement,
  requireAdminOrOwnership,
  requireMinimumRole,
  logAdminAccess,
  requireRoleModification
};