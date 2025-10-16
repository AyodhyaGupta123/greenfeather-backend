
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import User model
const User = require('../src/models/User');

const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Error: Missing email argument');
  console.log('\nUsage: node scripts/unlockAdmin.js "email@example.com"');
  console.log('\nExample:');
  console.log('  node scripts/unlockAdmin.js "superadmin@ayodhya.com"');
  console.log('  node scripts/unlockAdmin.js "chaurasiyahimanshu2002@gmail.com"');
  process.exit(1);
}

const email = args[0];

if (!email.includes('@')) {
  console.error('Error: Invalid email format');
  process.exit(1);
}

const unlockAdmin = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/greenfeather', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to database\n');

    // Find admin by email
    console.log(`Searching for admin with email: ${email}`);
    const admin = await User.findOne({ email, role: { $in: ['admin', 'superadmin', 'moderator'] } });
    
    if (!admin) {
      console.error(`Error: No admin found with email "${email}"`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Check if account is locked
    console.log(`Found admin: ${admin.name}`);
    console.log(`Current status:`);
    console.log(`  - Is Locked: ${admin.isLocked}`);
    console.log(`  - Login Attempts: ${admin.loginAttempts}`);
    console.log(`  - Locked Until: ${admin.lockUntil ? new Date(admin.lockUntil) : 'N/A'}\n`);

    if (!admin.isLocked) {
      console.log('Account is not locked. No action needed.\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Unlock the account
    console.log('Unlocking account...');
    await User.updateOne(
      { _id: admin._id },
      {
        $set: {
          loginAttempts: 0,
          lockUntil: null,
          isLocked: false
        }
      }
    );

    console.log('Success! Account unlocked.\n');
    
    // Show updated status
    const updatedAdmin = await User.findById(admin._id);
    console.log('Updated status:');
    console.log(`  - Is Locked: ${updatedAdmin.isLocked}`);
    console.log(`  - Login Attempts: ${updatedAdmin.loginAttempts}`);
    console.log(`  - Locked Until: ${updatedAdmin.lockUntil ? new Date(updatedAdmin.lockUntil) : 'N/A'}`);
    console.log(`  - Last Login: ${updatedAdmin.lastLogin ? new Date(updatedAdmin.lastLogin) : 'Never'}\n`);

    console.log('Ready to login with credentials:');
    console.log(`  Email: ${email}\n`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error unlocking admin:');
    console.error(error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
unlockAdmin();