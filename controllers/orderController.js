const Order = require("../models/Order")
const User = require("../models/User");
const Product = require("../models/Product");

// POST /api/orders
const isValidObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

exports.createOrder = async (req, res, next) => {
  try {
    const { orderItems, totalPrice } = req.body || {};
   
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

// Note: Assumes Order model is imported

// ----------------------------------------------------------------------------------
// Get ALL Orders that contain at least ONE item from the authenticated seller
// ----------------------------------------------------------------------------------
exports.getSellerOrders = async (req, res) => {
  try {
      const sellerId = req.user.id;

      // 1. Query for orders containing ANY item sold by this sellerId
      const orders = await Order.find({
          "orderItems.seller": sellerId
      })
          .populate("user", "name email")
          .sort({ createdAt: -1 });

      // 2. Optimized Summary Calculation (One loop instead of multiple filters)
      const summary = orders.reduce((acc, o) => {
          acc.totalOrders++;
          if (o.orderStatus === "Pending" || o.orderStatus === "Processing") {
              acc.pending++;
          } else if (o.orderStatus === "Shipped") {
              acc.shipped++;
          } else if (o.orderStatus === "Delivered") {
              acc.delivered++;
          } else if (o.orderStatus === "Cancelled") {
              acc.cancelled++;
          }
          return acc;
      }, {
          totalOrders: 0,
          pending: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
      });

      // 3. Map for the final response list
      const sellerOrdersList = orders.map(o => ({
          _id: o._id,
          customer: o.user?.name || "N/A",
          date: o.createdAt,
          status: o.orderStatus,
          // NOTE: Using finalAmount might be better here as it's the customer-facing total
          total: o.finalAmount, 
          paymentStatus: o.paymentStatus || "N/A"
      }));

      res.json({
          summary,
          orders: sellerOrdersList,
      });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching seller orders" });
  }
};

// ----------------------------------------------------------------------------------
// Update order status (Security check ensures seller is part of the order)
// ----------------------------------------------------------------------------------
exports.updateOrderStatus = async (req, res) => {
  try {
      const { orderId } = req.params;
      const { status } = req.body;
      const sellerId = req.user.id; // From token

      if (!["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"].includes(status)) {
          return res.status(400).json({ message: "Invalid status value" });
      }

      const order = await Order.findById(orderId);

      if (!order) return res.status(404).json({ message: "Order not found" });

      // Ensure this seller is part of the order (Authorization Check)
      const hasSellerItem = order.orderItems.some(
          (item) => item.seller?.toString() === sellerId
      );

      if (!hasSellerItem) {
          return res.status(403).json({ message: "You are not authorized to update this order" });
      }

      // Only allow status change if it makes sense (e.g., prevent moving from Delivered to Pending)
      // This is a simple validation check; more complex state machine logic could be added here.
      if (order.orderStatus === "Delivered" && status !== "Returned") {
           return res.status(400).json({ message: "Cannot change status of a delivered order (unless returning)." });
      }


      order.orderStatus = status;
      if (status === "Delivered") order.deliveredAt = new Date();
      if (status === "Cancelled") order.cancelledAt = new Date();
      // Add more status updates (like Shipped date, etc.) as needed

      await order.save();

      res.json({ message: "Order status updated successfully", order });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error updating order status" });
  }
};

// ----------------------------------------------------------------------------------
// Get detailed view of a single order (only showing the seller's items)
// ----------------------------------------------------------------------------------
exports.getSingleOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const sellerId = req.user.id;

        // 1. Fetch the specific order by ID and populate user.
        // Assuming your 'Order' model includes fields for paymentMethod and shippingFee.
        const order = await Order.findById(orderId)
            .populate("user", "name email");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // 2. Security Check & Item Filtering: Keep only items belonging to this seller
        const sellerItems = order.orderItems.filter(item =>
            item.seller?.toString() === sellerId
        );

        if (sellerItems.length === 0) {
            return res.status(403).json({ message: "Access denied: Order does not contain items from this seller." });
        }

        // 3. Calculate seller's total revenue from this order
        const sellerTotalRevenue = sellerItems.reduce((acc, item) =>
            acc + item.totalPrice, // item.totalPrice is qty * sellingPrice
            0
        );

        // 4. Map to the final detail structure
        const orderDetails = {
            _id: order._id,
            customer: order.user?.name || "N/A",
            customerEmail: order.user?.email || "N/A",
            date: order.createdAt,
            status: order.orderStatus,
            total: order.finalAmount, // Full order final amount (may include other sellers' items)
            sellerRevenue: sellerTotalRevenue, // Revenue specific to this seller from this order

            // ADDED/CONFIRMED FIELDS
            // Assuming 'paymentMethod' field exists on the Order document
            paymentMode: order.paymentMethod || "N/A", 
            // Assuming 'shippingFee' or 'deliveryCharge' field exists on the Order document
            deliveryCharge: order.shippingCost || order.deliveryCharge || 0, 
            paymentStatus: order.paymentStatus || "N/A",

            shippingAddress: order.shippingAddress,
            // Delivery details
            deliveryPartner: order.deliveryPartner,
            trackingId: order.trackingId,

            // Only the items this seller is responsible for
            items: sellerItems.map(item => ({
                productName: item.productName || "Product N/A",
                quantity: item.quantity,
                price: item.sellingPrice,
                // Ensure 'image' and 'category' are included as requested/current structure shows
                image: item.image, 
                color: item.color,
                size: item.size,
                unit: item.unit,
                category: item.category, 
                subcategory: item.subcategory,
                itemTotal: item.totalPrice,
            })),
        };

        res.json(orderDetails);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching order details" });
    }
};
// ----------------------------------------------------------------------------------
// Get ordewr detail by customerId (History of a specific customer's orders from this seller)
// ----------------------------------------------------------------------------------
exports.getCustomerOrderHistory = async (req, res) => {
  try {
      const { userId: customerId } = req.params;
      const sellerId = req.user?.id;

      if (!customerId || !sellerId) {
          return res.status(400).json({ message: "Customer ID and Seller ID are required." });
      }

      // 1. Query for orders by customer, containing items by this seller
      const sellerSpecificOrders = await Order.find({
          user: customerId,
          "orderItems.seller": sellerId
      })
          .select('orderStatus finalAmount createdAt orderItems') // Added finalAmount for potential use
          .sort({ createdAt: -1 });

      if (sellerSpecificOrders.length === 0) {
          return res.status(200).json([]);
      }

      const formattedHistory = sellerSpecificOrders.map(order => {
          // 2. Filter the items down to only the seller's items
          const sellerItems = order.orderItems.filter(item =>
              item.seller?.toString() === sellerId
          );

          // 3. Calculate seller's total amount for this order
          const sellerTotal = sellerItems.reduce((acc, item) =>
              acc + item.totalPrice,
              0
          );

          return {
              orderId: order._id,
              date: order.createdAt,
              status: order.orderStatus,
              sellerTotalAmount: sellerTotal,
              // Optionally include the full order final amount: fullOrderAmount: order.finalAmount,
              itemsCount: sellerItems.length,
              // Only showing minimal item details for a history list view
              itemsSummary: sellerItems.map(item => ({
                  productName: item.productName || "Product N/A",
                  quantity: item.quantity,
                  price: item.sellingPrice,
                  image: item.image,
              }))
          };
      });

      res.json(formattedHistory);

  } catch (error) {
      console.error('Error fetching seller-specific customer order history:', error);
      res.status(500).json({ message: 'Server Error: Failed to fetch order history' });
  }
};