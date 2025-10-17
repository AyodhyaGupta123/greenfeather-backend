const mongoose = require("mongoose");

const sellerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

  // Tax Details
  gstNumber: { type: String, default: null },
  panNumber: { type: String, default: null },
  panHolderName: { type: String, default: null },
  nonGstCategory: { type: Boolean, default: false },

  // Store Details (UPDATED)
  storeName: { type: String, default: null },
  shortTitle: { type: String, default: null }, // Added field for short store title
  storeDescription: { type: String, default: null }, // Added field for store description

  // Shipping & Pickup
  pickupAddress: {
    address: { type: String, default: null },
    city: { type: String, default: null },
    stateName: { type: String, default: null },
    pinCode: { type: String, default: null },
    country: { type: String, default: null },
  },

  // Bank Details
  bankDetails: {
    accountName: { type: String, default: null },
    accountNumber: { type: String, default: null },
    bankName: { type: String, default: null },
    ifscCode: { type: String, default: null },
  },

  stepCompleted: { type: Number, default: 0 },

  status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

sellerProfileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("SellerProfile", sellerProfileSchema);