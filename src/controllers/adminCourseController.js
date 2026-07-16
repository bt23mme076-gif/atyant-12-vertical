import { Course } from '../models/Course.js';
import { CourseModule } from '../models/CourseModule.js';
import { CourseItem } from '../models/CourseItem.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';

// --- Courses ---
export const adminListCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find().sort({ order: 1 });
  res.json({ ok: true, courses: courses.map(c => c.toSafeJSON()) });
});

export const adminCreateCourse = asyncHandler(async (req, res) => {
  const { title, slug, description, price, isActive, order } = req.body;
  if (!title || !slug || !price) throw new AppError('Title, slug, and price are required', 400);
  const existing = await Course.findOne({ slug });
  if (existing) throw new AppError('Course with this slug already exists', 409);
  
  const course = await Course.create({ title, slug, description, price, isActive, order });
  res.status(201).json({ ok: true, course: course.toSafeJSON() });
});

export const adminUpdateCourse = asyncHandler(async (req, res) => {
  const { title, slug, description, price, isActive, order } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);
  
  if (title !== undefined) course.title = title;
  if (slug !== undefined) course.slug = slug;
  if (description !== undefined) course.description = description;
  if (price !== undefined) course.price = price;
  if (isActive !== undefined) course.isActive = isActive;
  if (order !== undefined) course.order = order;
  
  await course.save();
  res.json({ ok: true, course: course.toSafeJSON() });
});

export const adminDeleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);
  
  await CourseModule.deleteMany({ courseId: course._id });
  await course.deleteOne();
  res.json({ ok: true });
});

// --- Modules ---
export const adminListModules = asyncHandler(async (req, res) => {
  const { courseId } = req.query;
  const filter = courseId ? { courseId } : {};
  const modules = await CourseModule.find(filter).sort({ order: 1 });
  res.json({ ok: true, modules: modules.map(m => m.toSafeJSON()) });
});

export const adminCreateModule = asyncHandler(async (req, res) => {
  const { courseId, title, order, isFreePreview } = req.body;
  if (!courseId || !title) throw new AppError('courseId and title required', 400);
  const mod = await CourseModule.create({ courseId, title, order, isFreePreview });
  res.status(201).json({ ok: true, module: mod.toSafeJSON() });
});

export const adminUpdateModule = asyncHandler(async (req, res) => {
  const mod = await CourseModule.findById(req.params.id);
  if (!mod) throw new AppError('Module not found', 404);
  const { title, order, isFreePreview } = req.body;
  if (title !== undefined) mod.title = title;
  if (order !== undefined) mod.order = order;
  if (isFreePreview !== undefined) mod.isFreePreview = isFreePreview;
  await mod.save();
  res.json({ ok: true, module: mod.toSafeJSON() });
});

export const adminDeleteModule = asyncHandler(async (req, res) => {
  const mod = await CourseModule.findById(req.params.id);
  if (!mod) throw new AppError('Module not found', 404);
  await CourseItem.deleteMany({ moduleId: mod._id });
  await mod.deleteOne();
  res.json({ ok: true });
});

// --- Items ---
export const adminListItems = asyncHandler(async (req, res) => {
  const { moduleId } = req.query;
  const filter = moduleId ? { moduleId } : {};
  const items = await CourseItem.find(filter).sort({ order: 1 });
  res.json({ ok: true, items: items.map(i => i.toSafeJSON()) });
});

export const adminCreateItem = asyncHandler(async (req, res) => {
  const { moduleId, title, type, url, order, durationLabel } = req.body;
  if (!moduleId || !title || !type) throw new AppError('moduleId, title, and type required', 400);
  const item = await CourseItem.create({ moduleId, title, type, url, order, durationLabel });
  res.status(201).json({ ok: true, item: item.toSafeJSON() });
});

export const adminUpdateItem = asyncHandler(async (req, res) => {
  const item = await CourseItem.findById(req.params.id);
  if (!item) throw new AppError('Item not found', 404);
  const { title, type, url, order, durationLabel } = req.body;
  if (title !== undefined) item.title = title;
  if (type !== undefined) item.type = type;
  if (url !== undefined) item.url = url;
  if (order !== undefined) item.order = order;
  if (durationLabel !== undefined) item.durationLabel = durationLabel;
  await item.save();
  res.json({ ok: true, item: item.toSafeJSON() });
});

export const adminDeleteItem = asyncHandler(async (req, res) => {
  const item = await CourseItem.findById(req.params.id);
  if (!item) throw new AppError('Item not found', 404);
  await item.deleteOne();
  res.json({ ok: true });
});
