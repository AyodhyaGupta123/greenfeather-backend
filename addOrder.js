// insertOrder.js

require('dotenv').config();
const mongoose = require("mongoose");
const Order = require("./models/Order"); // Adjust path to your Order model

// --- 1. Order Data to Insert ---
const ORDER_DATA = {
  "user": "68f0a9ac07d15521c043ea51",
  "orderItems": [
    {
      "product": "68f08eca66a91ed07aaa6101",
      "seller": "68f0887566a91ed07aaa60ce",
      "productName": "T-Shirt",
      "brand": "Puma",
      
      // 💡 UPDATED: Category is now the string name "man"
      "category": "man", 
      
      // 💡 UPDATED: Subcategory is now the string name "clothing"
      "subcategory": "clothing", 
      
      "color": "Maroon",
      "size": "m",
      "unit": "m",
      "basePrice": 500,
      "sellingPrice": 400,
      "discount": 0,
      "quantity": 2, 
      "totalPrice": 800, 
      "image": "uploads/1760595658626-247724129.jpg"
    }
  ],
  "shippingAddress": {
    "fullName": "Pravin Maurya",
    "phone": "9876543210", 
    "addressLine1": "Flat No 101, Green Apartments",
    "addressLine2": "Near City Center Mall",
    "city": "Mumbai",
    "postalCode": "400001",
    "state": "Maharashtra",
    "country": "India"
  },
  "paymentMethod": "Card",
  "paymentStatus": "Paid",
  
  "shippingCost": 50,
  "discount": 0,
  
  "totalAmount": 800, 
  "finalAmount":800, 
  
  "currency": "INR",
  "orderStatus": "Processing",
};

// --- 2. MongoDB Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully. 🔗");
  } catch (err) {
    console.error("MongoDB connection error: ", err);
    process.exit(1);
  }
};

// --- 3. Insertion Function ---
const insertOrder = async () => {
  try {
    console.log("Attempting to insert order data...");
    
    const newOrder = await Order.create(ORDER_DATA);

    console.log("✅ Order inserted successfully!");
    console.log(`Order ID: ${newOrder._id}`);
    console.log(`Generated Invoice Number: ${newOrder.invoiceNumber}`);
    console.log(`Final Calculated Amount: ₹${newOrder.finalAmount.toFixed(2)}`);

  } catch (error) {
    console.error("❌ Error during order insertion: ", error.message);
  } finally {
    mongoose.connection.close();
  }
};

// --- 4. Execute Script ---
connectDB().then(() => insertOrder());