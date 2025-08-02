const User = require('../models/User');
const authService = require('../utils/authService');

const userController = {
  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user._id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User profile not found'
        });
      }

      res.status(200).json({
        success: true,
        user: authService.generateUserResponse(user)
      });

    } catch (error) {
      console.error('Get profile error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve user profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, username, bio, avatar } = req.body;
      const userId = req.user._id;

      // Validate at least one field is provided
      if (!firstName && !lastName && !username && !bio && !avatar) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'At least one field must be provided for update'
        });
      }

      // Build update object
      const updates = {};
      
      if (firstName) {
        if (firstName.trim().length < 2) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'First name must be at least 2 characters long'
          });
        }
        updates.firstName = authService.sanitizeInput(firstName);
      }
      
      if (lastName) {
        if (lastName.trim().length < 2) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Last name must be at least 2 characters long'
          });
        }
        updates.lastName = authService.sanitizeInput(lastName);
      }
      
      if (username) {
        const usernameValidation = authService.validateUsername(username);
        if (!usernameValidation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: usernameValidation.message
          });
        }
        
        // Check if username is already taken by another user
        const existingUser = await User.findOne({
          username: username.trim(),
          _id: { $ne: userId }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'Username Taken',
            message: 'This username is already taken'
          });
        }
        
        updates.username = authService.sanitizeInput(username);
      }
      
      if (bio !== undefined) {
        if (bio && bio.length > 500) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Bio must not exceed 500 characters'
          });
        }
        updates.bio = bio ? authService.sanitizeInput(bio) : '';
      }
      
      if (avatar !== undefined) {
        if (avatar && !authService.validateEmail(avatar)) { // Using email validation for URL-like format
          const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
          if (!urlRegex.test(avatar)) {
            return res.status(400).json({
              success: false,
              error: 'Validation Error',
              message: 'Avatar must be a valid URL'
            });
          }
        }
        updates.avatar = avatar ? authService.sanitizeInput(avatar) : '';
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User not found'
        });
      }

      console.log(`✅ Profile updated successfully for: ${updatedUser.email}`);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: authService.generateUserResponse(updatedUser)
      });

    } catch (error) {
      console.error('Update profile error:', error.message);
      
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
        message: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user._id;

      // Validate required fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Current password, new password, and confirm password are required'
        });
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'New passwords do not match'
        });
      }

      // Validate new password strength
      const passwordValidation = authService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: passwordValidation.message
        });
      }

      // Get user with password
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await authService.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Password',
          message: 'Current password is incorrect'
        });
      }

      // Check if new password is different from current
      const isSamePassword = await authService.comparePassword(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'New password must be different from current password'
        });
      }

      // Hash new password
      const hashedNewPassword = await authService.hashPassword(newPassword);

      // Update password
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword
      });

      console.log(`✅ Password changed successfully for: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to change password',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Delete user account
  async deleteAccount(req, res) {
    try {
      const { password } = req.body;
      const userId = req.user._id;

      // Validate password
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Password is required to delete account'
        });
      }

      // Get user with password
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User not found'
        });
      }

      // Verify password
      const isPasswordValid = await authService.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Password',
          message: 'Password is incorrect'
        });
      }

      // Soft delete - deactivate account
      await User.findByIdAndUpdate(userId, {
        isActive: false,
        accountStatus: 'deactivated',
        // Optional: Clear sensitive data
        email: `deleted_${Date.now()}@deleted.com`,
        username: null,
        bio: null,
        avatar: null
      });

      console.log(`✅ Account deleted successfully for: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      console.error('Delete account error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to delete account',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const role = req.query.role || 'all';
      const status = req.query.status || 'active';
      const search = req.query.search || '';

      // Build query
      const query = {};
      
      if (role !== 'all') {
        query.role = role;
      }
      
      if (status !== 'all') {
        query.accountStatus = status;
      }
      
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      // Get users and total count
      const [users, totalUsers] = await Promise.all([
        User.find(query)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalUsers / limit);

      res.status(200).json({
        success: true,
        users: users.map(user => authService.generateUserResponse(user)),
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      console.error('Get all users error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get user by ID (Admin only)
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id).select('-password');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        user: authService.generateUserResponse(user)
      });

    } catch (error) {
      console.error('Get user by ID error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Update user role (Admin only)
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role, reason } = req.body;

      // Validate role
      if (!role || !['user', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Role must be either "user" or "admin"'
        });
      }

      // Find user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User not found'
        });
      }

      // Check if role is already set
      if (user.role === role) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `User already has ${role} role`
        });
      }

      // Update user role
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true, runValidators: true }
      ).select('-password');

      console.log(`✅ User role updated: ${user.email} -> ${role} by ${req.user.email}${reason ? ` (Reason: ${reason})` : ''}`);

      res.status(200).json({
        success: true,
        message: `User role updated to ${role} successfully`,
        user: authService.generateUserResponse(updatedUser)
      });

    } catch (error) {
      console.error('Update user role error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to update user role',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Suspend/unsuspend user (Admin only)
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      // Validate status
      if (!status || !['active', 'suspended', 'deactivated'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Status must be "active", "suspended", or "deactivated"'
        });
      }

      // Find user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User Not Found',
          message: 'User not found'
        });
      }

      // Check if status is already set
      if (user.accountStatus === status) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `User account is already ${status}`
        });
      }

      // Update user status
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { 
          accountStatus: status,
          isActive: status === 'active'
        },
        { new: true, runValidators: true }
      ).select('-password');

      console.log(`✅ User status updated: ${user.email} -> ${status} by ${req.user.email}${reason ? ` (Reason: ${reason})` : ''}`);

      res.status(200).json({
        success: true,
        message: `User account ${status} successfully`,
        user: authService.generateUserResponse(updatedUser)
      });

    } catch (error) {
      console.error('Update user status error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to update user status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get user statistics (Admin only)
  async getUserStats(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      // Calculate date ranges
      const now = new Date();
      
      // Today: Start of current day (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // This week: 7 days ago from start of today
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - 7);
      
      // This month: First day of current month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Past 30 days: 30 days ago (more useful for development/testing)
      const past30Days = new Date(now);
      past30Days.setDate(past30Days.getDate() - 30);
      
      // Get period start date for analytics
      let analyticsStartDate;
      switch (period) {
        case '1h':
          analyticsStartDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          analyticsStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          analyticsStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          analyticsStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          analyticsStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          analyticsStartDate = startOfWeek;
      }
      
      // Import Analytics model
      const Analytics = require('../models/Analytics');
      
      const [
        userStats,
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        adminUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        newUsersPast30Days,
        recentUsers,
        // Analytics-based metrics
        loginMetrics,
        userAgentStats,
        sessionMetrics,
        locationStats
      ] = await Promise.all([
        User.getUserStats(),
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ status: 'suspended' }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ createdAt: { $gte: today } }),
        User.countDocuments({ createdAt: { $gte: startOfWeek } }),
        User.countDocuments({ createdAt: { $gte: startOfMonth } }),
        User.countDocuments({ createdAt: { $gte: past30Days } }),
        User.find({ isActive: true })
          .select('-password')
          .sort({ createdAt: -1 })
          .limit(5),
        // Get login-related analytics (POST requests to auth endpoints)
        Analytics.aggregate([
          { 
            $match: { 
              timestamp: { $gte: analyticsStartDate, $lte: now },
              method: 'POST',
              path: { $in: ['/signin', '/signup', '/logout'] }
            }
          },
          {
            $group: {
              _id: '$path',
              count: { $sum: 1 },
              successCount: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
              failureCount: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } }
            }
          }
        ]),
        // Get top user agents
        Analytics.aggregate([
          { 
            $match: { 
              timestamp: { $gte: analyticsStartDate, $lte: now },
              userId: { $ne: null }
            }
          },
          {
            $group: {
              _id: '$userAgent',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $project: {
              name: {
                $cond: [
                  { $regexMatch: { input: '$_id', regex: /Chrome/i } }, 'Chrome',
                  { $cond: [
                    { $regexMatch: { input: '$_id', regex: /Firefox/i } }, 'Firefox',
                    { $cond: [
                      { $regexMatch: { input: '$_id', regex: /Safari/i } }, 'Safari',
                      { $cond: [
                        { $regexMatch: { input: '$_id', regex: /Edge/i } }, 'Edge',
                        'Other'
                      ]}
                    ]}
                  ]}
                ]
              },
              count: 1
            }
          }
        ]),
        // Calculate session metrics
        Analytics.aggregate([
          { 
            $match: { 
              timestamp: { $gte: analyticsStartDate, $lte: now },
              userId: { $ne: null }
            }
          },
          {
            $group: {
              _id: { userId: '$userId', sessionId: '$sessionId' },
              firstActivity: { $min: '$timestamp' },
              lastActivity: { $max: '$timestamp' },
              activityCount: { $sum: 1 }
            }
          },
          {
            $project: {
              sessionDuration: { 
                $divide: [
                  { $subtract: ['$lastActivity', '$firstActivity'] }, 
                  60000  // Convert to minutes
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgSessionTime: { $avg: '$sessionDuration' },
              totalSessions: { $sum: 1 }
            }
          }
        ]),
        // Get top locations from IP addresses
        Analytics.aggregate([
          { 
            $match: { 
              timestamp: { $gte: analyticsStartDate, $lte: now },
              userId: { $ne: null }
            }
          },
          {
            $group: {
              _id: '$ipAddress',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ])
      ]);

      // Enhanced function to get location from IP with detailed classification
      const getLocationFromIP = (ip) => {
        // Localhost (Development)
        if (ip === '::1' || ip === '::ffff:127.0.0.1') {
          return 'Local Development (IPv6)';
        } else if (ip === '127.0.0.1' || ip.startsWith('127.')) {
          return 'Local Development (IPv4)';
        }
        
        // Private Network Ranges (RFC 1918)
        else if (ip.startsWith('10.')) {
          // Class A: 10.0.0.0 to 10.255.255.255
          return 'Corporate Network (10.x.x.x)';
        } else if (ip.startsWith('192.168.')) {
          // Class C: 192.168.0.0 to 192.168.255.255
          return 'Home/Small Office (192.168.x.x)';
        } else if (ip.startsWith('172.')) {
          // Class B: 172.16.0.0 to 172.31.255.255 (need to check range)
          const secondOctet = parseInt(ip.split('.')[1]);
          if (secondOctet >= 16 && secondOctet <= 31) {
            return 'Private Network (172.16-31.x.x)';
          } else {
            return 'Unknown Network (172.x.x.x)';
          }
        }
        
        // Link-local addresses
        else if (ip.startsWith('169.254.')) {
          return 'Link-Local (169.254.x.x)';
        }
        
        // Carrier-grade NAT (RFC 6598)
        else if (ip.startsWith('100.')) {
          const secondOctet = parseInt(ip.split('.')[1]);
          if (secondOctet >= 64 && secondOctet <= 127) {
            return 'Carrier-grade NAT (100.64-127.x.x)';
          }
        }
        
        // Multicast addresses
        else if (ip.startsWith('224.') || ip.startsWith('225.') || ip.startsWith('226.') || 
                 ip.startsWith('227.') || ip.startsWith('228.') || ip.startsWith('229.') ||
                 ip.startsWith('230.') || ip.startsWith('231.') || ip.startsWith('232.') ||
                 ip.startsWith('233.') || ip.startsWith('234.') || ip.startsWith('235.') ||
                 ip.startsWith('236.') || ip.startsWith('237.') || ip.startsWith('238.') ||
                 ip.startsWith('239.')) {
          return 'Multicast Address';
        }
        
        // Public IPv4 addresses with basic geolocation hints
        else if (ip.includes('.') && !ip.includes(':')) {
          const firstOctet = parseInt(ip.split('.')[0]);
          
          // Some basic geographic hints based on common IP ranges
          if (firstOctet >= 1 && firstOctet <= 126) {
            return 'Public IP (Class A Range)';
          } else if (firstOctet >= 128 && firstOctet <= 191) {
            return 'Public IP (Class B Range)';
          } else if (firstOctet >= 192 && firstOctet <= 223) {
            return 'Public IP (Class C Range)';
          } else {
            return 'Public IP (Special Range)';
          }
        }
        
        // IPv6 addresses
        else if (ip.includes(':')) {
          if (ip.startsWith('fe80:')) {
            return 'IPv6 Link-Local';
          } else if (ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
            return 'IPv6 Private (Unique Local)';
          } else if (ip.startsWith('2001:db8:')) {
            return 'IPv6 Documentation';
          } else if (ip.startsWith('2001:')) {
            return 'IPv6 Global (2001::/16)';
          } else if (ip.startsWith('2002:')) {
            return 'IPv6 6to4 Tunnel';
          } else {
            return 'IPv6 Global Address';
          }
        }
        
        // Fallback
        else {
          return 'Unknown Address Type';
        }
      };

      // Process location stats
      const topLocations = locationStats.map(stat => ({
        name: getLocationFromIP(stat._id),
        count: stat.count
      }));

      // Process login metrics
      let totalLogins = 0;
      let failedLogins = 0;
      
      loginMetrics.forEach(metric => {
        if (metric._id === '/signin') {
          totalLogins += metric.successCount;
          failedLogins += metric.failureCount;
        }
      });

      // Process session metrics
      const avgSessionTime = sessionMetrics.length > 0 
        ? Math.round(sessionMetrics[0].avgSessionTime || 0) 
        : 0;

      res.status(200).json({
        success: true,
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          suspendedUsers,
          adminUsers,
          newUsersToday,
          newUsersThisWeek,
          newUsersThisMonth,
          newUsersPast30Days,
          usersByRole: userStats,
          recentUsers: recentUsers.map(user => authService.generateUserResponse(user)),
          // Real system metrics from analytics data
          totalLogins,
          failedLogins,
          avgSessionTime,
          topUserAgents: userAgentStats,
          topLocations
        }
      });

    } catch (error) {
      console.error('Get user stats error:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve user statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = userController;