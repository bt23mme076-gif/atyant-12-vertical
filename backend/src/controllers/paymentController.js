import { z } from 'zod';
import { config } from '../config/env.js';
import { Payment } from '../models/Payment.js';
import { Lead } from '../models/Lead.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import {
  PLANS,
  createOrder,
  getOrderDetails,
} from '../services/paymentService.js';

// GET /api/payments/plans — public, used by frontend to render pricing
export const listPlans = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    cashfreeAppId: config.cashfree.appId || null,
    plans: Object.values(PLANS).map((p) => ({
      id: p.id,
      title: p.title,
      amount: p.amount,
      amountInr: p.amount, // cashfree is in INR (main unit)
      currency: 'INR',
    })),
  });
});

export const createOrderSchema = z.object({
  planId: z.enum(['quick-clarity', 'complete-guidance', 'dream-seat']),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
  mentorId: z.string().optional(),
});

// POST /api/payments/orders — public, called when user clicks "Buy"
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { planId, name, email, phone, mentorId } = req.body;
  const { orderId, paymentSessionId, amount, plan } = await createOrder({ planId, name, email, phone });

  // Persist in our DB
  const payment = await Payment.create({
    cashfreeOrderId: orderId,
    paymentSessionId,
    planId: plan.id,
    planTitle: plan.title,
    amount: plan.amount,
    currency: 'INR',
    name,
    email,
    phone,
    mentorId: mentorId || undefined,
    status: 'created',
  });

  // Create a lead row
  const lead = await Lead.create({
    name,
    email,
    phone,
    source: 'pricing',
    meta: { planId, paymentId: payment._id, mentorId },
  });
  payment.leadId = lead._id;
  await payment.save();

  res.status(201).json({
    ok: true,
    orderId,
    paymentSessionId,
    amount,
    plan: { id: plan.id, title: plan.title, amount: plan.amount },
    cashfreeEnvironment: config.cashfree.environment,
  });
});

export const verifyPaymentSchema = z.object({
  cashfreeOrderId: z.string().min(1),
});

// POST /api/payments/verify — called from frontend to check order status directly from Cashfree
export const verifyPayment = asyncHandler(async (req, res) => {
  const { cashfreeOrderId } = req.body;

  const orderDetails = await getOrderDetails(cashfreeOrderId);
  
  if (orderDetails.order_status !== 'PAID') {
    throw new AppError(`Payment not completed. Status is ${orderDetails.order_status}`, 400);
  }

  const payment = await Payment.findOneAndUpdate(
    { cashfreeOrderId },
    {
      status: 'paid',
      cashfreePaymentId: orderDetails.order_id,
    },
    { new: true }
  );
  if (!payment) throw new AppError('Order not found', 404);

  // Mark lead as converted
  if (payment.leadId) {
    await Lead.findByIdAndUpdate(payment.leadId, { status: 'converted' });
  }

  // Find user and mark premium
  const user = await (await import('../models/User.js')).User.findOne({
    $or: [
      { phone: payment.phone },
      { email: payment.email.toLowerCase() }
    ]
  });
  if (user) {
    user.premium = true;
    user.premiumActivatedAt = new Date();
    await user.save();
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

// POST /api/payments/webhook
export const webhook = asyncHandler(async (req, res) => {
  // Simple webhook receiver for compatibility
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

// GET /api/payments/my-bookings
export const getMyBookings = asyncHandler(async (req, res) => {
  const user = req.user;
  
  const query = {
    status: 'paid',
    $or: []
  };
  
  if (user.phone) {
    query.$or.push({ phone: user.phone });
  }
  if (user.email) {
    query.$or.push({ email: user.email.toLowerCase() });
  }
  
  if (query.$or.length === 0) {
    return res.json({ ok: true, bookings: [] });
  }

  const bookings = await Payment.find(query)
    .populate('mentorId', 'name college state rank bio profilePhotoFilename')
    .sort({ createdAt: -1 });

  res.json({ ok: true, bookings });
});
