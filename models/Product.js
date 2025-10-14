const mongoose = require("mongoose");

// --- 1. Size Schema (Nested within Item) ---
const sizeSchema = new mongoose.Schema({
  unit: { type: String, trim: true, required: true }, // e.g., 'Small', '100ml', 'UK 8'
  info: { type: String, trim: true }, // e.g., 'SKU-001', 'For ages 5-7'
  basePrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
});

// --- 2. Item Variant Schema (Color + Images + Sizes) ---
const itemSchema = new mongoose.Schema({
  color: { type: String, trim: true },
  images: [
    {
      url: { type: String, required: true }, // Path/URL to image file
      altText: { type: String, default: "" },
    },
  ],
  sizes: [sizeSchema], // Array of sizes/SKUs for this variant
});

// --- 3. Delivery Info Schema ---
const deliverySchema = new mongoose.Schema({
  charges: { type: Number, default: 0, min: 0 }, // delivery cost
  estimatedTime: { type: String, trim: true }, // e.g., "3–5 days"
  freeAbove: { type: Number, min: 0 }, // Free delivery above X price
  options: [{ type: String, trim: true }], // e.g., ["Standard", "Express"]
});

// --- 4. Return Policy Schema ---
const returnPolicySchema = new mongoose.Schema({
  duration: { type: String, trim: true }, // e.g., "15 days"
  condition: { type: String, trim: true }, // e.g., "Only unopened products"
  refundType: { 
    type: String, 
    enum: ["Full", "Partial", "Replacement"], 
    default: "Full" 
  },
});

// --- 5. Warranty Schema ---
const warrantySchema = new mongoose.Schema({
  summary: { type: String, trim: true }, // e.g., "1 Year Manufacturer Warranty"
  covered: { type: String, trim: true },
  notCovered: { type: String, trim: true },
  serviceType: { type: String, trim: true }, // e.g., "On-site", "Carry-in"
});

// --- 6. Main Product Schema ---
const productSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Link to seller
      required: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },

    // Basic Product Details
    productName: { type: String, required: true, trim: true },
    basicInfo: {
      title: { type: String, required: true, trim: true },
      brand: { type: String, trim: true },
      description: { type: String },
    },
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR", "GBP"],
      default: "INR",
    },

    items: [itemSchema], // Variants (color/styles)

    // Highlights & Specs
    highlights: [{ type: String, trim: true }],
    specifications: [
      {
        title: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],

    // Product Weight
    weight: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ["kg", "g", "lb", "oz"] },
    },

    // Policies
    warranty: warrantySchema,
    returnPolicy: returnPolicySchema,
    delivery: deliverySchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
