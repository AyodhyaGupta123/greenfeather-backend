const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderItems: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    qty: Number,
    price: Number
  }],
  totalPrice: { type: Number, required: true },
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
