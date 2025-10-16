const mongoose = require('mongoose');
const { hashPassword, comparePassword } = require("../utils/passwordUtils");

const userSchema = new mongoose.Schema(
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
        values: ['user', 'seller', 'admin', 'superadmin'],
        message: 'Role must be user, seller, admin, or superadmin'
      },
      default: 'user'
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // User specific fields
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
    profileImage: {
      type: String,
      default: null
    },
    // Seller specific fields
    sellerInfo: {
      businessName: String,
      businessType: String,
      gstNumber: String,
      panNumber: String,
      bankDetails: {
        accountNumber: String,
        ifscCode: String,
        bankName: String,
        accountHolderName: String
      },
      documents: {
        panCard: String,
        gstCertificate: String,
        bankStatement: String,
        businessLicense: String
      },
      isApproved: {
        type: Boolean,
        default: false
      },
      approvedAt: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      commissionRate: {
        type: Number,
        default: 10 
      }
    },
    // Admin specific fields
    adminInfo: {
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
        sellers: {
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
      }
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
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      default: null
    },

    isManuallyGenerated: {
      type: Boolean,
      default: false
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    generatedAt: {
      type: Date,
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
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await comparePassword(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; 
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  return this.updateOne({
    $set: { lastLogin: new Date() },
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check permission (for admin/superadmin)
userSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'superadmin') return true;
  if (this.role === 'admin' && action === 'view') return true;
  
  return this.adminInfo?.permissions?.[resource] && this.adminInfo.permissions[resource][action];
};

// Method to check if user is admin
userSchema.methods.isAdmin = function() {
  return ['admin', 'superadmin'].includes(this.role);
};

// Method to check if user is seller
userSchema.methods.isSeller = function() {
  return this.role === 'seller';
};

// Method to check if user is super admin
userSchema.methods.isSuperAdmin = function() {
  return this.role === 'superadmin';
};

// Static method to create super admin
userSchema.statics.createSuperAdmin = async function(adminData) {
  const superAdminExists = await this.findOne({ role: 'superadmin' });
  
  if (superAdminExists) {
    throw new Error('Super Admin already exists');
  }

  const superAdmin = new this({
    ...adminData,
    role: 'superadmin',
    isVerified: true,
    isActive: true,
    isManuallyGenerated: true,
    adminInfo: {
      permissions: {
        users: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: true },
        orders: { view: true, create: true, edit: true, delete: true },
        sellers: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, create: true, edit: true, delete: true }
      }
    }
  });
  
  return await superAdmin.save();
};

// Static method to create admin
userSchema.statics.createAdmin = async function(adminData, generatedBy) {
  const admin = new this({
    ...adminData,
    role: 'admin',
    isVerified: true,
    isActive: true,
    isManuallyGenerated: true,
    generatedBy: generatedBy,
    generatedAt: new Date(),
    adminInfo: {
      permissions: adminData.permissions || {
        users: { view: true, create: false, edit: false, delete: false },
        products: { view: true, create: false, edit: false, delete: false },
        orders: { view: true, create: false, edit: false, delete: false },
        sellers: { view: true, create: false, edit: false, delete: false },
        reports: { view: true, create: false, edit: false, delete: false },
        settings: { view: false, create: false, edit: false, delete: false }
      }
    }
  });
  
  return await admin.save();
};

// Index for better performance
// userSchema.index({ email: 1 });
// userSchema.index({ role: 1 });
// userSchema.index({ isActive: 1 });
// userSchema.index({ 'sellerInfo.isApproved': 1 });

module.exports = mongoose.model('User', userSchema);