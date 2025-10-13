const mongoose = require('mongoose');
const { hashPassword, comparePassword } = require('../utils/passwordUtils');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'superadmin', 'moderator'],
        message: 'Role must be admin, superadmin, or moderator'
      },
      default: 'admin'
    },
    permissions: {
      users: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      },
      products: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      },
      orders: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      },
      vendors: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      },
      reports: {
        view: { type: Boolean, default: true },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      },
      settings: {
        view: { type: Boolean, default: false },
        create: { type: Boolean, default: false },
        edit: { type: Boolean, default: false },
        delete: { type: Boolean, default: false }
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    lastLogin: {
      type: Date,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    profileImage: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await comparePassword(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to update last login
adminSchema.methods.updateLastLogin = function() {
  return this.updateOne({
    $set: { lastLogin: new Date() },
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check permission
adminSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'superadmin') return true;
  if (this.role === 'admin' && action === 'view') return true;
  
  return this.permissions[resource] && this.permissions[resource][action];
};

// Static method to create default super admin
adminSchema.statics.createSuperAdmin = async function() {
  const superAdminExists = await this.findOne({ role: 'superadmin' });
  
  if (!superAdminExists) {
    const superAdmin = new this({
      name: 'Super Admin',
      email: 'super@admin.com',
      password: '123456',
      role: 'superadmin',
      isVerified: true,
      permissions: {
        users: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: true },
        orders: { view: true, create: true, edit: true, delete: true },
        vendors: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, create: true, edit: true, delete: true }
      }
    });
    
    await superAdmin.save();
    console.log('Super Admin created successfully');
  }
};

// Index for better performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

module.exports = mongoose.model('Admin', adminSchema);
