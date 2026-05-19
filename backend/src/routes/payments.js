import { Router } from 'express';
import {
  listPlans,
  createPaymentOrder,
  createOrderSchema,
  verifyPayment,
  verifyPaymentSchema,
  webhook,
  listPayments,
} from '../controllers/paymentController.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/plans', listPlans);
router.post('/orders', validate(createOrderSchema), createPaymentOrder);
router.post('/verify', validate(verifyPaymentSchema), verifyPayment);

// Webhook route is mounted separately in app.js with raw body parser
// — see app.js. We still export it here for clarity but app.js mounts
// the raw-body variant first.
router.post('/webhook', webhook);

// Admin
router.get('/', requireAdmin, listPayments);

export default router;
