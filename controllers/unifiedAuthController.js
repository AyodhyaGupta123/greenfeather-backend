const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// @desc    Login user (all roles)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, role } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check role if specified
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This account is not authorized for ${role} role.`
      });
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    await user.updateLastLogin();

    // Generate token based on role
    const tokenType = user.isAdmin() ? 'admin' : user.isSeller() ? 'seller' : 'user';
    const token = generateToken(user._id);

    // Prepare response data based on role
    let responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
        profileImage: user.profileImage,
        phone: user.phone,
        address: user.address
      },
      token
    };

    // Add role-specific data
    if (user.isAdmin()) {
      responseData.user.permissions = user.adminInfo?.permissions;
    }

    if (user.isSeller()) {
      responseData.user.sellerInfo = {
        businessName: user.sellerInfo?.businessName,
        businessType: user.sellerInfo?.businessType,
        isApproved: user.sellerInfo?.isApproved,
        commissionRate: user.sellerInfo?.commissionRate
      };
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: responseData
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Register user (customer/seller)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role = 'user', phone, address } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      address
    });

    // Generate token
    const tokenType = user.isSeller() ? 'seller' : 'user';
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          phone: user.phone,
          address: user.address,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let profileData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      profileImage: user.profileImage,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Add role-specific data
    if (user.isAdmin()) {
      profileData.permissions = user.adminInfo?.permissions;
    }

    if (user.isSeller()) {
      profileData.sellerInfo = user.sellerInfo;
    }

    res.json({
      success: true,
      data: { user: profileData }
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          address: user.address,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isCurrentPasswordMatch = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a production environment, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all users (Admin/Super Admin only)
// @route   GET /api/auth/users
// @access  Private (Admin/Super Admin)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    
    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getAllUsers
};
