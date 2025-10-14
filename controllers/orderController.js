const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");

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



// show order by id


exports.getSellerOrders = async (req, res) => {
  try {
      const sellerId = req.user.id;

      const orders = await Order.find()
          .populate("user", "name email") 
          .populate({
              // Change path back to 'orderItems.product'
              path: "orderItems.product", 
              select: "name seller"
          })
          .sort({ createdAt: -1 });

      // Update filtering to use 'orderItems'
      const sellerOrders = orders.filter(order =>
          order.orderItems.some(item =>
              item.product?.seller?.toString() === sellerId
          )
      );

      // ---
      
      // Summary Calculation
      const summary = {
          totalOrders: sellerOrders.length,
          // Assuming "Placed" orders are the ones to be tracked as new/pending before shipping
          pending: sellerOrders.filter(o => o.orderStatus === "Placed").length, 
          shipped: sellerOrders.filter(o => o.orderStatus === "Shipped").length,
          delivered: sellerOrders.filter(o => o.orderStatus === "Delivered").length, // Added Delivered for better tracking
          cancelled: sellerOrders.filter(o => o.orderStatus === "Cancelled").length,
      };

      // ---

      // Final Response Mapping
      res.json({
          summary,
          orders: sellerOrders.map(o => ({
              _id: o._id,
              // Get customer name from the populated 'user' field
              customer: o.user?.name || "N/A", 
              // Get the order date
              date: o.createdAt, 
              // Get the order status
              status: o.orderStatus, 
              // Get the total amount (which is at the root of the order document)
              total: o.totalAmount, 
              paymentStatus: o.paymentStatus || "N/A"
          })),
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching seller orders" });
  }
};




// ✅ Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const sellerId = req.user.id; // From token

    if (!["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(orderId).populate("orderItems.product", "seller");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Ensure this seller is part of the order
    const hasSellerItem = order.orderItems.some(
      (item) => item.product?.seller?.toString() === sellerId
    );

    if (!hasSellerItem) {
      return res.status(403).json({ message: "You are not authorized to update this order" });
    }

    order.orderStatus = status;
    if (status === "Delivered") order.deliveredAt = new Date();

    await order.save();

    res.json({ message: "Order status updated successfully", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating order status" });
  }
};




// In orderController.js

exports.getSingleOrderDetails = async (req, res) => {
  try {
      const { orderId } = req.params; // Changed 'id' to 'orderId' to match the route parameter
      const sellerId = req.user.id; // decoded from JWT

      // 1. Fetch the specific order by ID and populate nested fields
      const order = await Order.findById(orderId)
          .populate("user", "name email") 
          .populate({
              path: "orderItems.product", 
              select: "name seller"
          });

      if (!order) {
          return res.status(404).json({ message: "Order not found" });
      }

      // 2. Security Check & Item Filtering: Keep only items belonging to this seller
      const sellerItems = order.orderItems.filter(item => 
          item.product?.seller?.toString() === sellerId
      );

      if (sellerItems.length === 0) {
          // If the order exists but doesn't contain any of this seller's products, deny access.
          return res.status(403).json({ message: "Access denied: Order does not belong to this seller." });
      }

      // 3. Map to the final detail structure
      const sellerTotalRevenue = sellerItems.reduce((acc, item) => 
          acc + (item.sellingPrice * item.quantity), 0
      );
      
      const orderDetails = {
          _id: order._id,
          customer: order.user?.name || "N/A",
          customerEmail: order.user?.email || "N/A",
          date: order.createdAt,
          status: order.orderStatus,
          total: order.totalAmount, // Full order total
          paymentStatus: order.paymentStatus || "N/A",
          shippingAddress: order.shippingAddress,
          
          // Only the items this seller is responsible for
          items: sellerItems.map(item => ({
              productName: item.product?.name || "Product N/A",
              quantity: item.quantity,
              price: item.sellingPrice,
              image: item.image,
              variant: item.variantInfo,
              itemTotal: item.sellingPrice * item.quantity,
          })),
          sellerTotalRevenue: sellerTotalRevenue // Seller's specific earning from this order
      };

      res.json(orderDetails);
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching order details" });
  }
};


//Get ordewr detail by coustomerid
exports.getCustomerOrderHistory = async (req, res) => {
  try {
      const {  userId } = req.params;
      const customerId = userId
      console.log("params ", customerId)
      const sellerId = req.user?.id;
      console.log("seller id",sellerId)

      if (!customerId) {
          return res.status(400).json({ message: "Customer ID is required." });
      }

      const allCustomerOrders = await Order.find({ user: customerId })
          .select('orderStatus totalAmount createdAt orderItems')
          .populate({
              path: 'orderItems.product',
              select: 'name seller image variantInfo sellingPrice quantity', // Added necessary fields for item mapping
          })
          .sort({ createdAt: -1 });

      const sellerSpecificOrders = allCustomerOrders.filter(order =>
          order.orderItems.some(item =>
              item.product?.seller?.toString() === sellerId
          )
      );

      if (sellerSpecificOrders.length === 0) {
          return res.status(200).json([]);
      }

      const formattedHistory = sellerSpecificOrders.map(order => {
          const sellerItems = order.orderItems.filter(item =>
              item.product?.seller?.toString() === sellerId
          );

          const sellerTotal = sellerItems.reduce((acc, item) =>
              acc + (item.sellingPrice * item.quantity), 0
          );

          return {
              orderId: order._id,
              date: order.createdAt,
              status: order.orderStatus,
              sellerTotalAmount: sellerTotal,
              items: sellerItems.map(item => ({
                  productName: item.product?.name || "Product N/A",
                  quantity: item.quantity,
                  price: item.sellingPrice,
                  image: item.image,
                  variant: item.variantInfo,
              }))
          };
      });

      res.json(formattedHistory);

  } catch (error) {
      console.error('Error fetching seller-specific customer order history:', error);
      res.status(500).json({ message: 'Server Error: Failed to fetch order history' });
  }
};