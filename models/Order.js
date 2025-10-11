const mongoose = require("mongoose");

// --- 1. Order Item Schema (Nested within Order) ---
const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    variantInfo: {
        color: { type: String, trim: true },
        unit: { type: String, trim: true }, 
        info: { type: String, trim: true }, 
    },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String }, 
});

// --- 2. Main Order Schema ---
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
        fullName: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
    },
    paymentMethod: {
        type: String,
        enum: ["Card", "Cash on Delivery", "UPI", "Net Banking"],
        required: true,
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment', 
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        enum: ["INR", "USD", "EUR", "GBP"],
        default: "INR",
    },
    orderStatus: {
        type: String,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
        default: "Pending",
    },
    deliveredAt: {
        type: Date,
    },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);