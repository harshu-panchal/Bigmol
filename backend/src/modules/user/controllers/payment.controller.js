import asyncHandler from '../../../utils/asyncHandler.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/ApiError.js';
import Order from '../../../models/Order.model.js';
import razorpayInstance from '../../../config/razorpay.js';
import crypto from 'crypto';

// verify-payment
export const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1. Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('[Payment Verification] Missing required fields:', {
                razorpay_order_id: !!razorpay_order_id,
                razorpay_payment_id: !!razorpay_payment_id,
                razorpay_signature: !!razorpay_signature,
                received_body: req.body
            });
        }
        throw new ApiError(400, 'Missing payment fields');
    }

    // 2. Find order
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
        if (process.env.NODE_ENV !== 'production') {
            console.error(`[Payment Verification] Order not found for Razorpay Order ID: ${razorpay_order_id}`);
        }
        throw new ApiError(404, 'Order not found');
    }

    // 3. Idempotency check: if order is already paid, return success
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'partially_paid') {
        return res.status(200).json(
            new ApiResponse(200, order, 'Payment already verified')
        );
    }

    // 4. Verify signature (HMAC SHA256: order_id + "|" + payment_id)
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        console.error('[Payment Verification] RAZORPAY_KEY_SECRET is not defined in environment variables');
        throw new ApiError(500, 'Payment configuration error');
    }

    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(text.toString())
        .digest('hex');

    if (generated_signature === razorpay_signature) {
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;

        // For EMI, check if it was a down payment
        if (order.downPaymentAmount > 0) {
            order.paymentStatus = 'partially_paid';
            if (order.emiDetails) {
                order.emiDetails.emiStatus = 'approved';
            }
        } else {
            order.paymentStatus = 'paid';
        }

        order.status = 'processing';
        
        // If it's an EMI payment, we might want to store more details if provided
        if (req.body.emi_details) {
            order.emiDetails = {
                ...order.emiDetails,
                ...req.body.emi_details
            };
        }

        await order.save();

        res.status(200).json(
            new ApiResponse(200, order, 'Payment verified successfully')
        );
    } else {
        // 5. Signature mismatch
        if (process.env.NODE_ENV !== 'production') {
            console.error('[Payment Verification] Signature mismatch:', {
                expected: generated_signature,
                received: razorpay_signature
            });
        }
        
        order.paymentStatus = 'failed';
        await order.save();
        throw new ApiError(400, 'Invalid signature');
    }
});

// Razorpay Webhook
export const handleWebhook = asyncHandler(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(400).send('Invalid signature');
    }

    const event = req.body.event;
    const payment = req.body.payload.payment.entity;
    const orderId = payment.order_id;

    const order = await Order.findOne({ razorpayOrderId: orderId });
    if (!order) return res.status(200).send('Order not found');

    if (event === 'payment.captured' || event === 'order.paid') {
        order.paymentStatus = 'paid';
        order.status = 'processing';
        order.razorpayPaymentId = payment.id;
        
        // Handle EMI details from metadata/payload if available
        if (payment.method === 'emi') {
            order.paymentMethod = 'emi';
            // Razorpay payment entity might have emi details
            // order.emiDetails = ...
        }
    } else if (event === 'payment.failed') {
        order.paymentStatus = 'failed';
    }

    await order.save();
    res.status(200).json({ status: 'ok' });
});
