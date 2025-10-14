const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOrder, getMyOrders, getOrderById, getSellerOrders, updateOrderStatus, getSingleOrderDetails,getCustomerOrderHistory} = require('../controllers/orderController');



// 1. SPECIFIC ROUTES (Must come first)
router.get("/seller/orders", protect, getSellerOrders); 
router.get('/customer-history/:userId', protect, getCustomerOrderHistory); // 💡 MOVED UP
router.route('/view/:orderId').get(protect, getSingleOrderDetails); // Specific fixed path segment




// 2. GENERAL ROUTES (Must come last to avoid collision)
router.get('/my', protect, getMyOrders);
router.post('/', protect, createOrder);


// These must be last or after all fixed path segments
router.put("/:orderId/status", protect, updateOrderStatus); 
router.get('/:id', protect, getOrderById); // 💡 Must be last or near the end

module.exports = router;


