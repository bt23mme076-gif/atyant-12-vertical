import { Router } from 'express';
import { decide, decideSchema } from '../controllers/decisionController.js';
import { validate } from '../middleware/validate.js';
import { decisionLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/', decisionLimiter, validate(decideSchema), decide);

export default router;
