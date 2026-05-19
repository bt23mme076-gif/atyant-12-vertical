import { Router } from 'express';
import {
  getContent,
  updateContent,
  updateContentSchema,
  clearContent,
} from '../controllers/contentController.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Public read so the frontend can hydrate overrides on load
router.get('/', getContent);
router.get('/:key', getContent);

// Admin write
router.put('/', requireAdmin, validate(updateContentSchema), updateContent);
router.put('/:key', requireAdmin, validate(updateContentSchema), updateContent);
router.delete('/', requireAdmin, clearContent);
router.delete('/:key', requireAdmin, clearContent);

export default router;
