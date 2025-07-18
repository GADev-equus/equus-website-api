const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');

class AuthService {
  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  // Password hashing and validation
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  // JWT token generation and verification
  generateToken(userId, expiresIn = this.jwtExpiresIn) {
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    return jwt.sign({ id: userId }, this.jwtSecret, { expiresIn });
  }

  generateRefreshToken(userId) {
    if (!this.jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    
    return jwt.sign({ id: userId }, this.jwtRefreshSecret, { 
      expiresIn: this.jwtRefreshExpiresIn 
    });
  }

  verifyToken(token) {
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  verifyRefreshToken(token) {
    if (!this.jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    
    try {
      return jwt.verify(token, this.jwtRefreshSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
      }
    }
  }

  // Token generation for password reset and email verification
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateNumericToken(length = 6) {
    let token = '';
    for (let i = 0; i < length; i++) {
      token += Math.floor(Math.random() * 10);
    }
    return token;
  }

  // Email validation
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    return validator.isEmail(email.trim());
  }

  // Password strength validation
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return {
        isValid: false,
        message: 'Password is required'
      };
    }

    const errors = [];
    
    if (password.length < 8) {
      errors.push('at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('one special character');
    }

    const isValid = errors.length === 0;
    const message = isValid 
      ? 'Password is strong' 
      : `Password must contain ${errors.join(', ')}`;

    return {
      isValid,
      message,
      strength: this.calculatePasswordStrength(password)
    };
  }

  calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }

  // Username validation
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return {
        isValid: false,
        message: 'Username is required'
      };
    }

    const trimmedUsername = username.trim();
    
    if (trimmedUsername.length < 3) {
      return {
        isValid: false,
        message: 'Username must be at least 3 characters long'
      };
    }
    
    if (trimmedUsername.length > 30) {
      return {
        isValid: false,
        message: 'Username must not exceed 30 characters'
      };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return {
        isValid: false,
        message: 'Username can only contain letters, numbers, and underscores'
      };
    }

    return {
      isValid: true,
      message: 'Username is valid'
    };
  }

  // Generate JWT token payload
  generateTokenPayload(user) {
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified
    };
  }

  // Extract IP address from request
  getClientIpAddress(req) {
    return req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.headers['x-client-ip'] ||
      '127.0.0.1';
  }

  // Generate user response object (excluding sensitive data)
  generateUserResponse(user) {
    return {
      _id: user._id,
      id: user._id, // Keep both for compatibility
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      status: user.accountStatus, // Map accountStatus to status for frontend consistency
      emailVerified: user.emailVerified,
      registrationDate: user.registrationDate,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt || user.registrationDate // Ensure createdAt is available
    };
  }

  // Input sanitization
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '')
      .substring(0, 1000);
  }

  // Generate random referral code
  generateReferralCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Check if service is properly configured
  isConfigured() {
    return !!(this.jwtSecret && this.jwtRefreshSecret);
  }

  // Get service status
  getServiceStatus() {
    return {
      configured: this.isConfigured(),
      saltRounds: this.saltRounds,
      jwtExpiresIn: this.jwtExpiresIn,
      jwtRefreshExpiresIn: this.jwtRefreshExpiresIn
    };
  }
}

// Export singleton instance
module.exports = new AuthService();