
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Error: MONGO_URI not set in .env');
  process.exit(1);
}

async function createSuperAdmin() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for seeding.');

    // change these values as needed — or get them from env vars
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
    const plainPassword = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe@123';

    // check if user exists
    let user = await User.findOne({ email });
    const hashed = await bcrypt.hash(plainPassword, 12);

    if (user) {
        user.role = 'superadmin';
        user.password = hashed;
        user.name = name;  
        await user.save();
        console.log('Existing user updated to Super Admin.');
      } else {
        user = new User({
          name,    
          email,
          password: hashed,
          role: 'superadmin',
        });
        await user.save();
        console.log('Super Admin created successfully.');
      }

    console.log('Credentials (change after first login):');
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err);
    process.exit(1);
  }
}

createSuperAdmin();
