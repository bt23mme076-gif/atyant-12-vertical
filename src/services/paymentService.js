import { config } from '../config/env.js';
import { AppError } from '../utils/asyncHandler.js';

export const PLANS = {
  // JEE Counselling Plans
  'quick-clarity':     { id: 'quick-clarity',     title: 'Starter Clarity',          amount: 99 }, // Map quick-clarity to Starter Clarity (₹99)
  'starter-clarity':   { id: 'starter-clarity',   title: 'Starter Clarity',          amount: 99 },
  'complete-guidance': { id: 'complete-guidance', title: 'Complete Guidance',      amount: 399 },
  'complete-round':    { id: 'complete-round',    title: 'Complete Round Support',   amount: 899 },
  'dream-seat':        { id: 'dream-seat',        title: 'Complete Round Support',   amount: 899 }, // Map dream-seat to Complete Round Support (₹899)
  'ultimate-peace':    { id: 'ultimate-peace',    title: 'Ultimate Peace of Mind',    amount: 1299 },
  // MHT-CET Counselling Plans
  'college-clarity':        { id: 'college-clarity',        title: 'College Clarity',            amount: 999 },
  'admission-success':      { id: 'admission-success',      title: 'Admission Success',          amount: 1999 },
  'admission-career-growth':{ id: 'admission-career-growth',title: 'Admission + Career Growth',  amount: 4999 },
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
