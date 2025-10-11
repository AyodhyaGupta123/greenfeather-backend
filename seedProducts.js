const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Subcategory = require('./models/Subcategory');
const User = require('./models/User');
require('dotenv').config();

const connectDB = require('./config/db');

const sampleProducts = [
  {
    productName: "Smartphone X Pro",
    basicInfo: {
      title: "Smartphone X Pro",
      brand: "TechBrand",
      description: "Latest smartphone with advanced features"
    },
    currency: "INR",
    items: [{
      color: "Black",
      images: [{ url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80" }],
      sizes: [{
        unit: "128GB",
        info: "SKU-001",
        basePrice: 45000,
        sellingPrice: 49999,
        quantity: 50
      }]
    }],
    highlights: ["5G Ready", "48MP Camera", "Fast Charging"],
    specifications: [
      { title: "Display", description: "6.1 inch OLED" },
      { title: "Storage", description: "128GB" }
    ],
    weight: { value: 200, unit: "g" },
    returnPolicy: "30 days return policy",
    warranty: {
      summary: "1 year manufacturer warranty",
      covered: "Hardware defects",
      notCovered: "Physical damage",
      serviceType: "Authorized service centers"
    }
  },
  {
    productName: "Wireless Earbuds",
    basicInfo: {
      title: "Wireless Earbuds",
      brand: "AudioTech",
      description: "High-quality wireless earbuds with noise cancellation"
    },
    currency: "INR",
    items: [{
      color: "White",
      images: [{ url: "https://images.unsplash.com/photo-1580894894513-7e5451f6211d?auto=format&fit=crop&w=800&q=80" }],
      sizes: [{
        unit: "Standard",
        info: "SKU-002",
        basePrice: 3000,
        sellingPrice: 3499,
        quantity: 100
      }]
    }],
    highlights: ["Noise Cancellation", "8hr Battery", "Bluetooth 5.0"],
    specifications: [
      { title: "Battery", description: "8 hours playback" },
      { title: "Connectivity", description: "Bluetooth 5.0" }
    ],
    weight: { value: 50, unit: "g" },
    returnPolicy: "15 days return policy",
    warranty: {
      summary: "6 months warranty",
      covered: "Manufacturing defects",
      notCovered: "Water damage",
      serviceType: "Online support"
    }
  },
  {
    productName: "Laptop Ultra 15\"",
    basicInfo: {
      title: "Laptop Ultra 15\"",
      brand: "LaptopPro",
      description: "High-performance laptop for professionals"
    },
    currency: "INR",
    items: [{
      color: "Silver",
      images: [{ url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80" }],
      sizes: [{
        unit: "16GB RAM",
        info: "SKU-003",
        basePrice: 75000,
        sellingPrice: 79999,
        quantity: 25
      }]
    }],
    highlights: ["16GB RAM", "512GB SSD", "Intel i7"],
    specifications: [
      { title: "Processor", description: "Intel Core i7" },
      { title: "RAM", description: "16GB DDR4" },
      { title: "Storage", description: "512GB SSD" }
    ],
    weight: { value: 1.8, unit: "kg" },
    returnPolicy: "30 days return policy",
    warranty: {
      summary: "2 years warranty",
      covered: "Hardware and software",
      notCovered: "Physical damage",
      serviceType: "Authorized service centers"
    }
  }
];

const seedProducts = async () => {
  try {
    await connectDB();
    
    // Check if products already exist
    const existingProducts = await Product.find({});
    if (existingProducts.length > 0) {
      console.log('Products already exist, skipping seed');
      process.exit(0);
    }
    
    // Get a category (assuming Electronics exists)
    const electronicsCategory = await Category.findOne({ name: 'Electronics' });
    if (!electronicsCategory) {
      console.log('Electronics category not found. Please run seedCategories.js first.');
      process.exit(1);
    }
    
    // Get a subcategory
    const subcategory = await Subcategory.findOne({ categoryId: electronicsCategory._id });
    if (!subcategory) {
      console.log('No subcategory found. Please create subcategories first.');
      process.exit(1);
    }
    
    // Get a seller user
    const seller = await User.findOne({ role: 'seller' });
    if (!seller) {
      console.log('No seller user found. Please create a seller user first.');
      process.exit(1);
    }
    
    // Add seller and category info to products
    const productsWithIds = sampleProducts.map(product => ({
      ...product,
      seller: seller._id,
      category: electronicsCategory._id,
      subcategory: subcategory._id,
      sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    }));
    
    // Insert sample products
    const insertedProducts = await Product.insertMany(productsWithIds);
    console.log(`Inserted ${insertedProducts.length} products`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  }
};

seedProducts();
