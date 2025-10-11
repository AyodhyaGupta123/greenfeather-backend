const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const initSuperAdmin = async () => {
  try {
    await connectDB();
    
    // Check if super admin already exists
    const superAdminExists = await User.findOne({ role: 'superadmin' });
    
    if (superAdminExists) {
      console.log('✅ Super Admin already exists:', superAdminExists.email);
      console.log('Name:', superAdminExists.name);
      console.log('Role:', superAdminExists.role);
      console.log('Created:', superAdminExists.createdAt);
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await User.createSuperAdmin({
      name: 'Super Admin',
      email: 'super@admin.com',
      password: 'SuperAdmin123!'
    });

    console.log('✅ Super Admin created successfully!');
    console.log('Email: super@admin.com');
    console.log('Password: SuperAdmin123!');
    console.log('⚠️  Please change the password after first login!');
    console.log('🔐 Full permissions granted for all resources');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
};

// Run the script
initSuperAdmin();