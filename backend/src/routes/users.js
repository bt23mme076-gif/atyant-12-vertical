import { Router } from 'express';
import { signup, login, me, updateProfile, signupSchema, loginSchema } from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { requireUser } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', requireUser, me);
router.patch('/me', requireUser, updateProfile);

// GET /api/users/mentors - List all mentors
router.get('/mentors', async (req, res) => {
  const { User } = await import('../models/User.js');
  const mentors = await User.find({ role: 'mentor' });
  res.json({ mentors });
});

export default router;
