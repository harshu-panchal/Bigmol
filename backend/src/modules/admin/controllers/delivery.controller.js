import mongoose from 'mongoose';
import DeliveryBoy from '../../../models/DeliveryBoy.model.js';
import { Order } from '../../../models/Order.model.js';
import { ApiError } from '../../../utils/ApiError.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { sendEmail } from '../../../services/email.service.js';
import { createNotification } from '../../../services/notification.service.js';
import crypto from 'crypto';

const DOC_TOKEN_TTL_MS = 10 * 60 * 1000;
const DOC_TOKEN_QUERY_KEY = 'docToken';

const buildDocToken = (relativePath) => {
    const exp = Date.now() + DOC_TOKEN_TTL_MS;
    const payload = `${relativePath}|${exp}`;
    const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'delivery-doc-secret')
        .update(payload)
        .digest('hex');
    return `${exp}.${signature}`;
};

const buildDocUrl = (req, relativePath = '') => {
    if (!relativePath) return '';
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) return relativePath;
    const baseUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
    if (relativePath.startsWith('/uploads/delivery-docs/')) {
        const token = buildDocToken(relativePath);
        return `${baseUrl}?${DOC_TOKEN_QUERY_KEY}=${encodeURIComponent(token)}`;
    }
    return baseUrl;
};

/**
 * @desc    Get all delivery boys with filtering and pagination
 * @route   GET /api/admin/delivery-boys
 * @access  Private (Admin)
 */
export const getAllDeliveryBoys = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', status, applicationStatus } = req.query;
    const numericPage = Number(page) || 1;
    const numericLimit = Number(limit) || 10;

    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { address: { $regex: search, $options: 'i' } },
        ];
    }

    if (status) {
        filter.isActive = status === 'active';
    }

    if (applicationStatus) {
        filter.applicationStatus = applicationStatus;
    }

    const deliveryBoys = await DeliveryBoy.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit);

    const total = await DeliveryBoy.countDocuments(filter);

    // Optimized Aggregate: Get stats for all delivery boys in the current page in one go
    const deliveryBoyIds = deliveryBoys.map(boy => boy._id);
    const allStats = await Order.aggregate([
        { $match: { deliveryBoyId: { $in: deliveryBoyIds }, isDeleted: { $ne: true } } },
        {
            $group: {
                _id: '$deliveryBoyId',
                totalDeliveries: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                pendingDeliveries: { $sum: { $cond: [{ $in: ['$status', ['pending', 'processing', 'shipped']] }, 1, 0] } },
                cashInHand: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$status', 'delivered'] },
                                    { $in: ['$paymentMethod', ['cod', 'cash']] },
                                    { $ne: ['$isCashSettled', true] }
                                ]
                            },
                            '$total',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const statsMap = allStats.reduce((acc, stat) => {
        acc[stat._id.toString()] = stat;
        return acc;
    }, {});

    const boysWithStats = deliveryBoys.map((boy) => {
        const boyStats = statsMap[boy._id.toString()] || { totalDeliveries: 0, pendingDeliveries: 0, cashInHand: 0 };
        return {
            ...boy._doc,
            id: boy._id,
            status: boy.isActive ? 'active' : 'inactive',
            applicationStatus: boy.applicationStatus || 'approved',
            documents: {
                drivingLicense: boy.documents?.drivingLicense || '',
                aadharCard: boy.documents?.aadharCard || '',
            },
            documentUrls: {
                drivingLicense: buildDocUrl(req, boy.documents?.drivingLicense || ''),
                aadharCard: buildDocUrl(req, boy.documents?.aadharCard || ''),
            },
            stats: {
                totalDeliveries: boyStats.totalDeliveries,
                pendingDeliveries: boyStats.pendingDeliveries,
                cashInHand: boyStats.cashInHand
            }
        };
    });

    res.status(200).json(
        new ApiResponse(200, {
            deliveryBoys: boysWithStats,
            pagination: {
                total,
                page: numericPage,
                limit: numericLimit,
                pages: Math.ceil(total / numericLimit)
            }
        }, 'Delivery boys fetched successfully')
    );
});

/**
 * @desc    Get delivery boy detail with order history
 * @route   GET /api/admin/delivery-boys/:id
 * @access  Private (Admin)
 */
export const getDeliveryBoyById = asyncHandler(async (req, res) => {
    const boy = await DeliveryBoy.findById(req.params.id).select('-password');

    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    const orders = await Order.find({ deliveryBoyId: boy._id }).sort({ createdAt: -1 }).limit(50);

    const stats = await Order.aggregate([
        { $match: { deliveryBoyId: boy._id } },
        {
            $group: {
                _id: null,
                totalDeliveries: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$shipping', 0] } },
                cashInHand: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$status', 'delivered'] },
                                    { $in: ['$paymentMethod', ['cod', 'cash']] },
                                    { $ne: ['$isCashSettled', true] }
                                ]
                            },
                            '$total',
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const boyStats = stats.length > 0 ? stats[0] : { totalDeliveries: 0, totalEarnings: 0, cashInHand: 0 };

    res.status(200).json(
        new ApiResponse(200, {
            ...boy._doc,
            id: boy._id,
            status: boy.isActive ? 'active' : 'inactive',
            applicationStatus: boy.applicationStatus || 'approved',
            documentUrls: {
                drivingLicense: buildDocUrl(req, boy.documents?.drivingLicense || ''),
                aadharCard: buildDocUrl(req, boy.documents?.aadharCard || ''),
            },
            stats: boyStats,
            recentOrders: orders
        }, 'Delivery boy details fetched successfully')
    );
});

/**
 * @desc    Create a new delivery boy
 * @route   POST /api/admin/delivery-boys
 * @access  Private (Admin)
 */
export const createDeliveryBoy = asyncHandler(async (req, res) => {
    const { name, email, password, phone, address, vehicleType, vehicleNumber, isActive } = req.body;

    const existedUser = await DeliveryBoy.findOne({
        $or: [{ email }, { phone }]
    });

    if (existedUser) {
        throw new ApiError(409, 'User with email or phone already exists');
    }

    const boy = await DeliveryBoy.create({
        name,
        email,
        password,
        phone,
        address,
        vehicleType,
        vehicleNumber,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        applicationStatus: 'approved',
    });

    const createdBoy = await DeliveryBoy.findById(boy._id).select('-password');

    if (!createdBoy) {
        throw new ApiError(500, 'Something went wrong while creating the delivery boy');
    }

    res.status(201).json(
        new ApiResponse(201, createdBoy, 'Delivery boy created successfully')
    );
});

/**
 * @desc    Update delivery boy status
 * @route   PATCH /api/admin/delivery-boys/:id/status
 * @access  Private (Admin)
 */
export const updateDeliveryBoyStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
        throw new ApiError(400, 'isActive status must be a boolean');
    }

    const boy = await DeliveryBoy.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
    ).select('-password');

    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    res.status(200).json(
        new ApiResponse(200, boy, `Delivery boy status updated to ${isActive ? 'active' : 'inactive'}`)
    );
});

/**
 * @desc    Approve or reject delivery registration
 * @route   PATCH /api/admin/delivery-boys/:id/application-status
 * @access  Private (Admin)
 */
export const updateDeliveryBoyApplicationStatus = asyncHandler(async (req, res) => {
    const { applicationStatus, reason = '' } = req.body;

    if (!['approved', 'rejected'].includes(applicationStatus)) {
        throw new ApiError(400, 'applicationStatus must be approved or rejected');
    }

    const boy = await DeliveryBoy.findById(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    boy.applicationStatus = applicationStatus;
    boy.rejectionReason = applicationStatus === 'rejected' ? String(reason || '').trim() : '';
    boy.isActive = applicationStatus === 'approved';
    if (applicationStatus === 'rejected') {
        boy.isAvailable = false;
        boy.status = 'offline';
    }
    await boy.save();

    try {
        if (applicationStatus === 'approved') {
            await sendEmail({
                to: boy.email,
                subject: 'Delivery account approved',
                text: 'Your delivery account has been approved. You can now log in.',
                html: '<p>Your delivery account has been <strong>approved</strong>. You can now log in.</p>',
            });
        } else {
            await sendEmail({
                to: boy.email,
                subject: 'Delivery account rejected',
                text: `Your delivery account was rejected.${boy.rejectionReason ? ` Reason: ${boy.rejectionReason}` : ''}`,
                html: `<p>Your delivery account was <strong>rejected</strong>.${boy.rejectionReason ? ` Reason: ${boy.rejectionReason}` : ''}</p>`,
            });
        }
    } catch (err) {
        console.warn(`[Delivery Approval Email] Failed for ${boy.email}: ${err.message}`);
    }

    await createNotification({
        recipientId: boy._id,
        recipientType: 'delivery',
        title: `Application ${applicationStatus}`,
        message:
            applicationStatus === 'approved'
                ? 'Your delivery account has been approved by admin.'
                : `Your delivery account was rejected${boy.rejectionReason ? `: ${boy.rejectionReason}` : '.'}`,
        type: 'system',
        data: {
            applicationStatus,
            reason: boy.rejectionReason || '',
        },
    });

    const refreshed = await DeliveryBoy.findById(boy._id).select('-password');
    res.status(200).json(
        new ApiResponse(200, refreshed, `Delivery registration ${applicationStatus} successfully`)
    );
});

/**
 * @desc    Update delivery boy details
 * @route   PUT /api/admin/delivery-boys/:id
 * @access  Private (Admin)
 */
export const updateDeliveryBoy = asyncHandler(async (req, res) => {
    const { name, email, phone, address, vehicleType, vehicleNumber, isActive } = req.body;

    const existing = await DeliveryBoy.findOne({
        _id: { $ne: req.params.id },
        $or: [{ email }, { phone }]
    });
    if (existing) {
        throw new ApiError(409, 'User with email or phone already exists');
    }

    const payload = {
        name,
        email,
        phone,
        address,
        vehicleType,
        vehicleNumber,
    };
    if (typeof isActive === 'boolean') payload.isActive = isActive;

    const boy = await DeliveryBoy.findByIdAndUpdate(
        req.params.id,
        payload,
        { new: true, runValidators: true }
    ).select('-password');

    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    res.status(200).json(
        new ApiResponse(200, boy, 'Delivery boy updated successfully')
    );
});

/**
 * @desc    Delete a delivery boy
 * @route   DELETE /api/admin/delivery-boys/:id
 * @access  Private (Admin)
 */
export const deleteDeliveryBoy = asyncHandler(async (req, res) => {
    const boy = await DeliveryBoy.findById(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    const activeAssignments = await Order.countDocuments({
        deliveryBoyId: boy._id,
        status: { $in: ['pending', 'processing', 'shipped'] },
        isDeleted: { $ne: true },
    });

    if (activeAssignments > 0) {
        throw new ApiError(409, 'Cannot delete delivery boy with active assigned orders');
    }

    await DeliveryBoy.findByIdAndDelete(req.params.id);

    res.status(200).json(
        new ApiResponse(200, null, 'Delivery boy deleted successfully')
    );
});

/**
 * @desc    Settle cash in hand for a delivery boy
 * @route   POST /api/admin/delivery-boys/:id/settle-cash
 * @access  Private (Admin)
 */
export const settleCash = asyncHandler(async (req, res) => {
    const boy = await DeliveryBoy.findById(req.params.id);
    if (!boy) {
        throw new ApiError(404, 'Delivery boy not found');
    }

    const baseFilter = {
        deliveryBoyId: req.params.id,
        status: 'delivered',
        paymentMethod: { $in: ['cod', 'cash'] },
        isCashSettled: { $ne: true },
        isDeleted: { $ne: true },
    };

    const unsettledStats = await Order.aggregate([
        { $match: baseFilter },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: '$total' },
            },
        },
    ]);

    const unsettledCount = unsettledStats?.[0]?.count || 0;
    const settledAmount = Number(unsettledStats?.[0]?.totalAmount || 0);

    if (unsettledCount === 0) {
        return res.status(200).json(
            new ApiResponse(200, { modifiedCount: 0, settledAmount: 0 }, 'No pending cash to settle')
        );
    }

    const result = await Order.updateMany(
        baseFilter,
        {
            $set: { isCashSettled: true, settledAt: new Date() }
        }
    );

    await DeliveryBoy.findByIdAndUpdate(req.params.id, {
        $inc: { cashCollected: settledAmount },
    });

    res.status(200).json(
        new ApiResponse(
            200,
            { modifiedCount: result.modifiedCount, settledAmount },
            `Settled cash for ${result.modifiedCount} orders`
        )
    );
});

/**
 * @desc    Assign an order to a delivery boy
 * @route   POST /api/admin/delivery-boys/:id/assign-order
 * @access  Private (Admin)
 */
export const assignOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const boyId = req.params.id;

    if (!orderId) throw new ApiError(400, 'orderId is required.');

    const boy = await DeliveryBoy.findById(boyId).select('name isActive applicationStatus status');
    if (!boy) throw new ApiError(404, 'Delivery boy not found.');
    if (!boy.isActive) throw new ApiError(400, 'Delivery boy is inactive.');
    if (boy.applicationStatus !== 'approved') {
        throw new ApiError(400, 'Delivery boy account is not approved.');
    }
    if (boy.status === 'offline') {
        throw new ApiError(400, 'Delivery boy is offline.');
    }

    const filter = {
        $or: [{ orderId: orderId }, { _id: mongoose.isValidObjectId(orderId) ? orderId : null }],
        isDeleted: { $ne: true },
    };
    
    const order = await Order.findOne(filter);
    if (!order) throw new ApiError(404, 'Order not found.');

    if (['cancelled', 'returned', 'delivered'].includes(String(order.status))) {
        throw new ApiError(409, `Cannot assign delivery for ${order.status} order.`);
    }

    const previousBoyId = order.deliveryBoyId ? String(order.deliveryBoyId) : null;
    const isReassigned = previousBoyId && previousBoyId !== String(boyId);

    order.deliveryBoyId = boyId;
    
    // Auto-move to processing if it was pending
    if (order.status === 'pending') {
        order.status = 'processing';
        order.vendorItems = (order.vendorItems || []).map((vi) => {
            const current = String(vi?.status || 'pending');
            if (current === 'cancelled' || current === 'delivered') return vi;
            return { ...vi.toObject(), status: 'processing' };
        });
    }

    await order.save();

    // Notify delivery boy
    await createNotification({
        recipientId: boy._id,
        recipientType: 'delivery',
        title: isReassigned ? 'Order reassigned' : 'New order assigned',
        message: `${order.orderId} has been ${isReassigned ? 'reassigned to you' : 'assigned to you'}.`,
        type: 'order',
        data: {
            orderId: String(order.orderId || order._id),
            reassigned: isReassigned ? 'true' : 'false',
        },
    });

    res.status(200).json(new ApiResponse(200, order, 'Order assigned to delivery partner.'));
});

/**
 * @desc    Unassign an order from a delivery boy
 * @route   DELETE /api/admin/delivery-boys/:id/unassign-order/:orderId
 * @access  Private (Admin)
 */
export const unassignOrder = asyncHandler(async (req, res) => {
    const { id: boyId, orderId } = req.params;

    const filter = {
        $or: [{ orderId: orderId }, { _id: mongoose.isValidObjectId(orderId) ? orderId : null }],
        deliveryBoyId: boyId,
        isDeleted: { $ne: true },
    };

    const order = await Order.findOne(filter);
    if (!order) throw new ApiError(404, 'Assigned order not found.');

    order.deliveryBoyId = undefined;
    await order.save();

    await createNotification({
        recipientId: boyId,
        recipientType: 'delivery',
        title: 'Order unassigned',
        message: `Order ${order.orderId} has been unassigned from you.`,
        type: 'order',
        data: {
            orderId: String(order.orderId || order._id),
        },
    });

    res.status(200).json(new ApiResponse(200, null, 'Order unassigned successfully.'));
});
