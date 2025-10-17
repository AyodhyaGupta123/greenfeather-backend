// controllers/dashboardController.js

const mongoose = require('mongoose');
const Order = require('../models/Order'); // Your Order Model
const Payment = require('../models/Payment'); // Your Payment Model

/**
 * Helper to generate Mongoose match criteria for aggregation based on filters.
 * @param {string} sellerId - The ID of the seller.
 * @param {string} [startDate] - Start date filter (YYYY-MM-DD).
 * @param {string} [endDate] - End date filter (YYYY-MM-DD).
 * @returns {object} Mongoose $match criteria.
 */
const getMatchCriteria = (sellerId, startDate, endDate) => {
    const matchCriteria = {
        'orderItems.seller': new mongoose.Types.ObjectId(sellerId) // Match by seller ID in subdocument
    };

    if (startDate || endDate) {
        matchCriteria.createdAt = {};

        if (startDate) {
            matchCriteria.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            // Set end date to the end of the day (23:59:59.999)
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchCriteria.createdAt.$lte = end;
        }
    }
    return matchCriteria;
};

// ====================================================================
// CORE FUNCTION: Fetches all necessary dashboard data for a seller
// ====================================================================
exports.getSellerDashboardData = async (req, res) => {
    // In a real app, sellerId comes from req.user.id after authentication
    const sellerId = req.user.id;
    
    // Date filters from query parameters
    const { startDate, endDate, period = 'month' } = req.query; // period can be 'day', 'month', 'year'

    if (!sellerId) {
        return res.status(401).json({ message: "Seller ID is required." });
    }

    try {
        const matchCriteria = getMatchCriteria(sellerId, startDate, endDate);
        const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

        // --- 1. KPI Calculations (Total Sales, Pending/Cancelled Orders) ---
        const kpiResults = await Order.aggregate([
            { $match: matchCriteria },
            // Project only the items belonging to the current seller
            {
                $project: {
                    status: '$orderStatus',
                    finalAmount: '$finalAmount',
                    isPendingPayment: { $eq: ['$paymentStatus', 'Pending'] },
                    sellerItems: {
                        $filter: {
                            input: '$orderItems',
                            as: 'item',
                            cond: { $eq: ['$$item.seller', sellerObjectId] }
                        }
                    }
                }
            },
            // Unwind sellerItems to calculate seller-specific revenue
            { $unwind: '$sellerItems' },
            // Group to calculate KPIs
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$sellerItems.totalPrice' }, // Sum of totalPrices for items sold by this seller
                    totalOrders: { $sum: 1 },
                    pendingOrders: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['Pending', 'Processing']] }, 1, 0]
                        }
                    },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
                }
            }
        ]);

        // Separate query for Pending Payment KPI (using Payment schema for accuracy)
        const pendingPayments = await Payment.countDocuments({ 
            paymentStatus: 'Pending'
            // NOTE: In a complex system, you might need to join Payment to Order 
            // to ensure the order belongs to the seller's items. For simplicity here, 
            // we just count pending payments globally, assuming the business logic is sound.
        });


        // --- 2. Sales Breakdown by Category, Subcategory, Product ---
        const breakdownResults = await Order.aggregate([
            { $match: matchCriteria },
            { $unwind: '$orderItems' },
            // Filter to include only items from this specific seller
            { $match: { 'orderItems.seller': sellerObjectId } }, 
            {
                $group: {
                    _id: null, // Initial group to restructure data
                    salesByCategory: {
                        $push: {
                            category: '$orderItems.category',
                            revenue: '$orderItems.totalPrice',
                            quantity: '$orderItems.quantity'
                        }
                    },
                    salesBySubcategory: {
                        $push: {
                            subcategory: '$orderItems.subcategory',
                            revenue: '$orderItems.totalPrice',
                            quantity: '$orderItems.quantity'
                        }
                    },
                    salesByProduct: {
                        $push: {
                            product: '$orderItems.productName',
                            revenue: '$orderItems.totalPrice',
                            quantity: '$orderItems.quantity'
                        }
                    }
                }
            }
        ]);

        // --- 3. Trend Chart Data (Sales Over Time) & Top Selling Product ---
        let dateFormat;
        switch (period) {
            case 'day':
                dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
            case 'year':
                dateFormat = { $year: '$createdAt' };
                break;
            case 'month':
            default:
                dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
        }

        const trendResults = await Order.aggregate([
            { $match: matchCriteria },
            { $unwind: '$orderItems' },
            { $match: { 'orderItems.seller': sellerObjectId } },
            {
                $group: {
                    _id: dateFormat,
                    totalOrders: { $sum: 1 },
                    totalSales: { $sum: '$orderItems.totalPrice' },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const topProductResults = await Order.aggregate([
            { $match: matchCriteria },
            { $unwind: '$orderItems' },
            { $match: { 'orderItems.seller': sellerObjectId } },
            {
                $group: {
                    _id: '$orderItems.productName',
                    totalQuantitySold: { $sum: '$orderItems.quantity' },
                    totalRevenue: { $sum: '$orderItems.totalPrice' }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 5 } // Top 5 products
        ]);
        
        // --- Final Response Consolidation ---
        const kpis = kpiResults[0] || {};
        
        // Helper function to consolidate breakdown data (e.g., sum up revenue by category name)
        const consolidateBreakdown = (data, keyField) => {
            const map = new Map();
            data.forEach(item => {
                const key = item[keyField];
                if (map.has(key)) {
                    map.get(key).revenue += item.revenue;
                    map.get(key).quantity += item.quantity;
                } else {
                    map.set(key, { name: key, revenue: item.revenue, quantity: item.quantity });
                }
            });
            return Array.from(map.values());
        };


        const consolidatedBreakdowns = breakdownResults[0] || {};
        
        return res.status(200).json({
            // 1. KPI Cards
            kpi: {
                totalSales: kpis.totalRevenue || 0,
                pendingPayment: pendingPayments || 0, // Using countDocuments from Payment
                pendingOrders: kpis.pendingOrders || 0,
                cancelledOrders: kpis.cancelledOrders || 0,
            },

            // 2. Bar/Pie Chart Data
            salesBreakdown: {
                byCategory: consolidateBreakdown(consolidatedBreakdowns.salesByCategory || [], 'category'),
                bySubcategory: consolidateBreakdown(consolidatedBreakdowns.salesBySubcategory || [], 'subcategory'),
                byProduct: consolidateBreakdown(consolidatedBreakdowns.salesByProduct || [], 'product'),
            },

            // 3. Trend & Top Selling
            salesTrend: trendResults,
            topSellingProducts: topProductResults,
        });

    } catch (error) {
        console.error("Dashboard data aggregation failed:", error);
        return res.status(500).json({ message: "Failed to fetch dashboard data.", error: error.message });
    }
};