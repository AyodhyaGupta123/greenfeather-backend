const express = require('express');
const { body } = require('express-validator');
const {
  createSuperAdmin,
  createAdmin,
  getAllAdmins,
  updateAdminPermissions,
  updateAdminStatus,
  deleteAdmin,
  getAdminDetails,
  getDashboardStats
} = require('../controllers/adminManagementController');
const {
  protect,
  requireSuperAdmin,
  checkPermission
} = require('../middleware/unifiedAuthMiddleware');

const router = express.Router();

// Validation rules
const createSuperAdminValidation = [
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
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const createAdminValidation = [
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
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object')
];

const updatePermissionsValidation = [
  body('permissions')
    .isObject()
    .withMessage('Permissions must be an object'),
  body('permissions.users')
    .optional()
    .isObject()
    .withMessage('Users permissions must be an object'),
  body('permissions.products')
    .optional()
    .isObject()
    .withMessage('Products permissions must be an object'),
  body('permissions.orders')
    .optional()
    .isObject()
    .withMessage('Orders permissions must be an object'),
  body('permissions.sellers')
    .optional()
    .isObject()
    .withMessage('Sellers permissions must be an object'),
  body('permissions.reports')
    .optional()
    .isObject()
    .withMessage('Reports permissions must be an object'),
  body('permissions.settings')
    .optional()
    .isObject()
    .withMessage('Settings permissions must be an object')
];

router.post('/create-super-admin', createSuperAdminValidation, createSuperAdmin);
router.post('/create-admin', protect, requireSuperAdmin, createAdminValidation, createAdmin);
router.get('/admins', protect, requireSuperAdmin, getAllAdmins);
router.get('/:id', protect, requireSuperAdmin, getAdminDetails);
router.put('/:id/permissions', protect, requireSuperAdmin, updatePermissionsValidation, updateAdminPermissions);
router.put('/:id/status', protect, requireSuperAdmin, updateAdminStatus);
router.delete('/:id', protect, requireSuperAdmin, deleteAdmin);
router.get('/dashboard-stats', protect, requireSuperAdmin, getDashboardStats);

module.exports = router;
