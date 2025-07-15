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
      const [userStats, totalUsers, recentUsers] = await Promise.all([
        User.getUserStats(),
        User.countDocuments(),
        User.find({ isActive: true })
          .select('-password')
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

      res.status(200).json({
        success: true,
        stats: {
          totalUsers,
          usersByRole: userStats,
          recentUsers: recentUsers.map(user => authService.generateUserResponse(user))
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