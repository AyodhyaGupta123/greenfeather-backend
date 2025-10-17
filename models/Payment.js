const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // One payment per order
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
      enum: ["Card", "UPI", "Net Banking"], // COD handled via Order
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Success", "Failed", "Refunded"],
      default: "Pending",
      required: true,
    },
    paymentGateway: {
      type: String, // e.g., Razorpay, Stripe, Paytm
      trim: true,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed, // Store raw response data
    },

    // Optional Payer Info
    customerEmail: { type: String, trim: true },
    customerPhone: { type: String, trim: true },

    // Refund Info
    refundDetails: {
      refundedAt: { type: Date },
      refundTransactionId: { type: String, trim: true },
      amount: { type: Number, min: 0 },
      reason: { type: String, trim: true },
    },

    paidAt: { type: Date },
  },
  { timestamps: true }
);


paymentSchema.pre("save", function (next) {
  if (this.paymentStatus === "Success" && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
