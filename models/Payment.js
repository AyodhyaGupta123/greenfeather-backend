const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true, // One payment document per order
    },
    transactionId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        enum: ["INR", "USD", "EUR", "GBP"],
        default: "INR",
    },
    paymentMethod: {
        type: String,
        enum: ["Card", "UPI", "Net Banking"], // COD is typically handled by Order status
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Success", "Failed", "Refunded"],
        default: "Pending",
        required: true,
    },
    paymentGateway: {
        type: String, // e.g., 'Stripe', 'Razorpay', 'Paytm'
        trim: true,
    },
    // Metadata from the payment gateway (e.g., receipt URL, raw response)
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);