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
  adminListCareerPathItems, adminCreateCareerPathItem, adminUpdateCareerPathItem, adminDeleteCareerPathItem,
  adminListFaqVideos, adminCreateFaqVideo, adminUpdateFaqVideo, adminDeleteFaqVideo,
  adminListQuizQuestions, adminCreateQuizQuestion, adminUpdateQuizQuestion, adminDeleteQuizQuestion,
} from '../controllers/adminRoadmapController.js';
import {
  adminListCourses, adminCreateCourse, adminUpdateCourse, adminDeleteCourse,
  adminListModules, adminCreateModule, adminUpdateModule, adminDeleteModule,
  adminListItems as adminListCourseItems, adminCreateItem as adminCreateCourseItem, adminUpdateItem as adminUpdateCourseItem, adminDeleteItem as adminDeleteCourseItem
} from '../controllers/adminCourseController.js';

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

// Career path content items (video/doc/article/task/quiz attached to a career path)
router.get('/career-path-items', requireAdmin, adminListCareerPathItems);
router.post('/career-path-items', requireAdmin, adminCreateCareerPathItem);
router.patch('/career-path-items/:id', requireAdmin, adminUpdateCareerPathItem);
router.delete('/career-path-items/:id', requireAdmin, adminDeleteCareerPathItem);

router.get('/faq-videos', requireAdmin, adminListFaqVideos);
router.post('/faq-videos', requireAdmin, adminCreateFaqVideo);
router.patch('/faq-videos/:id', requireAdmin, adminUpdateFaqVideo);
router.delete('/faq-videos/:id', requireAdmin, adminDeleteFaqVideo);

// ─── Quiz question management ───────────────────────────────────────
router.get('/quiz-questions', requireAdmin, adminListQuizQuestions);
router.post('/quiz-questions', requireAdmin, adminCreateQuizQuestion);
router.patch('/quiz-questions/:id', requireAdmin, adminUpdateQuizQuestion);
router.delete('/quiz-questions/:id', requireAdmin, adminDeleteQuizQuestion);

// ─── Course Management ────────────────────────────────────────────────
router.get('/courses', requireAdmin, adminListCourses);
router.post('/courses', requireAdmin, adminCreateCourse);
router.patch('/courses/:id', requireAdmin, adminUpdateCourse);
router.delete('/courses/:id', requireAdmin, adminDeleteCourse);

router.get('/course-modules', requireAdmin, adminListModules);
router.post('/course-modules', requireAdmin, adminCreateModule);
router.patch('/course-modules/:id', requireAdmin, adminUpdateModule);
router.delete('/course-modules/:id', requireAdmin, adminDeleteModule);

router.get('/course-items', requireAdmin, adminListCourseItems);
router.post('/course-items', requireAdmin, adminCreateCourseItem);
router.patch('/course-items/:id', requireAdmin, adminUpdateCourseItem);
router.delete('/course-items/:id', requireAdmin, adminDeleteCourseItem);

export default router;
