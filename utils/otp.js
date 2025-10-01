
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Generate 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// NodeMailer setup (simple auth)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // or OAuth2 method
  },
});

const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your GreenFeather OTP',
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
  });
};

module.exports = { generateOtp, sendOtpEmail };
