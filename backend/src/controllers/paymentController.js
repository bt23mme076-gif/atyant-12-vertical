import { z } from 'zod';
import { config } from '../config/env.js';
import { Payment } from '../models/Payment.js';
import { Lead } from '../models/Lead.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import {
  PLANS,
  createOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from '../services/paymentService.js';

// GET /api/payments/plans — public, used by frontend to render pricing
export const listPlans = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    razorpayKeyId: config.razorpay.keyId || null,
    plans: Object.values(PLANS).map((p) => ({
      id: p.id,
      title: p.title,
      amount: p.amount,
      amountInr: p.amount / 100,
      currency: 'INR',
    })),
  });
});

export const createOrderSchema = z.object({
  planId: z.enum(['quick-clarity', 'complete-guidance', 'dream-seat']),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
});

// POST /api/payments/orders — public, called when user clicks "Buy"
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { planId, name, email, phone } = req.body;
  const { order, plan } = await createOrder({ planId, name, email, phone });

  // Persist in our DB so we can reconcile via webhook later
  const payment = await Payment.create({
    razorpayOrderId: order.id,
    planId: plan.id,
    planTitle: plan.title,
    amount: plan.amount,
    currency: 'INR',
    name,
    email,
    phone,
    status: 'created',
  });

  // Also drop a lead row so even abandoned carts show up in /admin
  const lead = await Lead.create({
    name,
    email,
    phone,
    source: 'pricing',
    meta: { planId, paymentId: payment._id },
  });
  payment.leadId = lead._id;
  await payment.save();

  res.status(201).json({
    ok: true,
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    },
    plan: { id: plan.id, title: plan.title, amount: plan.amount },
    razorpayKeyId: config.razorpay.keyId,
  });
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

// POST /api/payments/verify — called from frontend after Razorpay checkout success
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const isValid = verifyCheckoutSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!isValid) throw new AppError('Invalid payment signature', 400);

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      razorpayPaymentId,
      razorpaySignature,
      status: 'paid',
    },
    { new: true }
  );
  if (!payment) throw new AppError('Order not found', 404);

  // Mark the matching lead as converted
  if (payment.leadId) {
    await Lead.findByIdAndUpdate(payment.leadId, { status: 'converted' });
  }

  res.json({
    ok: true,
    payment: {
      id: payment._id,
      status: payment.status,
      planId: payment.planId,
      amount: payment.amount,
    },
  });
});

// POST /api/payments/webhook — server-to-server from Razorpay.
// This route MUST receive the raw body (set in app.js).
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody;

  if (!signature || !rawBody) {
    throw new AppError('Missing webhook signature or body', 400);
  }
  const ok = verifyWebhookSignature({ rawBody, signature });
  if (!ok) throw new AppError('Invalid webhook signature', 400);

  const event = JSON.parse(rawBody.toString('utf8'));
  const type = event.event;
  const payload = event.payload || {};

  if (type === 'payment.captured') {
    const p = payload.payment?.entity;
    if (p?.order_id) {
      // Update payment status
      const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId: p.order_id },
        { razorpayPaymentId: p.id, status: 'paid' },
        { new: true }
      );

      // Premium unlock & mentor session confirm logic
      if (payment) {
        // Unlock premium for user (by email)
        const { email } = payment;
        const user = await (await import('../models/User.js')).User.findOne({ email });
        if (user) {
          user.premium = true;
          user.premiumActivatedAt = new Date();
          await user.save();
        }

        // Confirm mentor session (if you have such logic, e.g., update a session/booking model)
        // Example: If you have a Booking model, you can update it here
        // await Booking.findOneAndUpdate({ paymentId: payment._id }, { status: 'confirmed' });
      }
    }
  } else if (type === 'payment.failed') {
    const p = payload.payment?.entity;
    if (p?.order_id) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: p.order_id },
        {
          razorpayPaymentId: p.id,
          status: 'failed',
          failureReason: p.error_description || p.error_code,
        }
      );
    }
  }
  // Always 200 so Razorpay doesn't retry forever
  res.json({ ok: true });
});

// Admin: list payments
export const listPayments = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.planId) filter.planId = req.query.planId;

  const [items, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Payment.countDocuments(filter),
  ]);

  res.json({ ok: true, page, limit, total, items });
});
