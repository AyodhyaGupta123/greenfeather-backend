const express = require("express");
const { body } = require("express-validator");
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  changePassword,
  logoutAdmin,
  getAllAdmins,
  updateAdminStatus,
} = require("../controllers/adminController");
const {
  protectAdmin,
  requireSuperAdmin,
  checkPermission,
} = require("../middleware/adminAuthMiddleware");

const router = express.Router();

const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("role")
    .optional()
    .isIn(["admin", "moderator"])
    .withMessage("Role must be admin or moderator"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("phone")
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage("Please provide a valid phone number"),
];

router.post(
  "/register",
  protectAdmin,
  requireSuperAdmin,
  registerValidation,
  registerAdmin
);
router.post("/login", loginValidation, loginAdmin);
router.get("/profile", protectAdmin, getAdminProfile);
router.put(
  "/profile",
  protectAdmin,
  updateProfileValidation,
  updateAdminProfile
);
router.put(
  "/change-password",
  protectAdmin,
  changePasswordValidation,
  changePassword
);
router.post("/logout", protectAdmin, logoutAdmin);
router.get("/admins", protectAdmin, requireSuperAdmin, getAllAdmins);
router.put("/:id/status", protectAdmin, requireSuperAdmin, updateAdminStatus);
router.get(
  "/dashboard-stats",
  protectAdmin,
  checkPermission("reports", "view"),
  async (req, res) => {
    try {
      const stats = {
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalVendors: 0,
        totalRevenue: 0,
        recentOrders: [],
        topProducts: [],
        recentUsers: [],
      };

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching dashboard stats",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      });
    }
  }
);
router.get("/permissions", protectAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        permissions: req.admin.permissions,
        role: req.admin.role,
      },
    });
  } catch (error) {
    console.error("Get Permissions Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching permissions",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
