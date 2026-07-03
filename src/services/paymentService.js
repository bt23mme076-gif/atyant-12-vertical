import crypto from 'crypto';
import { config } from '../config/env.js';
import { AppError } from '../utils/asyncHandler.js';
import { normalizePhoneVariants } from '../utils/phone.js';

export const PLANS = {
  // JEE Counselling Plans
  'complete-round':    { id: 'complete-round',    title: 'Complete Round Support',   amount: 999 },
  'ultimate-peace':    { id: 'ultimate-peace',    title: 'Ultimate Peace of Mind',    amount: 1999 },
  // CSAB Special Rounds
  'csab-complete':          { id: 'csab-complete',          title: 'Complete CSAB Support',      amount: 999 },
  'csab-ultimate':          { id: 'csab-ultimate',          title: 'Ultimate CSAB Mentorship',   amount: 1599 },
  // MHT-CET / All India Counselling
  'college-clarity':        { id: 'college-clarity',        title: 'College Clarity',            amount: 999 },
  'admission-success':      { id: 'admission-success',      title: 'Admission Success',          amount: 1999 },
  'admission-career-growth':{ id: 'admission-career-growth',title: 'Admission + Career Growth',  amount: 4999 },
};

// Legacy plan ids that used to be separate PLANS entries but were always
// identical in practice (dream-seat and complete-round both mapped to the
// same "Complete Round Support" ₹999 plan — see db.js's now-removed
// boot-time migration, which existed solely to clean up historical mentor
// bundle data written under the old id). Resolved at the API boundary in
// createPaymentOrder (paymentController.js) so any old frontend
// links/bookmarks/cached bundles still using `dream-seat` keep working
// without needing a frontend redeploy first.
export const PLAN_ID_ALIASES = {
  'dream-seat': 'complete-round',
};

export function getPlan(planId) {
  const plan = PLANS[planId];
  if (!plan) throw new AppError(`Unknown plan: ${planId}`, 400);
  return plan;
}

export async function createOrder({ planId, name, email, phone }) {
  const plan = getPlan(planId);
  const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const cashfreeUrl = config.cashfree.environment === 'production'
    ? 'https://api.cashfree.com/pg/orders'
    : 'https://sandbox.cashfree.com/pg/orders';

  const payload = {
    order_id: orderId,
    order_amount: plan.amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: phone || `cust_${Date.now()}`,
      customer_phone: phone || '9999999999',
      customer_name: name || 'Atyant Student',
      customer_email: email || 'student@atyant.in',
    },
    order_meta: {
      return_url: `${config.frontendUrl}/profile?order_id={order_id}`,
    },
    order_note: `Atyant Mentorship - ${plan.title}`,
  };

  const response = await fetch(cashfreeUrl, {
    method: 'POST',
    headers: {
      'x-client-id': config.cashfree.appId,
      'x-client-secret': config.cashfree.secretKey,
      'x-api-version': '2023-08-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Cashfree Order creation failed:', data);
    throw new AppError(data.message || 'Failed to create Cashfree order', 500);
  }

  return {
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    amount: data.order_amount,
    plan,
  };
}

// ─── Cashfree webhook signature verification ────────────────────────────
// Per Cashfree's documented HMAC scheme: signatureString = timestamp +
// rawBody, HMAC-SHA256 with the merchant secret key, base64-encoded, and
// compared against the x-webhook-signature header. rawBody MUST be the exact
// bytes Cashfree sent (see app.js's express.raw() mount for /api/payments/webhook)
// — verifying against a re-serialized/parsed body would fail or, worse, be
// bypassable.
export function verifyWebhookSignature(rawBody, signature, timestamp) {
  if (!signature || !timestamp || !rawBody) return false;
  if (!config.cashfree.secretKey) {
    // Misconfiguration, not an attack — but we still must not accept the
    // webhook as verified.
    console.error('[Cashfree webhook] CASHFREE_SECRET_KEY is not configured — cannot verify signatures.');
    return false;
  }

  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const signatureString = `${timestamp}${bodyString}`;
  const expected = crypto
    .createHmac('sha256', config.cashfree.secretKey)
    .update(signatureString)
    .digest('base64');

  // Constant-time comparison to avoid leaking signature bytes via timing.
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signature);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// ─── Shared "find user by phone/email variants + activate premium" logic ──
// This used to be duplicated between verifyPayment and (implicitly, as a gap)
// the webhook handler. Both now call this after independently confirming the
// payment is genuinely paid.
//
// Idempotent by design: calling this twice for the same payment just
// re-sets the same premium fields on the same user — safe for Cashfree's
// at-least-once webhook delivery.
export async function activatePremiumForPayment(payment) {
  const { User } = await import('../models/User.js');

  const orConditions = [];
  if (payment.email) {
    orConditions.push({ email: payment.email.toLowerCase() });
    orConditions.push({ email: new RegExp(`^${payment.email}$`, 'i') });
  }
  if (payment.phone) {
    orConditions.push(...normalizePhoneVariants(payment.phone));
  }

  if (orConditions.length === 0) return null;

  const user = await User.findOne({ $or: orConditions });
  if (!user) return null;

  user.premium = true;
  user.premiumActivatedAt = new Date();
  if (!user.phone && payment.phone) user.phone = payment.phone;
  if (!user.name && payment.name) user.name = payment.name;
  await user.save();
  return user;
}

export async function getOrderDetails(orderId) {
  const cashfreeUrl = config.cashfree.environment === 'production'
    ? `https://api.cashfree.com/pg/orders/${orderId}`
    : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

  const response = await fetch(cashfreeUrl, {
    method: 'GET',
    headers: {
      'x-client-id': config.cashfree.appId,
      'x-client-secret': config.cashfree.secretKey,
      'x-api-version': '2023-08-01',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new AppError(data.message || 'Failed to fetch order details from Cashfree', 500);
  }
  return data;
}