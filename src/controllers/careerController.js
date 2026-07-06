import { CareerPath } from '../models/CareerPath.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';

// GET /api/careers — list all published paths (lightweight summary)
export const listCareers = asyncHandler(async (req, res) => {
  const all = await CareerPath.find({ isPublished: true }).sort({ order: 1 });
  const featured = all.filter((p) => p.isFeatured).map((p) => p.toListJSON());
  const more = all.filter((p) => !p.isFeatured).map((p) => p.toListJSON());
  res.json({ ok: true, featured, more, totalCount: all.length });
});

// GET /api/careers/:slug — full detail for one path
export const getCareer = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const career = await CareerPath.findOne({ slug, isPublished: true });
  if (!career) throw new AppError('Career path not found', 404);
  res.json({ ok: true, career: career.toSafeJSON() });
});

// GET /api/careers/:slug/related — derived from pivotOptions + relatedPaths
export const getRelatedCareers = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const career = await CareerPath.findOne({ slug, isPublished: true });
  if (!career) throw new AppError('Career path not found', 404);

  const relatedSlugs = [...new Set([
    ...(career.pivotOptions || []),
    ...(career.relatedPaths || []),
  ])].slice(0, 6);

  const related = await CareerPath.find({ slug: { $in: relatedSlugs }, isPublished: true });
  res.json({ ok: true, related: related.map((p) => p.toListJSON()) });
});
