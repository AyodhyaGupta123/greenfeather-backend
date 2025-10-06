const Order = require('../models/Order');

// POST /api/orders
const isValidObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

exports.createOrder = async (req, res, next) => {
  try {
    const { orderItems, totalPrice } = req.body || {};
    // Allow zero/unknown total at creation; can be computed later
    const safeTotal = typeof totalPrice === 'number' && isFinite(totalPrice) ? totalPrice : 0;

    let sourceItems = Array.isArray(orderItems) && orderItems.length > 0
      ? orderItems
      : (Array.isArray(req.body?.cartItems) && req.body.cartItems.length > 0
          ? req.body.cartItems
          : (Array.isArray(req.body?.items) ? req.body.items : []));

    let normalizedItems = sourceItems.map((i) => ({
      product: isValidObjectId(i.product) ? i.product : undefined,
      qty: Number(i.qty || i.quantity) || 1,
      price: Number(i.price) || 0,
    }));

    if (!Array.isArray(normalizedItems) || normalizedItems.length === 0) {
      // As a fallback (demo-friendly), allow creating an order with a single placeholder line
      normalizedItems = [{ qty: 1, price: safeTotal }];
    }

    const order = await Order.create({
      user: req.user._id,
      orderItems: normalizedItems,
      totalPrice: safeTotal,
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/my
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('orderItems.product');
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('orderItems.product');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

