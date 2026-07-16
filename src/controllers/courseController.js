import { Course } from '../models/Course.js';
import { CourseModule } from '../models/CourseModule.js';
import { CourseItem } from '../models/CourseItem.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';

export const getActiveCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ isActive: true }).sort({ order: 1 });
  res.json({ ok: true, courses: courses.map(c => c.toSafeJSON()) });
});

export const getCourseDetails = asyncHandler(async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug, isActive: true });
  if (!course) throw new AppError('Course not found', 404);

  const modules = await CourseModule.find({ courseId: course._id }).sort({ order: 1 });
  const moduleIds = modules.map(m => m._id);
  const items = await CourseItem.find({ moduleId: { $in: moduleIds } }).sort({ order: 1 });

  // Group items by moduleId
  const itemsByModule = {};
  items.forEach(item => {
    const mId = item.moduleId.toString();
    if (!itemsByModule[mId]) itemsByModule[mId] = [];
    itemsByModule[mId].push(item.toSafeJSON());
  });

  const modulesWithItems = modules.map(m => {
    const mod = m.toSafeJSON();
    mod.items = itemsByModule[mod.id] || [];
    return mod;
  });

  res.json({
    ok: true,
    course: course.toSafeJSON(),
    modules: modulesWithItems,
  });
});
