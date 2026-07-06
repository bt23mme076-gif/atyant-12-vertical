import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { User } from '../models/User.js';
import {
  adminUpdateMentorBundles, adminUpdateMentorBundlesSchema,
} from '../controllers/userController.js';
import {
  adminListPillars, adminCreatePillar, adminUpdatePillar, adminDeletePillar,
  adminListItems, adminCreateItem, adminUpdateItem, adminDeleteItem,
  adminListCareerPaths, adminCreateCareerPath, adminUpdateCareerPath, adminDeleteCareerPath,
  adminListFaqVideos, adminCreateFaqVideo, adminUpdateFaqVideo, adminDeleteFaqVideo,
  adminListQuizQuestions, adminCreateQuizQuestion, adminUpdateQuizQuestion, adminDeleteQuizQuestion,
} from '../controllers/adminRoadmapController.js';

const router = Router();

// GET /api/admin/mentors - List all mentors for admin
// Uses toSafeJSON() (same pattern as the public /api/users/mentors endpoint)
// instead of returning raw Mongoose documents, so passwordHash and any other
// internal-only fields never leave the server. Confirmed against
// AtyantLoginPage.jsx's MentorsTab: it only reads id/_id, name, email, phone,
// college, branch, state, verificationStatus, idDocFilename, createdAt — all
// of which toSafeJSON() already includes for mentor-role users.
router.get('/mentors', requireAdmin, async (req, res, next) => {
  try {
    const mentors = await User.find({ role: 'mentor' })
      .sort({ createdAt: -1 });
    res.json({ success: true, mentors: mentors.map((m) => m.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/mentors/:id/bundles - admin-only bundle adjustment, now
// that self-service bundle editing has been removed from PATCH /api/users/me.
router.patch(
  '/mentors/:id/bundles',
  requireAdmin,
  validate(adminUpdateMentorBundlesSchema),
  adminUpdateMentorBundles
);

// DELETE /api/admin/users/:id - Delete a user or mentor account
router.delete('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    await User.deleteOne({ _id: id });
    res.json({ success: true, message: 'User account deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── Roadmap content management (team uploads) ───────────────────────
router.get('/roadmap/pillars', requireAdmin, adminListPillars);
router.post('/roadmap/pillars', requireAdmin, adminCreatePillar);
router.patch('/roadmap/pillars/:id', requireAdmin, adminUpdatePillar);
router.delete('/roadmap/pillars/:id', requireAdmin, adminDeletePillar);

router.get('/roadmap/items', requireAdmin, adminListItems);
router.post('/roadmap/items', requireAdmin, adminCreateItem);
router.patch('/roadmap/items/:id', requireAdmin, adminUpdateItem);
router.delete('/roadmap/items/:id', requireAdmin, adminDeleteItem);

router.get('/career-paths', requireAdmin, adminListCareerPaths);
router.post('/career-paths', requireAdmin, adminCreateCareerPath);
router.patch('/career-paths/:id', requireAdmin, adminUpdateCareerPath);
router.delete('/career-paths/:id', requireAdmin, adminDeleteCareerPath);

router.get('/faq-videos', requireAdmin, adminListFaqVideos);
router.post('/faq-videos', requireAdmin, adminCreateFaqVideo);
router.patch('/faq-videos/:id', requireAdmin, adminUpdateFaqVideo);
router.delete('/faq-videos/:id', requireAdmin, adminDeleteFaqVideo);

// ─── Quiz question management ───────────────────────────────────────
router.get('/quiz-questions', requireAdmin, adminListQuizQuestions);
router.post('/quiz-questions', requireAdmin, adminCreateQuizQuestion);
router.patch('/quiz-questions/:id', requireAdmin, adminUpdateQuizQuestion);
router.delete('/quiz-questions/:id', requireAdmin, adminDeleteQuizQuestion);

export default router;
