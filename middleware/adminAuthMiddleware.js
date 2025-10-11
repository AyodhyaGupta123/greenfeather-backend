const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protectAdmin = async (req, res, next) => {
  try {
    let token;


    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token && req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      if (decoded.type !== 'admin') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type. Admin token required.'
        });
      }

      const admin = await Admin.findById(decoded.id).select('-password -twoFactorSecret');
      
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but admin no longer exists.'
        });
      }

      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact super admin.'
        });
      }
      if (admin.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts.'
        });
      }

      req.admin = admin;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Admin Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

const authorizeAdmin = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Admin authentication required.'
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.admin.role}`
      });
    }

    next();
  };
};

const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Admin authentication required.'
      });
    }

    if (!req.admin.hasPermission(resource, action)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${resource}.${action}`
      });
    }

    next();
  };
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Admin authentication required.'
    });
  }

  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin role required.'
    });
  }

  next();
};

const optionalAdminAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies
    if (!token && req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        if (decoded.type === 'admin') {
          const admin = await Admin.findById(decoded.id).select('-password -twoFactorSecret');
          if (admin && admin.isActive && !admin.isLocked) {
            req.admin = admin;
          }
        }
      } catch (error) {
        console.log('Optional admin auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional Admin Auth Error:', error);
    next();
  }
};

module.exports = {
  protectAdmin,
  authorizeAdmin,
  checkPermission,
  requireSuperAdmin,
  optionalAdminAuth
};
