import { Router } from 'express';
import {
  listPlans,
  createPaymentOrder,
  createOrderSchema,
  verifyPayment,
  verifyPaymentSchema,
  webhook,
  listPayments,
  getMyBookings,
} from '../controllers/paymentController.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin, requireUser, optionalUser } from '../middleware/auth.js';
import { paymentVerifyLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.get('/plans', listPlans);
router.post('/orders', validate(createOrderSchema), createPaymentOrder);
// paymentVerifyLimiter: this takes an arbitrary order id from an
// unauthenticated caller, so it needs a tight per-IP cap (see
// middleware/rateLimiters.js). optionalUser: populates req.user when the
// caller has a valid session, without rejecting guests — verifyPayment uses
// it to confirm order ownership for logged-in callers while still
// supporting guest checkout.
router.post('/verify', paymentVerifyLimiter, optionalUser, validate(verifyPaymentSchema), verifyPayment);
router.get('/my-bookings', requireUser, getMyBookings);

// Webhook route is mounted separately in app.js with raw body parser
// — see app.js. We still export it here for clarity but app.js mounts
// the raw-body variant first.
router.post('/webhook', webhook);

// Admin
router.get('/', requireAdmin, listPayments);

export default router;
