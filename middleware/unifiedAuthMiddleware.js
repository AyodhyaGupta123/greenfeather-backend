const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Verify JWT token and protect routes
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Get user from token
      const user = await User.findById(decoded.id).select('-password -twoFactorSecret');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token is valid but user no longer exists.'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Check if user is locked
      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to too many failed login attempts.'
        });
      }

      req.user = user;
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
    console.error('Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Check if user has specific role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

// @desc    Check if user is admin or super admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }

  if (!req.user.isAdmin()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }

  next();
};

// @desc    Check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }

  if (!req.user.isSuperAdmin()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin role required.'
    });
  }

  next();
};

// @desc    Check if user is seller
const requireSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }

  if (!req.user.isSeller()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Seller role required.'
    });
  }

  next();
};

// @desc    Check if user has specific permission (for admin/superadmin)
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
    }

    if (!req.user.hasPermission(resource, action)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${resource}.${action}`
      });
    }

    next();
  };
};

// @desc    Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.id).select('-password -twoFactorSecret');
        if (user && user.isActive && !user.isLocked) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        console.log('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional Auth Error:', error);
    // Don't fail the request, just continue without user
    next();
  }
};

// @desc    Check if seller is approved
const requireApprovedSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication required.'
    });
  }

  if (!req.user.isSeller()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Seller role required.'
    });
  }

  if (!req.user.sellerInfo?.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Your seller account is pending approval.'
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  requireAdmin,
  requireSuperAdmin,
  requireSeller,
  checkPermission,
  optionalAuth,
  requireApprovedSeller
};
