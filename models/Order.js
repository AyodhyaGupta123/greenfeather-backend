const mongoose = require("mongoose");

// --- 1. Order Item Schema (Snapshot of product at purchase time) ---
const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // seller reference
        required: true,
    },
    // Snapshot details (so order info stays even if product changes later)
    productName: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    
    // 💡 MODIFICATION 1: Changed to store the Category Name (String)
    category: { type: String, trim: true }, 
    
    // 💡 MODIFICATION 2: Changed to store the Subcategory Name (String)
    subcategory: { type: String, trim: true }, 

    color: { type: String, trim: true },
    size: { type: String, trim: true },
    unit: { type: String, trim: true },

    basePrice: { type: Number, required: true, min: 0 }, 
    sellingPrice: { type: Number, required: true, min: 0 }, 
    discount: { type: Number, default: 0, min: 0 }, 
    quantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 }, 

    image: { type: String }, 
});

// -------------------------------------------------------------------
// --- 2. Main Order Schema (No Change) ---
const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        orderItems: [orderItemSchema],

        shippingAddress: {
            fullName: { type: String, required: true },
            phone: { type: String, required: true },
            addressLine1: { type: String, required: true },
            addressLine2: { type: String },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            state: { type: String },
            country: { type: String, required: true },
        },

        paymentMethod: {
            type: String,
            enum: ["Card", "Cash on Delivery", "UPI", "Net Banking"],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed", "Refunded"],
            default: "Pending",
        },
        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
        },

        // Totals
        shippingCost: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        finalAmount: { type: Number, required: true, min: 0 },

        currency: {
            type: String,
            enum: ["INR", "USD", "EUR", "GBP"],
            default: "INR",
        },

        // Order Lifecycle
        orderStatus: {
            type: String,
            enum: [
                "Pending",
                "Processing",
                "Shipped",
                "Delivered",
                "Cancelled",
                "Returned",
            ],
            default: "Pending",
        },
        deliveredAt: { type: Date },
        cancelledAt: { type: Date },

        // Delivery Info
        deliveryPartner: { type: String },
        trackingId: { type: String },

        // Extra Info
        invoiceNumber: { type: String, unique: true },
        notes: { type: String, trim: true },
    },
    { timestamps: true }
);

// --- 3. Auto-calculate totals & generate invoice before saving (No Change) ---
orderSchema.pre("save", function (next) {
    this.totalAmount = this.orderItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
    );

    this.finalAmount = this.totalAmount + this.shippingCost - this.discount;

    if (!this.invoiceNumber) {
        this.invoiceNumber = "INV-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    }

    next();
});

module.exports = mongoose.model("Order", orderSchema);