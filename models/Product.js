const mongoose = require("mongoose");

// --- 1. Size Schema (Nested within Item) ---
const sizeSchema = new mongoose.Schema({
    unit: { type: String, trim: true, required: true }, // e.g., 'Small', '100ml', 'UK 8'
    info: { type: String, trim: true }, // e.g., 'SKU-001', 'For ages 5-7'
    basePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
});


const itemSchema = new mongoose.Schema({
    color: { type: String, trim: true },
    images: [{
        url: { type: String, required: true }, // Path/URL to the image file
        altText: { type: String, default: "" },
    }],
    sizes: [sizeSchema], // Array of sizes/SKUs for this variant
});

// --- 3. Main Product Schema ---
const productSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming you have a User model
        required: true,
    },
    sku: {
        type: String,
        required: true,
        unique: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory', // You should link subcategory to its ID, not name
        required: true,
    },
    productName: { // The main name from the form
        type: String,
        required: true,
        trim: true,
    },
    basicInfo: {
        title: { type: String, required: true, trim: true }, // Title used in the form
        brand: { type: String, trim: true },
        description: { type: String },
    },
    currency: {
        type: String,
        enum: ["INR", "USD", "EUR", "GBP"],
        default: "INR",
    },
    items: [itemSchema], // Array of variants (colors/styles)

    // Details Section
    highlights: [{ type: String, trim: true }],
    specifications: [{
        title: { type: String, trim: true },
        description: { type: String, trim: true },
    }],
    weight: {
        value: { type: Number, min: 0 },
        unit: { type: String, enum: ["kg", "g", "lb", "oz"] },
    },

    // Policy Section
    returnPolicy: { type: String },
    warranty: {
        summary: { type: String },
        covered: { type: String },
        notCovered: { type: String },
        serviceType: { type: String },
    },
    
    // Auto-timestamps
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);