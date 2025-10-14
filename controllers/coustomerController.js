// analyticsController.js
const mongoose = require("mongoose");
const Order = require("../models/Order"); 
const User = require("../models/User"); 
const Product = require("../models/Product"); // <-- Ensure Product model is available

/**
 * Helper function to get the start of the current month
 */
const getStartOfMonth = () => {
    const now = new Date();
    // Set to the first day of the month at 00:00:00.000
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

// --- 0. Helper: Get Orders Relevant to the Seller ---
const getSellerRelevantOrdersPipeline = (sellerId) => ([
    // 1. Unwind orderItems to treat each item separately
    { $unwind: "$orderItems" },
    // 2. Lookup the Product details for the item
    {
        $lookup: {
            from: "products", // Collection name for Product model
            localField: "orderItems.product",
            foreignField: "_id",
            as: "productDetails"
        }
    },
    // 3. Unwind productDetails (should be one document)
    { $unwind: "$productDetails" },
    // 4. Filter by the current seller's ID
    {
        $match: {
            "productDetails.seller": new mongoose.Types.ObjectId(sellerId)
        }
    },
    // 5. Group the order items back into their original orders
    // Use $first to preserve the original order data (user, totalAmount, createdAt)
    {
        $group: {
            _id: "$_id", // Group by Order ID
            user: { $first: "$user" },
            totalAmount: { $first: "$totalAmount" },
            createdAt: { $first: "$createdAt" },
            // Optional: Sum only the amount related to the seller's products (more complex but accurate)
            // For simplicity, we are using the total order amount here, 
            // but the filter ensures the customer is an *active* buyer of the seller.
        }
    }
]);


// --- 1. Seller Customer Metrics (Total, New this Month, High Spenders) ---
const getCustomerMetrics = async (req, res) => {
    try {
        const sellerId = req.user.id; // Get the ID from the protected route
        const startOfMonth = getStartOfMonth();

        // Start with the seller-filtered orders pipeline
        const sellerOrdersPipeline = getSellerRelevantOrdersPipeline(sellerId);
        
        const metricsPipeline = [
            ...sellerOrdersPipeline,
            // 6. Group all orders by unique user to find total spent and first order date
            {
                $group: {
                    _id: "$user", // Group by User ID
                    totalSpent: { $sum: "$totalAmount" }, // Use order total, not item total
                    firstOrderDate: { $min: "$createdAt" }
                }
            },
            // 7. Calculate overall metrics (Total Customers, New this Month)
            {
                $group: {
                    _id: null, // Group all documents together
                    totalCustomers: { $sum: 1 }, 
                    newThisMonth: {
                        $sum: {
                            $cond: [{ $gte: ["$firstOrderDate", startOfMonth] }, 1, 0]
                        }
                    },
                    highSpendersIds: {
                        $push: {
                            _id: "$_id", // The User ID
                            totalSpent: "$totalSpent"
                        }
                    }
                }
            },
            // 8. Find top 3 High Spenders
            { $unwind: "$highSpendersIds" },
            { $sort: { "highSpendersIds.totalSpent": -1 } },
            { $limit: 3 }, 
            {
                $group: {
                    _id: null,
                    totalCustomers: { $first: "$totalCustomers" },
                    newThisMonth: { $first: "$newThisMonth" },
                    highSpenderIds: { $push: "$highSpendersIds._id" }
                }
            }
        ];

        const metrics = await Order.aggregate(metricsPipeline);

        // ... (Remaining logic for metrics is largely the same)
        const customerMetrics = metrics[0] || { totalCustomers: 0, newThisMonth: 0, highSpenderIds: [] };

        // Fetch User details for High Spenders
        const highSpendersDetails = await User.find({
            _id: { $in: customerMetrics.highSpenderIds }
        }).select('name email');

        res.status(200).json({
            totalCustomers: customerMetrics.totalCustomers,
            newThisMonth: customerMetrics.newThisMonth,
            highSpenders: highSpendersDetails
        });

    } catch (error) {
        console.error("Error fetching seller customer metrics:", error);
        res.status(500).json({ message: "Server error fetching metrics." });
    }
};

// -------------------------------------------------------------------
// --- 2. Seller Customer Table Data ---
const getCustomerTableData = async (req, res) => {
    try {
        const sellerId = req.user.id; // Get the ID from the protected route
        
        const sellerOrdersPipeline = getSellerRelevantOrdersPipeline(sellerId);

        const tableDataPipeline = [
            ...sellerOrdersPipeline,
            // 6. Group all relevant orders by user
            {
                $group: {
                    _id: "$user", // Group by User ID
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: "$totalAmount" }, // Using total order amount
                    lastOrderDate: { $max: "$createdAt" }
                }
            },
            // 7. Lookup User details (Customer Name, Email)
            {
                $lookup: {
                    from: "users", 
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            // 8. Project the final structure
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    customerId: "$_id",
                    customerName: "$userDetails.name",
                    email: "$userDetails.email",
                    orders: "$totalOrders",
                    totalSpent: { $round: ["$totalSpent", 2] }, 
                    lastOrder: "$lastOrderDate"
                }
            },
            { $sort: { lastOrder: -1 } }
        ];

        const customerData = await Order.aggregate(tableDataPipeline);

        res.status(200).json(customerData);

    } catch (error) {
        console.error("Error fetching seller customer table data:", error);
        res.status(500).json({ message: "Server error fetching customer table data." });
    }
};

const getCustomerOrderHistory = async (req, res) => {
    try {
        const { customerId } = req.params;

        // 1. Find all orders associated with this customerId
        // We use .sort({ createdAt: -1 }) to show the latest order first
        const orders = await Order.find({ customer: customerId })
            .select('orderId totalAmount status orderDate items') // Select relevant fields
            .sort({ orderDate: -1 });

        if (!orders || orders.length === 0) {
            // Return an empty array if no orders are found, which is a success state for an empty history
            return res.status(200).json([]);
        }

        // 2. Format the data for the frontend
        const formattedHistory = orders.map(order => ({
            orderId: order.orderId, // Or use order._id
            date: order.orderDate,
            totalAmount: order.totalAmount,
            status: order.status,
            numberOfItems: order.items.length,
            // Optionally, you can include brief item details if needed
        }));

        res.json(formattedHistory);

    } catch (error) {
        console.error('Error fetching customer order history:', error);
        res.status(500).json({ message: 'Server Error: Failed to fetch order history' });
    }
};



module.exports = {
    getCustomerMetrics,
    getCustomerTableData,
    getCustomerOrderHistory
};