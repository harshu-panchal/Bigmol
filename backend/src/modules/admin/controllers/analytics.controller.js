import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import Order from '../../../models/Order.model.js';
import User from '../../../models/User.model.js';
import Vendor from '../../../models/Vendor.model.js';
import Product from '../../../models/Product.model.js';

// Simple memory cache for analytics
const dashboardCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET /api/admin/analytics/dashboard
export const getDashboardStats = asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    
    // Check cache
    const cacheKey = `dashboard_${period}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.status(200).json(new ApiResponse(200, cached.data, 'Dashboard stats fetched (cached).'));
    }

    const activeOrderFilter = { isDeleted: { $ne: true } };
    
    // Define time ranges
    const now = new Date();
    let startDate = new Date();
    let prevStartDate = new Date();
    
    if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
        prevStartDate.setDate(now.getDate() - 14);
    } else if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
        prevStartDate.setDate(now.getDate() - 1);
        prevStartDate.setHours(0, 0, 0, 0);
    } else {
        // default month
        startDate.setMonth(now.getMonth() - 1);
        prevStartDate.setMonth(now.getMonth() - 2);
    }

    const [
        totalOrders, 
        totalUsers, 
        totalVendors, 
        totalProducts, 
        revenueAgg, 
        pendingOrders,
        prevRevenueAgg,
        prevOrdersCount,
        prevUsersCount
    ] = await Promise.all([
        Order.countDocuments(activeOrderFilter),
        User.countDocuments({ role: 'customer' }),
        Vendor.countDocuments({ status: 'approved' }),
        Product.countDocuments({ isActive: true }),
        Order.aggregate([
            { $match: { ...activeOrderFilter, status: { $ne: 'cancelled' }, createdAt: { $gte: startDate } } }, 
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]),
        Order.countDocuments({ ...activeOrderFilter, status: 'pending' }),
        // Previous period for comparison
        Order.aggregate([
            { $match: { ...activeOrderFilter, status: { $ne: 'cancelled' }, createdAt: { $gte: prevStartDate, $lt: startDate } } }, 
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
        ]),
        Order.countDocuments({ ...activeOrderFilter, createdAt: { $gte: prevStartDate, $lt: startDate } }),
        User.countDocuments({ role: 'customer', createdAt: { $gte: prevStartDate, $lt: startDate } })
    ]);

    const currentRevenue = revenueAgg[0]?.total || 0;
    const prevRevenue = prevRevenueAgg[0]?.total || 0;
    const currentOrders = revenueAgg[0]?.count || 0;
    const prevOrders = prevRevenueAgg[0]?.count || 0;

    const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const analyticsData = {
        totalOrders,
        totalUsers,
        totalVendors,
        totalProducts,
        totalRevenue: currentRevenue,
        pendingOrders,
        revenueChange: calculateChange(currentRevenue, prevRevenue),
        ordersChange: calculateChange(currentOrders, prevOrders),
        customersChange: calculateChange(totalUsers, prevUsersCount), // Global growth
    };

    // Update cache
    dashboardCache.set(cacheKey, {
        timestamp: Date.now(),
        data: analyticsData
    });

    res.status(200).json(new ApiResponse(200, analyticsData, 'Dashboard stats fetched.'));
});

// GET /api/admin/analytics/revenue
export const getRevenueData = asyncHandler(async (req, res) => {
    const { period = 'monthly', startDate, endDate } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';
    const match = { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const pipeline = [
        { $match: match },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ];
    if (!startDate && !endDate) {
        pipeline.push({ $sort: { _id: -1 } }, { $limit: 12 });
    }
    pipeline.push({ $sort: { _id: 1 } });

    const revenue = await Order.aggregate(pipeline);

    res.status(200).json(new ApiResponse(200, revenue, 'Revenue data fetched.'));
});

// GET /api/admin/analytics/order-status
export const getOrderStatusBreakdown = asyncHandler(async (req, res) => {
    const breakdown = await Order.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    const result = breakdown.map(item => ({ status: item._id, count: item.count }));
    res.status(200).json(new ApiResponse(200, result, 'Order status breakdown fetched.'));
});

// GET /api/admin/analytics/top-products
export const getTopProducts = asyncHandler(async (req, res) => {
    const topProducts = await Order.aggregate([
        { $match: { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: { $ifNull: ['$product.name', 'Unknown Product'] },
                image: {
                    $ifNull: [{ $arrayElemAt: ['$product.images', 0] }, '$product.image']
                },
                totalSold: 1,
                revenue: 1
            }
        },
    ]);

    res.status(200).json(new ApiResponse(200, topProducts, 'Top products fetched.'));
});

// GET /api/admin/analytics/customer-growth
export const getCustomerGrowth = asyncHandler(async (req, res) => {
    const { period = 'monthly' } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';

    const growth = await User.aggregate([
        { $match: { role: 'customer' } },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, newUsers: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: 12 },
        { $sort: { _id: 1 } },
    ]);

    res.status(200).json(new ApiResponse(200, growth, 'Customer growth fetched.'));
});

// GET /api/admin/analytics/recent-orders
export const getRecentOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ isDeleted: { $ne: true } })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    res.status(200).json(new ApiResponse(200, orders, 'Recent orders fetched.'));
});

// GET /api/admin/analytics/sales
export const getSalesData = asyncHandler(async (req, res) => {
    const { period = 'monthly', startDate, endDate } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';
    const match = { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const pipeline = [
        { $match: match },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
    ];
    if (!startDate && !endDate) {
        pipeline.push({ $sort: { _id: -1 } }, { $limit: 12 });
    }
    pipeline.push({ $sort: { _id: 1 } });

    const sales = await Order.aggregate(pipeline);

    res.status(200).json(new ApiResponse(200, sales, 'Sales data fetched.'));
});

// GET /api/admin/analytics/payment-breakdown
export const getPaymentBreakdown = asyncHandler(async (req, res) => {
    const breakdown = await Order.aggregate([
        { $match: { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } } },
        {
            $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                total: { $sum: '$total' }
            }
        },
        { $sort: { total: -1 } }
    ]);

    const result = breakdown.reduce((acc, item) => {
        const method = item._id || 'unknown';
        acc[method] = { count: item.count, total: item.total };
        return acc;
    }, {});

    res.status(200).json(new ApiResponse(200, result, 'Payment breakdown fetched.'));
});

// GET /api/admin/analytics/finance-summary
export const getFinancialSummary = asyncHandler(async (req, res) => {
    const { period = 'monthly', startDate, endDate } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';
    const match = { isDeleted: { $ne: true }, status: { $ne: 'cancelled' } };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const pipeline = [
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
                revenue: { $sum: '$total' },
                subtotal: { $sum: '$subtotal' },
                tax: { $sum: '$tax' },
                delivery: { $sum: '$shipping' },
                discount: { $sum: '$discount' },
                orders: { $sum: 1 }
            }
        },
    ];
    if (!startDate && !endDate) {
        pipeline.push({ $sort: { _id: -1 } }, { $limit: 12 });
    }
    pipeline.push({ $sort: { _id: 1 } });

    const summary = await Order.aggregate(pipeline);

    res.status(200).json(new ApiResponse(200, summary, 'Financial summary fetched.'));
});

// GET /api/admin/analytics/inventory-stats
export const getInventoryStats = asyncHandler(async (req, res) => {
    const [totalProducts, outOfStock, lowStock, activeProducts] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ stock: 'out_of_stock' }),
        Product.countDocuments({ stock: 'low_stock' }),
        Product.countDocuments({ isActive: true }),
    ]);

    res.status(200).json(new ApiResponse(200, {
        totalProducts,
        outOfStock,
        lowStock,
        activeProducts,
    }, 'Inventory stats fetched.'));
});

/**
 * @desc    Get profit and loss data
 * @route   GET /api/admin/analytics/profit-loss
 * @access  Private (Admin)
 */
export const getProfitLoss = asyncHandler(async (req, res) => {
    const { period = 'monthly', startDate, endDate } = req.query;
    const groupFormat = period === 'daily' ? '%Y-%m-%d' : period === 'weekly' ? '%Y-%U' : '%Y-%m';
    
    const match = { isDeleted: { $ne: true }, status: 'delivered' };
    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) match.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const report = await Order.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
                revenue: { $sum: '$total' },
                tax: { $sum: '$tax' },
                shipping: { $sum: '$shipping' },
                discount: { $sum: '$discount' },
                orders: { $sum: 1 }
            }
        },
        {
            $project: {
                period: '$_id',
                revenue: 1,
                tax: 1,
                shipping: 1,
                discount: 1,
                orders: 1,
                // Simplified Profit calculation as per plan
                grossProfit: { $subtract: ['$revenue', { $add: ['$tax', '$shipping'] }] }
            }
        },
        { $sort: { period: 1 } }
    ]);

    res.status(200).json(new ApiResponse(200, report, 'Profit and loss data fetched.'));
});

/**
 * @desc    Get order trends (hourly/daily/monthly)
 * @route   GET /api/admin/analytics/order-trends
 * @access  Private (Admin)
 */
export const getOrderTrends = asyncHandler(async (req, res) => {
    const { period = 'daily' } = req.query;
    
    // Choose format based on period
    // hourly => %Y-%m-%d %H:00
    // daily  => %Y-%m-%d
    // monthly => %Y-%m
    let groupFormat = '%Y-%m-%d';
    if (period === 'hourly') groupFormat = '%Y-%m-%d %H:00';
    else if (period === 'monthly') groupFormat = '%Y-%m';

    const trends = await Order.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
            $group: {
                _id: {
                    status: '$status',
                    date: { $dateToString: { format: groupFormat, date: '$createdAt' } }
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                statuses: {
                    $push: {
                        status: '$_id.status',
                        count: '$count'
                    }
                },
                total: { $sum: '$count' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(200).json(new ApiResponse(200, trends, 'Order trends fetched.'));
});
