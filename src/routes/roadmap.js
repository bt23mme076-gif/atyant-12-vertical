import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import {
  optionalUser,
  listPillars,
  completeItem,
  checkIn,
  getStreak,
  getMyBatch,
  listCareerPaths,
  listFaqVideos,
  getReferralStatus,
} from '../controllers/roadmapController.js';

const router = Router();

// Public (progress merged in automatically if a valid user token is sent)
router.get('/pillars', optionalUser, listPillars);
router.get('/career-paths', listCareerPaths);
router.get('/faq-videos', listFaqVideos);

// Requires login
router.post('/items/:itemId/complete', requireUser, completeItem);
router.post('/checkin', requireUser, checkIn);
router.get('/streak', requireUser, getStreak);
router.get('/batch/me', requireUser, getMyBatch);
router.get('/referral', requireUser, getReferralStatus);

export default router;
