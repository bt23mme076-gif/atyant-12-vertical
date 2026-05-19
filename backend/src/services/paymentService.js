import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { AppError } from '../utils/asyncHandler.js';

// Plan catalog — single source of truth for amounts. The frontend reads this
// via GET /api/payments/plans so we never trust amounts coming from the
// browser (anyone could tamper with the price).
export const PLANS = {
  'better-college': { id: 'better-college', title: 'Better College', amount: 14900 }, // paise
  'better-branch':  { id: 'better-branch',  title: 'Better Branch',  amount: 14900 },
  'combo':          { id: 'combo',          title: 'Combo Pack',     amount: 24900 },
  '1to1':           { id: '1to1',           title: '1:1 Personal Guidance', amount: 99900 },
};

let _client = null;
function client() {
  if (_client) return _client;
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new AppError('Razorpay is not configured on the server', 500);
  }
  _client = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
  return _client;
}

export function getPlan(planId) {
  const plan = PLANS[planId];
  if (!plan) throw new AppError(`Unknown plan: ${planId}`, 400);
  return plan;
}

export async function createOrder({ planId, name, email, phone }) {
  const plan = getPlan(planId);

  const order = await client().orders.create({
    amount: plan.amount,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: { planId, name, email, phone: phone || '' },
  });

  return { order, plan };
}

// Verifies the signature Razorpay returns to the browser after a successful
// payment. This proves the payment was actually approved.
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

// Verifies the webhook signature Razorpay sends in the x-razorpay-signature header.
// `rawBody` MUST be the exact request body bytes (not the parsed JSON).
export function verifyWebhookSignature({ rawBody, signature }) {
  if (!config.razorpay.webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}
