import { z } from 'zod';
import { config } from '../config/env.js';
import { Payment } from '../models/Payment.js';
import { Lead } from '../models/Lead.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { normalizePhoneVariants } from '../utils/phone.js';
import {
  PLANS,
  createOrder,
  getOrderDetails,
  verifyWebhookSignature,
  activatePremiumForPayment,
  PLAN_ID_ALIASES,
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
  planId: z.enum([
    // Canonical plan ids (see PLANS in services/paymentService.js)
    'complete-round', 'ultimate-peace',
    'csab-complete', 'csab-ultimate',
    'college-clarity', 'admission-success', 'admission-career-growth',
    'career-premium',
    // Legacy id, redirected to 'complete-round' below via PLAN_ID_ALIASES —
    // kept accepted here so old frontend links/bookmarks don't 400 instead
    // of silently resolving to the current plan.
    'dream-seat',
  ]),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
  mentorId: z.string().nullish().or(z.literal('')),
  pathSlug: z.string().nullish(), // Optional, used for career-premium
});

// POST /api/payments/orders — public, called when user clicks "Buy"
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { name, email, phone, mentorId, pathSlug, returnUrl } = req.body;
  // Resolve legacy plan ids to their canonical form right at the API
  // boundary, before anything else touches planId — Cashfree order
  // creation, the Payment record, and the response should only ever see
  // the canonical id from here on.
  const planId = PLAN_ID_ALIASES[req.body.planId] || req.body.planId;

  // Retry up to 3 times in the rare case of a duplicate orderId collision
  let orderResult;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      orderResult = await createOrder({ planId, name, email, phone, returnUrl });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      // Only retry on Cashfree-level duplicate order errors
    }
  }

  // Persist in our DB — retry on MongoDB duplicate key (11000)
  let payment;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      payment = await Payment.create({
        cashfreeOrderId: orderResult.orderId,
        paymentSessionId: orderResult.paymentSessionId,
        planId: orderResult.plan.id,
        planTitle: orderResult.plan.title,
        amount: orderResult.amount,
        currency: 'INR',
        name,
        email,
        phone,
        mentorId: mentorId || undefined,
        pathSlug: pathSlug || undefined,
        status: 'created',
      });
      break;
    } catch (err) {
      if (err.code === 11000 && attempt < 3) {
        // Extremely rare collision — generate a fresh order and retry
        orderResult = await createOrder({ planId, name, email, phone, returnUrl });
        continue;
      }
      throw err;
    }
  }

  // Create a lead row (email is not unique on Lead — no conflict possible)
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
    orderId: payment.cashfreeOrderId,
    paymentSessionId: payment.paymentSessionId,
    amount: orderResult.amount,
    plan: { id: orderResult.plan.id, title: orderResult.plan.title, amount: orderResult.plan.amount },
    cashfreeEnvironment: config.cashfree.environment,
  });
});

export const verifyPaymentSchema = z.object({
  cashfreeOrderId: z.string().min(1).optional(),
  order_id: z.string().min(1).optional(),
}).refine(data => data.cashfreeOrderId || data.order_id, {
  message: "order_id or cashfreeOrderId is required"
});

// POST /api/payments/verify — called from frontend to check order status directly from Cashfree
export const verifyPayment = asyncHandler(async (req, res) => {
  const cashfreeOrderId = req.body.cashfreeOrderId || req.body.order_id;

  const orderDetails = await getOrderDetails(cashfreeOrderId);

  if (orderDetails.order_status !== 'PAID') {
    throw new AppError(`Payment not completed. Status is ${orderDetails.order_status}`, 400);
  }

  const existingPayment = await Payment.findOne({ cashfreeOrderId });
  if (!existingPayment) throw new AppError('Order not found', 404);

  // This endpoint takes an arbitrary order id and is reachable without a
  // session (guest checkout), so ownership can't be enforced universally.
  // But when the caller DOES have a valid session (optionalUser populated
  // req.user), require the order's email/phone to actually match them
  // before we apply any side effects — otherwise a logged-in user could
  // probe/verify orders that aren't theirs (info leak + spurious lead/
  // premium mutations attributed to the wrong flow).
  if (req.user) {
    const callerEmail = (req.user.email || '').toLowerCase();
    const callerPhoneDigits = (req.user.phone || '').replace(/[^\d]/g, '').slice(-10);
    const paymentEmail = (existingPayment.email || '').toLowerCase();
    const paymentPhoneDigits = (existingPayment.phone || '').replace(/[^\d]/g, '').slice(-10);

    const emailMatches = Boolean(callerEmail) && callerEmail === paymentEmail;
    const phoneMatches = Boolean(callerPhoneDigits) && callerPhoneDigits === paymentPhoneDigits;

    if (!emailMatches && !phoneMatches) {
      console.warn(`[payments/verify] User ${req.user._id} attempted to verify order ${cashfreeOrderId} that does not match their account's email/phone.`);
      throw new AppError('This order does not belong to your account', 403);
    }
  } else {
    // Guest checkout (no token) — leave existing behavior in place, but log
    // distinctly so guest-vs-logged-in verification volume can be monitored
    // separately (guest requests are harder to attribute/rate-limit by
    // identity, only by IP).
    console.log(`[payments/verify] Guest (unauthenticated) verification for order ${cashfreeOrderId}`);
  }

  const payment = await Payment.findOneAndUpdate(
    { cashfreeOrderId },
    {
      status: 'paid',
      cashfreePaymentId: orderDetails.order_id,
    },
    { new: true }
  );
  // Defensive only — existingPayment already confirmed this order exists;
  // this would only be null in the extremely unlikely case it was deleted
  // in between the two queries.
  if (!payment) throw new AppError('Order not found', 404);

  // Mark lead as converted
  if (payment.leadId) {
    await Lead.findByIdAndUpdate(payment.leadId, { status: 'converted' });
  }

  // Find user by phone/email variants and activate premium — logic shared
  // with the Cashfree webhook handler (see services/paymentService.js).
  await activatePremiumForPayment(payment);

  res.json({
    ok: true,
    payment: {
      id: payment._id,
      status: payment.status,
      planId: payment.planId,
      amount: payment.amount * 100,
      pathSlug: payment.pathSlug,
    },
  });
});

// POST /api/payments/webhook
//
// IMPORTANT: this only receives real traffic via the express.raw() mount in
// app.js (registered before express.json(), at the exact same path), which
// is what populates req.rawBody with the exact bytes Cashfree sent — required
// for HMAC verification. The duplicate `router.post('/webhook', webhook)` in
// routes/payments.js is unreachable in production (Express matches app.js's
// route first) and is kept only for route-table symmetry/tests; if it were
// ever hit directly, req.rawBody would be undefined and verification would
// correctly fail closed.
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.rawBody;

  const isValid = verifyWebhookSignature(rawBody, signature, timestamp);
  if (!isValid) {
    // Never throw/500 back to Cashfree for a bad signature — it doesn't know
    // how to fix that and will just retry forever. Log loudly (this should
    // basically never happen with a correctly configured secret) and ack
    // with 200 so Cashfree stops retrying this specific delivery.
    console.error('[Cashfree webhook] Signature verification FAILED — rejecting without processing.', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      ip: req.ip,
    });
    return res.status(200).json({ ok: true, verified: false });
  }

  let payload;
  try {
    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
    payload = JSON.parse(bodyString);
  } catch (err) {
    console.error('[Cashfree webhook] Verified but body was not valid JSON:', err);
    return res.status(200).json({ ok: true, verified: true, parsed: false });
  }

  const eventType = payload?.type;
  if (eventType !== 'PAYMENT_SUCCESS_WEBHOOK') {
    // Other event types (PAYMENT_FAILED_WEBHOOK, PAYMENT_USER_DROPPED_WEBHOOK,
    // REFUND_*, SETTLEMENT_*, etc.) aren't wired to any side effect yet.
    // Ack so Cashfree doesn't retry, and log so we can see webhook traffic
    // we're currently ignoring.
    console.log(`[Cashfree webhook] Ignoring event type: ${eventType || 'unknown'}`);
    return res.json({ ok: true, ignored: eventType || 'unknown' });
  }

  const cashfreeOrderId = payload?.data?.order?.order_id;
  const cfPaymentId = payload?.data?.payment?.cf_payment_id;
  const paymentStatus = payload?.data?.payment?.payment_status;

  if (!cashfreeOrderId) {
    console.error('[Cashfree webhook] PAYMENT_SUCCESS_WEBHOOK missing data.order.order_id:', JSON.stringify(payload));
    return res.status(200).json({ ok: true, error: 'missing_order_id' });
  }

  if (paymentStatus !== 'SUCCESS') {
    // Defensive: the outer event type says success but the nested status
    // disagrees. Log and leave the record untouched rather than guessing.
    console.warn(`[Cashfree webhook] PAYMENT_SUCCESS_WEBHOOK with unexpected payment_status="${paymentStatus}" for order ${cashfreeOrderId}`);
    return res.status(200).json({ ok: true, ignored: 'status_mismatch' });
  }

  const payment = await Payment.findOne({ cashfreeOrderId });
  if (!payment) {
    console.error(`[Cashfree webhook] No matching Payment for cashfreeOrderId=${cashfreeOrderId}`);
    return res.status(200).json({ ok: true, error: 'order_not_found' });
  }

  // Idempotent: Cashfree may deliver the same webhook more than once, and
  // /api/payments/verify may have already raced us to 'paid'. Only run the
  // status-transition side effects (marking the Lead converted) once.
  if (payment.status !== 'paid') {
    payment.status = 'paid';
    if (cfPaymentId) payment.cashfreePaymentId = String(cfPaymentId);
    await payment.save();

    if (payment.leadId) {
      await Lead.findByIdAndUpdate(payment.leadId, { status: 'converted' });
    }
  }

  // Safe to re-run even if already paid — activatePremiumForPayment just
  // re-applies the same fields to the same user, or no-ops if no user
  // matches. Shared with verifyPayment (see services/paymentService.js).
  await activatePremiumForPayment(payment);

  res.json({ ok: true, verified: true, orderId: cashfreeOrderId });
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

  const formattedItems = items.map(item => {
    const obj = item.toObject();
    return {
      ...obj,
      amount: obj.amount * 100
    };
  });

  res.json({ ok: true, page, limit, total, items: formattedItems });
});

// GET /api/payments/my-bookings
export const getMyBookings = asyncHandler(async (req, res) => {
  const user = req.user;
  
  const query = {
    status: 'paid',
    $or: []
  };

  // Shared with verifyPayment/webhook — see utils/phone.js. This used to be
  // a second copy-pasted 4-variant phone match that had drifted slightly
  // from the one in verifyPayment (different push order); now both use the
  // exact same variants.
  if (user.phone) {
    query.$or.push(...normalizePhoneVariants(user.phone));
  }
  if (user.email) {
    query.$or.push({ email: user.email.toLowerCase() });
    query.$or.push({ email: new RegExp(`^${user.email}$`, 'i') });
  }
  
  if (query.$or.length === 0) {
    return res.json({ ok: true, bookings: [] });
  }

  const bookings = await Payment.find(query)
    .populate('mentorId', 'name phone college state rank bio profilePhotoFilename')
    .sort({ createdAt: -1 });

  const formattedBookings = bookings.map((b) => {
    const obj = b.toObject();
    return {
      ...obj,
      amount: obj.amount * 100,
    };
  });

  res.json({ ok: true, bookings: formattedBookings });
});

