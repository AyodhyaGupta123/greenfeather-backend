const express = require('express');
const { body } = require('express-validator');
const {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getAllUsers
} = require('../controllers/unifiedAuthController');
const {
  protect,
  authorize,
  requireAdmin,
  requireSuperAdmin
} = require('../middleware/unifiedAuthMiddleware');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .optional()
    .isIn(['user', 'seller', 'admin', 'superadmin'])
    .withMessage('Role must be user, seller, admin, or superadmin')
];

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
    .isIn(['user', 'seller'])
    .withMessage('Role must be user or seller'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
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

// @route   POST /api/auth/login
// @desc    Login user (all roles)
// @access  Public
router.post('/login', loginValidation, login);

// @route   POST /api/auth/register
// @desc    Register user (customer/seller)
// @access  Public
router.post('/register', registerValidation, register);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', protect, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfileValidation, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, changePasswordValidation, changePassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, logout);

// @route   GET /api/auth/users
// @desc    Get all users (Admin/Super Admin only)
// @access  Private (Admin/Super Admin)
router.get('/users', protect, requireAdmin, getAllUsers);

// @route   GET /api/auth/verify-token
// @desc    Verify token and get user info
// @access  Private
router.get('/verify-token', protect, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        isVerified: req.user.isVerified,
        permissions: req.user.adminInfo?.permissions,
        sellerInfo: req.user.sellerInfo
      }
    }
  });
});

module.exports = router;
