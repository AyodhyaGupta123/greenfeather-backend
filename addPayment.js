// addPayment.js
const mongoose = require("mongoose");
require("dotenv").config();
const Payment = require("./models/Payment"); // Assuming this path is correct

const connectDB = async () => {
    try {
        // Removed deprecated options: useNewUrlParser and useUnifiedTopology
        await mongoose.connect(process.env.MONGO_URI); 
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        // Use a simple error log or re-throw if the calling function handles exit
        throw new Error("DB Connection Failed"); 
    }
};

const insertPayment = async () => {
    const paymentData = {
        "order": "68f0b3612cea386eec8ec97e",
        "transactionId": "TXN_RZP_123456789ABCXYZ", 
        "amount": 800.00, 
        "currency": "INR",
        "paymentMethod": "Card",
        "paymentStatus": "Success", 
        "paymentGateway": "Razorpay",
        "gatewayResponse": {
            "status": "authorized",
            "payment_id": "pay_1234567890",
            "method": "card"
        },
        "customerEmail": "priya.sharma@example.com",
        "customerPhone": "9876543210",
    };

    try {
        const newPayment = await Payment.create(paymentData);
        console.log("✅ Successful Payment Record Created:");
        console.log(newPayment);
    } catch (error) {
        // The error.message will contain details if required fields are missing
        console.error("❌ Error creating payment record:", error.message); 
    } finally { 
        // CRITICAL: Close the connection so the script doesn't hang
        await mongoose.connection.close(); 
        console.log("Disconnected from MongoDB.");
    }
};

// --- Execution Block ---
const runScript = async () => {
    try {
        // 1. Connect to the DB
        await connectDB();
        
        // 2. Insert the data
        await insertPayment();
        
    } catch (error) {
        // Catch connection errors and exit
        console.error("Script failed to run due to:", error.message);
        process.exit(1); 
    }
};

runScript(); // Start the process