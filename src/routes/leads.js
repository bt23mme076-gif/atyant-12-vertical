import { Router } from 'express';
import {
  createLead,
  createLeadSchema,
  listLeads,
  updateLead,
  updateLeadSchema,
  deleteLead,
  exportLeadsCsv,
} from '../controllers/leadController.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { leadLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Public — used by LeadCaptureModal on the frontend
router.post('/', leadLimiter, validate(createLeadSchema), createLead);

// Admin
router.get('/', requireAdmin, listLeads);
router.get('/export.csv', requireAdmin, exportLeadsCsv);
router.patch('/:id', requireAdmin, validate(updateLeadSchema), updateLead);
router.delete('/:id', requireAdmin, deleteLead);

export default router;
