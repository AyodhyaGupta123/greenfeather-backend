const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

const registerAdmin = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, permissions } = req.body;

    // Check if admin already exists
    const adminExists = await User.findOne({ email, role: { $in: ['admin', 'superadmin', 'moderator'] } });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create admin using User model
    const admin = await User.createAdmin({
      name,
      email,
      password,
      permissions: permissions || {
        users: { view: true, create: false, edit: false, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        orders: { view: true, create: false, edit: false, delete: false },
        sellers: { view: true, create: false, edit: false, delete: false },
        reports: { view: true, create: false, edit: false, delete: false },
        settings: { view: false, create: false, edit: false, delete: false }
      }
    }, req.user.id);

    // Generate token
    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.adminInfo?.permissions || admin.permissions,
          isActive: admin.isActive,
          isVerified: admin.isVerified,
          createdAt: admin.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Register Admin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


const loginAdmin = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    // Find admin by email (only admin, superadmin, moderator roles)
    const admin = await User.findOne({ 
      email, 
      role: { $in: ['admin', 'superadmin', 'moderator'] } 
    }).select('+password');
    // console.log(admin)
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      const isPasswordMatch = await admin.matchPassword(password);
      if (isPasswordMatch) {
        await admin.resetLoginAttempts();
        await admin.updateLastLogin();
      } else {
        return res.status(423).json({
          success: false,
          message: "Account is locked. Please try again later."
        });
      }
    }
    

    // Check if account is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact super admin.'
      });
    }

    // Check password
    const isPasswordMatch = await admin.matchPassword(password);
    if (!isPasswordMatch) {
      await admin.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts and update last login
    await admin.resetLoginAttempts();
    await admin.updateLastLogin();

    // Generate token
    const token = generateToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.adminInfo?.permissions || admin.adminInfo?.permissions || admin.permissions,
          isActive: admin.isActive,
          isVerified: admin.isVerified,
          lastLogin: admin.lastLogin,
          profileImage: admin.profileImage
        },
        token
      }
    });
  } catch (error) {
    console.error('Login Admin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @route   GET /api/admin/profile
// @access  Private
const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.adminInfo?.permissions || admin.permissions,
          isActive: admin.isActive,
          isVerified: admin.isVerified,
          lastLogin: admin.lastLogin,
          profileImage: admin.profileImage,
          phone: admin.phone,
          address: admin.address,
          twoFactorEnabled: admin.twoFactorEnabled,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get Admin Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const admin = await User.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Update fields
    if (name) admin.name = name;
    if (phone) admin.phone = phone;
    if (address) admin.address = address;

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.adminInfo?.permissions || admin.permissions,
          isActive: admin.isActive,
          isVerified: admin.isVerified,
          profileImage: admin.profileImage,
          phone: admin.phone,
          address: admin.address,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update Admin Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating admin profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const admin = await User.findById(req.admin.id).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Check current password
    const isCurrentPasswordMatch = await admin.matchPassword(currentPassword);
    if (!isCurrentPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

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

const logoutAdmin = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout Admin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


// @access  Private (Super Admin only)
const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    
    // Build filter object - only admin, superadmin, moderator roles
    const filter = { role: { $in: ['admin', 'superadmin', 'moderator'] } };
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const admins = await User.find(filter)
      .select('-password -twoFactorSecret')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalAdmins: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get All Admins Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admins',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @route   PUT /api/admin/:id/status
// @access  Private (Super Admin only)
const updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const admin = await User.findOne({ 
      _id: id, 
      role: { $in: ['admin', 'superadmin', 'moderator'] } 
    });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent super admin from deactivating themselves
    if (admin._id.toString() === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    admin.isActive = isActive;
    await admin.save();

    res.json({
      success: true,
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive
        }
      }
    });
  } catch (error) {
    console.error('Update Admin Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating admin status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  changePassword,
  logoutAdmin,
  getAllAdmins,
  updateAdminStatus
};
