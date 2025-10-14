require('dotenv').config();
const mongoose = require("mongoose");
const Order = require("./models/Order"); // Order model
const Product = require("./models/Product"); // Product model
const User = require("./models/User"); // User model

// --- 1. MongoDB Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

// --- 2. Create Order for new product ---
const createCustomOrder = async () => {
  try {
    const userId = "68e784aded1c33ab28917fce"; // same customer
    const productId = "68e549d8755e614f386b432d"; // new product "tv"

    const product = await Product.findById(productId);
    if (!product) throw new Error("Product not found");

    const orderItem = {
      product: product._id,
      variantInfo: {
        color: product.items[0]?.color || "Default Color",
        unit: product.items[0]?.sizes[0]?.unit || "Default Unit",
        info: product.items[0]?.sizes[0]?._id.toString() || "SKU Info",
      },
      sellingPrice: product.items[0]?.sizes[0]?.sellingPrice || 5000, // fallback price
      quantity: 1,
      image: product.items[0]?.images[0]?.url || "",
    };

    const totalAmount = orderItem.sellingPrice * orderItem.quantity;

    const newOrder = new Order({
      user: userId,
      orderItems: [orderItem],
      shippingAddress: {
        fullName: "Ayodhya Gupta",
        addressLine1: "123 Street Name",
        addressLine2: "Apartment 45",
        city: "Bhopal",
        postalCode: "462001",
        country: "India",
      },
      paymentMethod: "Card",
      totalAmount,
      currency: product.currency,
      orderStatus: "Pending",
    });

    await newOrder.save();
    console.log("Order for new product created successfully:", newOrder);
    process.exit(0);
  } catch (err) {
    console.error("Error creating order:", err);
    process.exit(1);
  }
};

// --- 3. Run Script ---
connectDB().then(() => createCustomOrder());
