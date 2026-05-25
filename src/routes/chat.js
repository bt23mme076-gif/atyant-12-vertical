import { Router } from 'express';
import {
  sendMessage,
  sendMessageSchema,
  listSessions,
  getSession,
} from '../controllers/chatController.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimiters.js';

const router = Router();

// Public — ChatWidget calls this
router.post('/message', chatLimiter, validate(sendMessageSchema), sendMessage);

// Admin
router.get('/sessions', requireAdmin, listSessions);
router.get('/sessions/:sessionId', requireAdmin, getSession);

export default router;
