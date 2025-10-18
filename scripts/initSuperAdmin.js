const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
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
      console.log('\n⚠️  Super Admin already exists!\n');
      console.log('Email:', superAdminExists.email);
      console.log('Name:', superAdminExists.name);
      console.log('Role:', superAdminExists.role);
      console.log('Active:', superAdminExists.isActive ? 'Yes' : 'No');
      console.log('Locked:', superAdminExists.isLocked ? 'Yes' : 'No');
      console.log('Created:', superAdminExists.createdAt);
      
      // Unlock if locked
      if (superAdminExists.isLocked) {
        console.log('\nUnlocking account...');
        await User.updateOne(
          { _id: superAdminExists._id },
          {
            $set: {
              loginAttempts: 0,
              lockUntil: null,
              isLocked: false
            }
          }
        );
        console.log('Unlocked successfully!');
      }
      
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create super admin with full permissions
    console.log('\nCreating Super Admin account...\n');
    
    const superAdmin = await User.create({
      name: 'Ayodhya Gupta',
      email: 'superadmin@ayodhya.com',
      password: '22558800@ag',
      role: 'superadmin',
      permissions: {
        users: { view: true, create: true, edit: true, delete: true },
        products: { view: true, create: true, edit: true, delete: true },
        orders: { view: true, create: true, edit: true, delete: true },
        sellers: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, create: true, edit: true, delete: true }
      },
      isActive: true,
      isVerified: true,
      loginAttempts: 0,
      lockUntil: null,
      isLocked: false
    });

    console.log('✅ Super Admin created successfully!\n');
    console.log('━'.repeat(60));
    console.log('📋 Superadmin Credentials');
    console.log('━'.repeat(60));
    console.log(`  ID:        ${superAdmin._id}`);
    console.log(`  Name:      ${superAdmin.name}`);
    console.log(`  Email:     ${superAdmin.email}`);
    console.log(`  Password:  22558800@ag`);
    console.log(`  Role:      ${superAdmin.role}`);
    console.log(`  Active:    Yes`);
    console.log(`  Verified:  Yes`);
    console.log('━'.repeat(60));
    console.log('\n🚀 Next Steps:');
    console.log('  1. Start your backend server');
    console.log('  2. Go to http://localhost:5000/login');
    console.log('  3. Use the credentials above to login');
    console.log('  4. Change password immediately after first login\n');
    
    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('  • This account has full system access');
    console.log('  • Change the password after first login');
    console.log('  • Use a stronger password in production');
    console.log('  • Never commit passwords to version control\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during initialization:', error.message);
    if (error.code === 11000) {
      console.error('\n💡 Duplicate key error - email already exists');
      console.error('   Run: node scripts/unlockAdmin.js superadmin@ayodhya.com');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
};

initSuperAdmin();