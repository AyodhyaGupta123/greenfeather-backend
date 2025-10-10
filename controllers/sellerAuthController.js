const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");
const SellerProfile = require("../models/SellerProfile");

let otpStore = {}; // temporary in-memory OTP store

// ---------------------------
// SEND OTP FOR SIGNUP
// ---------------------------
exports.sendOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, name, password, expires: Date.now() + 5 * 60 * 1000 };

    await sendEmail(email, "Your GreenFeather OTP", `Your OTP is: ${otp}. It is valid for 5 minutes.`);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP" });
  }
};

// ---------------------------
// VERIFY SIGNUP OTP
// ---------------------------
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otpStore[email])
      return res.status(400).json({ message: "No OTP found, please request again" });

    const stored = otpStore[email];

    if (stored.expires < Date.now()) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP expired, request again" });
    }

    if (parseInt(otp) !== stored.otp)
      return res.status(400).json({ message: "Invalid OTP" });

    // ✅ Create user, password will auto hash via pre-save hook
    const user = await User.create({
      name: stored.name,
      email,
      password: stored.password,
      role: "seller",
    });

    delete otpStore[email];

    res.status(201).json({
      message: "Signup successful",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------
// LOGIN FLOW
// ---------------------------

// Step 1: Check Email
exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Email not registered" });
    res.json({ message: "Email exists. Enter password", emailExists: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Step 2: Verify Password & Send OTP
exports.verifyPasswordAndSendOtp = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Use matchPassword from schema
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = otp;

    await sendEmail(email, "Your GreenFeather OTP", `Your OTP is: ${otp}. It is valid for 5 minutes.`);

    res.json({ message: "Password correct. OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Step 3: Verify OTP & Login
exports.verifyOtpAndLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otpStore[email] || parseInt(otp) !== otpStore[email]) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    delete otpStore[email];

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "seller") {
      return res.status(403).json({ message: "Unauthorized: Only sellers can login" });
    }

    // Generate JWT token
    const token = generateToken({ id: user._id });

    // Fetch seller profile
    const sellerProfile = await SellerProfile.findOne({ userId: user._id });
    let onboardingCompleted = false;
    if (sellerProfile && sellerProfile.stepCompleted === 4) onboardingCompleted = true;

    res.json({
      message: "Login successful",
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      token,
      onboardingCompleted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------
// GET PROFILE
// ---------------------------
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "seller") {
      return res.status(403).json({ message: "Unauthorized: Only sellers can access profile" });
    }

    const sellerProfile = await SellerProfile.findOne({ userId: user._id });
    let onboardingCompleted = false;
    if (sellerProfile && sellerProfile.stepCompleted === 4) onboardingCompleted = true;

    res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      onboardingCompleted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------
// FORGOT PASSWORD FLOW
// ---------------------------

// Step 1: Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

    await sendEmail(email, "GreenFeather Password Reset OTP", `Your password reset OTP is: ${otp}. It is valid for 5 minutes.`);

    res.status(200).json({ message: "OTP sent to email successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending reset OTP" });
  }
};

// Step 2: Verify Reset OTP
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const stored = otpStore[email];
    if (!stored) return res.status(400).json({ message: "No OTP found. Request again." });
    if (stored.expires < Date.now()) {
      delete otpStore[email];
      return res.status(400).json({ message: "OTP expired. Please request again." });
    }

    if (parseInt(otp) !== stored.otp)
      return res.status(400).json({ message: "Invalid OTP" });

    otpStore[email].verified = true;

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

// Step 3: Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: "Email and new password required" });

    const stored = otpStore[email];
    if (!stored || !stored.verified) return res.status(400).json({ message: "OTP not verified or expired" });

    const user = await User.findOne({ email, role: "seller" });
    if (!user) return res.status(404).json({ message: "Seller user not found" });

    // ✅ Assign new password, schema pre-save will hash it
    user.password = newPassword;
    await user.save();

    delete otpStore[email];

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error resetting password" });
  }
};
