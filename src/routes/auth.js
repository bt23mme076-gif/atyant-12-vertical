import { Router } from 'express';
import { login, loginSchema, me } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', requireAdmin, me);

export default router;
