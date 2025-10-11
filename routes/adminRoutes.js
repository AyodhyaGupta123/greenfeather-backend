const express = require('express');
const { body } = require('express-validator');
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  changePassword,
  logoutAdmin,
  getAllAdmins,
  updateAdminStatus
} = require('../controllers/adminController');
const {
  protectAdmin,
  requireSuperAdmin,
  checkPermission
} = require('../middleware/adminAuthMiddleware');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['admin', 'moderator'])
    .withMessage('Role must be admin or moderator')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
];

// @route   POST /api/admin/register
// @desc    Register new admin (Super Admin only)
// @access  Private
router.post('/register', protectAdmin, requireSuperAdmin, registerValidation, registerAdmin);

// @route   POST /api/admin/login
// @desc    Login admin
// @access  Public
router.post('/login', loginValidation, loginAdmin);

// @route   GET /api/admin/profile
// @desc    Get current admin profile
// @access  Private
router.get('/profile', protectAdmin, getAdminProfile);

// @route   PUT /api/admin/profile
// @desc    Update admin profile
// @access  Private
router.put('/profile', protectAdmin, updateProfileValidation, updateAdminProfile);

// @route   PUT /api/admin/change-password
// @desc    Change admin password
// @access  Private
router.put('/change-password', protectAdmin, changePasswordValidation, changePassword);

// @route   POST /api/admin/logout
// @desc    Logout admin
// @access  Private
router.post('/logout', protectAdmin, logoutAdmin);

// @route   GET /api/admin/admins
// @desc    Get all admins (Super Admin only)
// @access  Private
router.get('/admins', protectAdmin, requireSuperAdmin, getAllAdmins);

// @route   PUT /api/admin/:id/status
// @desc    Update admin status (Super Admin only)
// @access  Private
router.put('/:id/status', protectAdmin, requireSuperAdmin, updateAdminStatus);

// @route   GET /api/admin/dashboard-stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard-stats', protectAdmin, checkPermission('reports', 'view'), async (req, res) => {
  try {
    // This would typically fetch from various models
    // For now, returning mock data
    const stats = {
      totalUsers: 0,
      totalProducts: 0,
      totalOrders: 0,
      totalVendors: 0,
      totalRevenue: 0,
      recentOrders: [],
      topProducts: [],
      recentUsers: []
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
});

// @route   GET /api/admin/permissions
// @desc    Get admin permissions
// @access  Private
router.get('/permissions', protectAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        permissions: req.admin.permissions,
        role: req.admin.role
      }
    });
  } catch (error) {
    console.error('Get Permissions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
