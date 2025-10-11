const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// @desc    Create Super Admin (Manual Generation)
// @route   POST /api/admin/create-super-admin
// @access  Private (System only - for initial setup)
const createSuperAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if super admin already exists
    const superAdminExists = await User.findOne({ role: 'superadmin' });
    if (superAdminExists) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin already exists'
      });
    }

    // Create super admin
    const superAdmin = await User.createSuperAdmin({
      name,
      email,
      password
    });

    // Generate token
    const token = generateToken(superAdmin._id);

    res.status(201).json({
      success: true,
      message: 'Super Admin created successfully',
      data: {
        admin: {
          id: superAdmin._id,
          name: superAdmin.name,
          email: superAdmin.email,
          role: superAdmin.role,
          isManuallyGenerated: superAdmin.isManuallyGenerated,
          createdAt: superAdmin.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Create Super Admin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during super admin creation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create Admin (Manual Generation)
// @route   POST /api/admin/create-admin
// @access  Private (Super Admin only)
const createAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, permissions } = req.body;
    const generatedBy = req.user.id;

    // Check if admin already exists
    const adminExists = await User.findOne({ email });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create admin
    const admin = await User.createAdmin({
      name,
      email,
      password,
      permissions
    }, generatedBy);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.adminInfo.permissions,
          isManuallyGenerated: admin.isManuallyGenerated,
          generatedBy: admin.generatedBy,
          generatedAt: admin.generatedAt,
          createdAt: admin.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Create Admin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin creation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all admins with pagination
// @route   GET /api/admin/admins
// @access  Private (Super Admin only)
const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    
    // Build filter object
    const filter = {
      role: { $in: ['admin', 'superadmin'] }
    };
    
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const admins = await User.find(filter)
      .select('-password -twoFactorSecret')
      .populate('generatedBy', 'name email')
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

// @desc    Update admin permissions
// @route   PUT /api/admin/:id/permissions
// @access  Private (Super Admin only)
const updateAdminPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent updating super admin permissions
    if (admin.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update super admin permissions'
      });
    }

    // Update permissions
    admin.adminInfo.permissions = { ...admin.adminInfo.permissions, ...permissions };
    await admin.save();

    res.json({
      success: true,
      message: 'Admin permissions updated successfully',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          permissions: admin.adminInfo.permissions,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update Admin Permissions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating admin permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update admin status
// @route   PUT /api/admin/:id/status
// @access  Private (Super Admin only)
const updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent super admin from deactivating themselves
    if (admin._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Prevent deactivating super admin
    if (admin.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate super admin account'
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
          isActive: admin.isActive,
          updatedAt: admin.updatedAt
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

// @desc    Delete admin
// @route   DELETE /api/admin/:id
// @access  Private (Super Admin only)
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent deleting super admin
    if (admin.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete super admin account'
      });
    }

    // Prevent deleting own account
    if (admin._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete Admin Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting admin',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get admin details
// @route   GET /api/admin/:id
// @access  Private (Super Admin only)
const getAdminDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id)
      .select('-password -twoFactorSecret')
      .populate('generatedBy', 'name email');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: { admin }
    });
  } catch (error) {
    console.error('Get Admin Details Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin/Super Admin)
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
      pendingSellers,
      recentUsers,
      recentSellers,
      recentOrders
    ] = await Promise.all([
      User.countDocuments({ role: 'user', isActive: true }),
      User.countDocuments({ role: 'seller', isActive: true }),
      // Add product count when Product model is available
      // Product.countDocuments(),
      // Add order count when Order model is available
      // Order.countDocuments(),
      User.countDocuments({ role: 'seller', 'sellerInfo.isApproved': false }),
      User.find({ role: 'user' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt'),
      User.find({ role: 'seller' }).sort({ createdAt: -1 }).limit(5).select('name email sellerInfo createdAt'),
      // Add recent orders when Order model is available
      // Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email')
    ]);

    const stats = {
      totalUsers,
      totalSellers,
      totalProducts: 0, // Placeholder
      totalOrders: 0, // Placeholder
      pendingSellers,
      totalRevenue: 0, // Placeholder
      recentUsers,
      recentSellers,
      recentOrders: [] // Placeholder
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard stats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  createSuperAdmin,
  createAdmin,
  getAllAdmins,
  updateAdminPermissions,
  updateAdminStatus,
  deleteAdmin,
  getAdminDetails,
  getDashboardStats
};
