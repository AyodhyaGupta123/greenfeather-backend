const mongoose = require('mongoose');
const Category = require('./models/Category');
require('dotenv').config();

const connectDB = require('./config/db');

const sampleCategories = [
  {
    name: 'Electronics',
    description: 'Electronic devices and gadgets'
  },
  {
    name: 'TVs & Appliances',
    description: 'Televisions and home appliances'
  },
  {
    name: 'Men',
    description: 'Men\'s clothing and accessories'
  },
  {
    name: 'Women',
    description: 'Women\'s clothing and accessories'
  },
  {
    name: 'Baby & Kids',
    description: 'Baby and kids products'
  },
  {
    name: 'Home & Furniture',
    description: 'Home decor and furniture'
  },
  {
    name: 'Sports, Books & More',
    description: 'Sports equipment and books'
  },
  {
    name: 'Beauty, Toys & More',
    description: 'Beauty products and toys'
  }
];

const seedCategories = async () => {
  try {
    await connectDB();
    
    // Check if categories already exist
    const existingCategories = await Category.find({});
    if (existingCategories.length > 0) {
      console.log('Categories already exist, skipping seed');
      process.exit(0);
    }
    
    // Insert sample categories
    const insertedCategories = await Category.insertMany(sampleCategories);
    console.log(`Inserted ${insertedCategories.length} categories`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
