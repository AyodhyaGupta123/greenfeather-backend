const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  sendOtp,
  verifyOtp,
  checkEmail,
  verifyPasswordAndSendOtp,
  verifyOtpAndLogin,
  getProfile,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require("../controllers/sellerAuthController");


router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

router.post("/check-email", checkEmail);
router.post("/verify-password", verifyPasswordAndSendOtp);
router.post("/verify-otp-login", verifyOtpAndLogin);

router.get("/profile", protect, getProfile);




router.post("/forgot-password", forgotPassword);


router.post("/verify-reset-otp", verifyResetOtp);


router.post("/reset-password", resetPassword);

module.exports = router;
