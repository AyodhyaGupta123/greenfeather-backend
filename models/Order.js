const mongoose = require("mongoose");

// --- 1. Order Item Schema (Nested within Order) ---
// This captures the state of the product/price at the time of purchase
const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    // Captures the specific variant/size purchased
    variantInfo: {
        color: { type: String, trim: true },
        unit: { type: String, trim: true }, // Size/Unit purchased (e.g., 'Medium', '100g')
        info: { type: String, trim: true }, // SKU or specific size detail
    },
    // Price and quantity at the time of order
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String }, // Main image URL for the variant
});

// --- 2. Main Order Schema ---
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    orderItems: [orderItemSchema], // List of products bought
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
    // Reference to the Payment document
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