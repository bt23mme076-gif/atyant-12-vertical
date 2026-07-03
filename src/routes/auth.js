import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { login, me, loginSchema } from '../controllers/authController.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', requireAdmin, me);

export default router;