const User = require('../models/User');
const Token = require('../models/Token');
const authService = require('../utils/authService');
const emailService = require('../utils/emailService');
const emailTemplates = require('../utils/emailTemplates');

const authController = {
  // User registration
  async signup(req, res) {
    try {
      const { firstName, lastName, email, password, username, referralCode } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'First name, last name, email, and password are required'
        });
      }

      // Validate email format
      if (!authService.validateEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide a valid email address'
        });
      }

      // Validate password strength
      const passwordValidation = authService.validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: passwordValidation.message
        });
      }

      // Validate username if provided
      if (username) {
        const usernameValidation = authService.validateUsername(username);
        if (!usernameValidation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: usernameValidation.message
          });
        }
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User Already Exists',
          message: 'A user with this email address already exists'
        });
      }

      // Check if username is already taken
      if (username) {
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            error: 'Username Taken',
            message: 'This username is already taken'
          });
        }
      }

      // Handle referral code if provided
      let referredBy = null;
      if (referralCode) {
        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        if (referrer) {
          referredBy = referrer._id;
        }
      }

      // Hash password
      const hashedPassword = await authService.hashPassword(password);

      // Get client information
      const ipAddress = authService.getClientIpAddress(req);
      const userAgent = req.get('User-Agent');

      // Create user
      const userData = {
        firstName: authService.sanitizeInput(firstName),
        lastName: authService.sanitizeInput(lastName),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        registrationIP: ipAddress,
        referredBy
      };

      if (username) {
        userData.username = authService.sanitizeInput(username);
      }

      const user = new User(userData);
      await user.save();

      // Generate email verification token
      const verificationToken = authService.generateSecureToken();
      await Token.createToken(
        user._id,
        verificationToken,
        'email_verification',
        Token.getExpirationTime('email_verification'),
        ipAddress,
        userAgent
      );

      // Send verification email
      try {
        const emailTemplate = emailTemplates.emailVerificationTemplate(user, verificationToken);
        await emailService.sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });
      } catch (emailError) {
        console.error('Email verification send failed:', emailError.message);
        // Continue with registration even if email fails
      }

      // Generate JWT token
      const token = authService.generateToken(user._id);
      const refreshToken = authService.generateRefreshToken(user._id);

      // Store refresh token
      await Token.createToken(
        user._id,
        refreshToken,
        'refresh',
        Token.getExpirationTime('refresh'),
        ipAddress,
        userAgent
      );

      // Send welcome email
      try {
        const welcomeTemplate = emailTemplates.welcomeEmailTemplate(user);
        await emailService.sendEmail({
          to: user.email,
          subject: welcomeTemplate.subject,
          html: welcomeTemplate.html
        });
      } catch (emailError) {
        console.error('Welcome email send failed:', emailError.message);
        // Continue with registration even if email fails
      }

      console.log(`✅ User registered successfully: ${user.email}`);

      // Set secure HTTP-only cookies for subdomain access
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.NODE_ENV === 'production' ? '.equussystems.co' : undefined
      };

      res.cookie('auth_token', token, cookieOptions);
      res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        user: authService.generateUserResponse(user),
        token,
        refreshToken,
        expiresIn: 86400 // 24 hours in seconds
      });

    } catch (error) {
      console.error('Registration error:', error.message);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to register user. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // User login
  async signin(req, res) {
    try {
      const { email, password, rememberMe } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Email and password are required'
        });
      }

      // Validate email format
      if (!authService.validateEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide a valid email address'
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          error: 'Account Locked',
          message: 'Account is temporarily locked due to too many failed login attempts'
        });
      }

      // Check if account is active
      if (!user.isActive || user.accountStatus !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Account Inactive',
          message: 'Account is inactive or suspended'
        });
      }

      // Compare password
      const isPasswordValid = await authService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        // Increment login attempts
        await user.incrementLoginAttempts();
        
        return res.status(401).json({
          success: false,
          error: 'Invalid Credentials',
          message: 'Invalid email or password'
        });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Update last login
      const ipAddress = authService.getClientIpAddress(req);
      await user.updateLastLogin(ipAddress);

      // Generate tokens
      const tokenExpiry = rememberMe ? '7d' : '24h';
      const token = authService.generateToken(user._id, tokenExpiry);
      const refreshToken = authService.generateRefreshToken(user._id);

      // Store refresh token
      const userAgent = req.get('User-Agent');
      await Token.createToken(
        user._id,
        refreshToken,
        'refresh',
        Token.getExpirationTime('refresh'),
        ipAddress,
        userAgent
      );

      console.log(`✅ User logged in successfully: ${user.email}`);

      // Set secure HTTP-only cookies for subdomain access
      const cookieMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 24 hours
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: cookieMaxAge,
        // Enable subdomain sharing in production
        domain: process.env.NODE_ENV === 'production' ? '.equussystems.co' : undefined
      };


      res.cookie('auth_token', token, cookieOptions);
      res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: authService.generateUserResponse(user),
        token,
        refreshToken,
        expiresIn: rememberMe ? 604800 : 86400 // 7 days or 24 hours in seconds
      });

    } catch (error) {
      console.error('Login error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to process login. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      // Validate email
      if (!email || !authService.validateEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Please provide a valid email address'
        });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        return res.status(200).json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.',
          resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Account Inactive',
          message: 'Cannot reset password for inactive account'
        });
      }

      // Generate reset token
      const resetToken = authService.generateSecureToken();
      const ipAddress = authService.getClientIpAddress(req);
      const userAgent = req.get('User-Agent');

      // Revoke any existing password reset tokens
      await Token.revokeUserTokens(user._id, 'password_reset');

      // Create new reset token
      await Token.createToken(
        user._id,
        resetToken,
        'password_reset',
        Token.getExpirationTime('password_reset'),
        ipAddress,
        userAgent
      );

      // Send reset email
      try {
        const emailTemplate = emailTemplates.passwordResetTemplate(user, resetToken);
        await emailService.sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });
      } catch (emailError) {
        console.error('Password reset email send failed:', emailError.message);
        return res.status(500).json({
          success: false,
          error: 'Email Service Error',
          message: 'Failed to send password reset email. Please try again later.'
        });
      }

      console.log(`✅ Password reset requested for: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email address.',
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });

    } catch (error) {
      console.error('Password reset request error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to process password reset request. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Reset password
  async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      // Validate required fields
      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Token, new password, and confirm password are required'
        });
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Passwords do not match'
        });
      }

      // Validate password strength
      const passwordValidation = authService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: passwordValidation.message
        });
      }

      // Find and validate token
      const resetToken = await Token.findValidToken(token, 'password_reset');
      if (!resetToken) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Token',
          message: 'Password reset token is invalid or has expired'
        });
      }

      // Find user
      const user = await User.findById(resetToken.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User associated with this token was not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Account Inactive',
          message: 'Cannot reset password for inactive account'
        });
      }

      // Hash new password
      const hashedPassword = await authService.hashPassword(newPassword);

      // Update user password
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        $unset: { lockUntil: 1 }, // Remove account lock if present
        $set: { loginAttempts: 0, accountLocked: false }
      });

      // Mark token as used
      await resetToken.markAsUsed();

      // Revoke all refresh tokens for security
      await Token.revokeUserTokens(user._id, 'refresh');

      // Send confirmation email
      try {
        const emailTemplate = emailTemplates.passwordResetSuccessTemplate(user);
        await emailService.sendEmail({
          to: user.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });
      } catch (emailError) {
        console.error('Password reset confirmation email send failed:', emailError.message);
        // Continue even if email fails
      }

      console.log(`✅ Password reset successful for: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });

    } catch (error) {
      console.error('Password reset error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to reset password. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Verify email
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      // Validate token
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Verification token is required'
        });
      }

      // Find and validate token
      const verificationToken = await Token.findValidToken(token, 'email_verification');
      if (!verificationToken) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Token',
          message: 'Email verification token is invalid or has expired'
        });
      }

      // Find user
      const user = await User.findById(verificationToken.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User associated with this token was not found'
        });
      }

      // Check if email is already verified
      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Already Verified',
          message: 'Email address is already verified'
        });
      }

      // Update user email verification status
      await User.findByIdAndUpdate(user._id, {
        emailVerified: true,
        $unset: { lockUntil: 1 }, // Remove account lock if present
        $set: { loginAttempts: 0, accountLocked: false }
      });

      // Mark token as used
      await verificationToken.markAsUsed();

      console.log(`✅ Email verified successfully for: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Email address has been verified successfully.',
        user: {
          id: user._id,
          email: user.email,
          emailVerified: true
        }
      });

    } catch (error) {
      console.error('Email verification error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to verify email. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken: bodyRefreshToken } = req.body;
      const cookieRefreshToken = req.cookies.refresh_token;

      // Get refresh token from body or cookie
      const refreshToken = bodyRefreshToken || cookieRefreshToken;

      // Validate refresh token
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = authService.verifyRefreshToken(refreshToken);

      // Find and validate stored token
      const storedToken = await Token.findValidToken(refreshToken, 'refresh');
      if (!storedToken) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Token',
          message: 'Refresh token is invalid or has expired'
        });
      }

      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'User Not Found',
          message: 'User not found or inactive'
        });
      }

      // Generate new tokens
      const newToken = authService.generateToken(user._id);
      const newRefreshToken = authService.generateRefreshToken(user._id);

      // Mark old refresh token as used
      await storedToken.markAsUsed();

      // Store new refresh token
      const ipAddress = authService.getClientIpAddress(req);
      const userAgent = req.get('User-Agent');
      await Token.createToken(
        user._id,
        newRefreshToken,
        'refresh',
        Token.getExpirationTime('refresh'),
        ipAddress,
        userAgent
      );

      console.log(`✅ Token refreshed successfully for: ${user.email}`);

      // Set secure HTTP-only cookies for subdomain access
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        domain: process.env.NODE_ENV === 'production' ? '.equussystems.co' : undefined
      };

      res.cookie('auth_token', newToken, cookieOptions);
      res.cookie('refresh_token', newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days for refresh token
      });

      res.status(200).json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: 86400 // 24 hours in seconds
      });

    } catch (error) {
      console.error('Token refresh error:', error.message);
      
      res.status(401).json({
        success: false,
        error: 'Token Refresh Failed',
        message: 'Failed to refresh token. Please log in again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Logout
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      // Revoke refresh token if provided
      if (refreshToken) {
        await Token.revokeUserTokens(req.user._id, 'refresh');
      }

      // Clear HTTP-only cookies
      const cookieClearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.equussystems.co' : undefined
      };

      res.clearCookie('auth_token', cookieClearOptions);
      res.clearCookie('refresh_token', cookieClearOptions);

      console.log(`✅ User logged out successfully: ${req.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to logout. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Token validation for subdomain authentication
  async validateToken(req, res) {
    try {
      
      // Check for token in Authorization header first, then cookies
      let token = null;
      let tokenSource = 'none';
      
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove "Bearer " prefix
        tokenSource = 'header';
      } else if (req.cookies?.auth_token) {
        token = req.cookies.auth_token;
        tokenSource = 'cookie';
      }
      
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No Token',
          message: 'No token provided in cookies or authorization header'
        });
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = authService.verifyToken(token);
      } catch (tokenError) {
        
        if (tokenError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token Expired',
            message: 'Token has expired. Please refresh or login again.'
          });
        } else if (tokenError.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            error: 'Invalid Token',
            message: 'Token is invalid or malformed.'
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Token Validation Failed',
            message: 'Could not validate token.'
          });
        }
      }

      // Find user
      const user = await User.findById(decoded.id || decoded.userId);
      if (!user) {
        const userCount = await User.countDocuments();
        
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User associated with this token was not found',
          debug: {
            tokenUserId: decoded.id || decoded.userId,
            totalUsers: userCount
          }
        });
      }
      

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account Inactive',
          message: 'User account is inactive'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(403).json({
          success: false,
          error: 'Account Locked',
          message: 'User account is temporarily locked'
        });
      }

      // Check if account status allows access
      if (user.accountStatus !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Account Access Denied',
          message: `Account status: ${user.accountStatus}`
        });
      }

      // Generate safe user response for subdomain
      const safeUser = authService.generateUserResponse(user);

      // Log successful validation (for subdomain access audit)
      const clientIP = authService.getClientIpAddress(req);
      const userAgent = req.get('User-Agent');

      // Update last activity (optional - may cause performance issues on high traffic)
      // await User.findByIdAndUpdate(user._id, { lastActivity: new Date() });

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: safeUser,
        validation: {
          valid: true,
          issuedAt: new Date(decoded.iat * 1000).toISOString(),
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          validatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Token validation error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to validate token. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = authController;