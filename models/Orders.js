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
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },

  color: { type: String, trim: true },
  size: { type: String, trim: true },
  unit: { type: String, trim: true },

  basePrice: { type: Number, required: true, min: 0 },  // MRP
  sellingPrice: { type: Number, required: true, min: 0 }, // discounted
  discount: { type: Number, default: 0, min: 0 }, // optional
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true, min: 0 }, // qty × sellingPrice

  image: { type: String }, // thumbnail image
});

// --- 2. Main Order Schema ---
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
    totalAmount: { type: Number, required: true, min: 0 }, // subtotal
    finalAmount: { type: Number, required: true, min: 0 }, // total + shipping - discount

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

// --- 3. Auto-calculate totals & generate invoice before saving ---
orderSchema.pre("save", function (next) {
  // Calculate totalAmount and finalAmount
  this.totalAmount = this.orderItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  this.finalAmount = this.totalAmount + this.shippingCost - this.discount;

  // Auto-generate invoice number if not present
  if (!this.invoiceNumber) {
    this.invoiceNumber = "INV-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  next();
});

module.exports = mongoose.model("Order", orderSchema);
