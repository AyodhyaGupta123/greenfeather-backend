const mongoose = require('mongoose');
const {hashPassword,comparePassword} = require("../utils/passwordUtils")

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'seller', 'superAdmin'], 
      default: 'user'
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hashPassword(this.password);
  next();
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await comparePassword(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
