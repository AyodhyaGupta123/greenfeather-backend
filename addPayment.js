// addPayment.js
const mongoose = require("mongoose");
require("dotenv").config();
const Payment = require("./models/Payment");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

const addPayment = async () => {
  try {
    // 1️⃣ Connect to DB first
    await connectDB();

    // 2️⃣ Then insert payment data
    const newPayment = new Payment({
      order: new mongoose.Types.ObjectId("68e4e663aadbd5a2fb70c1a1"),
      transactionId: "TXN_" + Date.now(),
      amount: 550,
      currency: "INR",
      paymentMethod: "UPI",
      paymentStatus: "Success",
      paymentGateway: "Razorpay",
      gatewayResponse: {
        orderId: "order_L8Y89xyz123",
        paymentId: "pay_L8Y8ABC456",
        signature: "test_signature_example",
      },
    });

    await newPayment.save();
    console.log("✅ Payment added successfully");
  } catch (err) {
    console.error("❌ Error adding payment:", err);
  } finally {
    mongoose.connection.close();
  }
};

addPayment();
