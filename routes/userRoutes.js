// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const { generateOtp, sendOtpEmail } = require('../utils/otp');
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/userController');

// Send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ name: email.split('@')[0], email, password: crypto.randomBytes(8).toString('hex') });
  }

  const otp = generateOtp();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  try {
    await sendOtpEmail(email, otp);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP email' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'User not found' });
  if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' });

  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  res.status(200).json({ message: 'OTP verified', user });
});

// Profile routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
