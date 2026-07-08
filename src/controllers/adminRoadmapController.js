import { RoadmapPillar } from '../models/RoadmapPillar.js';
import { RoadmapItem } from '../models/RoadmapItem.js';
import { CareerPath } from '../models/CareerPath.js';
import { CareerPathItem } from '../models/CareerPathItem.js';
import { FaqVideo } from '../models/FaqVideo.js';
import { QuizQuestion } from '../models/QuizQuestion.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';

// Everything here is mounted behind requireAdmin in routes/admin.js. Content
// (documents/videos) is uploaded separately via POST /api/upload/roadmap-
// content, which returns a URL; these endpoints just persist that URL (or
// an admin-pasted external link) against a Pillar/Item/CareerPath/FAQ row.

// ─── Pillars ──────────────────────────────────────────────────────────
export const adminListPillars = asyncHandler(async (req, res) => {
  const pillars = await RoadmapPillar.find().sort({ order: 1 });
  res.json({ ok: true, pillars: pillars.map((p) => p.toSafeJSON()) });
});

export const adminCreatePillar = asyncHandler(async (req, res) => {
  const { key, title, tagline, icon, order, isFlagship, isPublished } = req.body;
  if (!key || !title) throw new AppError('key and title are required', 400);
  const pillar = await RoadmapPillar.create({ key, title, tagline, icon, order, isFlagship, isPublished });
  res.status(201).json({ ok: true, pillar: pillar.toSafeJSON() });
});

export const adminUpdatePillar = asyncHandler(async (req, res) => {
  const pillar = await RoadmapPillar.findById(req.params.id);
  if (!pillar) throw new AppError('Pillar not found', 404);
  const { title, tagline, icon, order, isFlagship, isPublished } = req.body;
  if (title !== undefined) pillar.title = title;
  if (tagline !== undefined) pillar.tagline = tagline;
  if (icon !== undefined) pillar.icon = icon;
  if (order !== undefined) pillar.order = order;
  if (isFlagship !== undefined) pillar.isFlagship = isFlagship;
  if (isPublished !== undefined) pillar.isPublished = isPublished;
  await pillar.save();
  res.json({ ok: true, pillar: pillar.toSafeJSON() });
});

export const adminDeletePillar = asyncHandler(async (req, res) => {
  const pillar = await RoadmapPillar.findById(req.params.id);
  if (!pillar) throw new AppError('Pillar not found', 404);
  await RoadmapItem.deleteMany({ pillar: pillar._id });
  await pillar.deleteOne();
  res.json({ ok: true });
});

export const adminListItems = asyncHandler(async (req, res) => {
  const filter = req.query.pillar ? { pillar: req.query.pillar } : {};
  const items = await RoadmapItem.find(filter).sort({ order: 1 });
  res.json({ ok: true, items: items.map((i) => i.toSafeJSON()) });
});

export const adminCreateItem = asyncHandler(async (req, res) => {
  const { pillar, title, description, type, url, durationLabel, order, isPublished, requiresReferralUnlock } = req.body;
  if (!pillar || !title) throw new AppError('pillar and title are required', 400);
  const item = await RoadmapItem.create({
    pillar,
    title,
    description,
    type,
    url,
    durationLabel,
    order,
    isPublished,
    requiresReferralUnlock,
    uploadedBy: req.admin._id,
  });
  res.status(201).json({ ok: true, item: item.toSafeJSON() });
});

export const adminUpdateItem = asyncHandler(async (req, res) => {
  const item = await RoadmapItem.findById(req.params.id);
  if (!item) throw new AppError('Item not found', 404);
  const { title, description, type, url, durationLabel, order, isPublished, requiresReferralUnlock } = req.body;
  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description;
  if (type !== undefined) item.type = type;
  if (url !== undefined) item.url = url;
  if (durationLabel !== undefined) item.durationLabel = durationLabel;
  if (order !== undefined) item.order = order;
  if (isPublished !== undefined) item.isPublished = isPublished;
  if (requiresReferralUnlock !== undefined) item.requiresReferralUnlock = requiresReferralUnlock;
  await item.save();
  res.json({ ok: true, item: item.toSafeJSON() });
});

export const adminDeleteItem = asyncHandler(async (req, res) => {
  const item = await RoadmapItem.findById(req.params.id);
  if (!item) throw new AppError('Item not found', 404);
  await item.deleteOne();
  res.json({ ok: true });
});

// ─── Career paths ─────────────────────────────────────────────────────
export const adminListCareerPaths = asyncHandler(async (req, res) => {
  const paths = await CareerPath.find().sort({ order: 1 });
  res.json({ ok: true, careerPaths: paths.map((p) => p.toSafeJSON()) });
});

export const adminCreateCareerPath = asyncHandler(async (req, res) => {
  const { title, colorKey, order, isFeatured, isPublished } = req.body;
  if (!title) throw new AppError('title is required', 400);
  const slug = title.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await CareerPath.findOne({ slug });
  if (existing) throw new AppError('A career path with this title already exists', 409);
  const path = await CareerPath.create({ title, slug, colorKey, order, isFeatured, isPublished });
  res.status(201).json({ ok: true, careerPath: path.toSafeJSON() });
});

export const adminUpdateCareerPath = asyncHandler(async (req, res) => {
  const path = await CareerPath.findById(req.params.id);
  if (!path) throw new AppError('Career path not found', 404);
  const {
    title, colorKey, order, isFeatured, isPublished,
    // Rich content fields
    tagline, snapshot, roadmap, skillTree, realStories,
    entryPoints, commonMistakes, resources, pivotOptions, relatedPaths,
  } = req.body;
  if (title !== undefined) path.title = title;
  if (colorKey !== undefined) path.colorKey = colorKey;
  if (order !== undefined) path.order = order;
  if (isFeatured !== undefined) path.isFeatured = isFeatured;
  if (isPublished !== undefined) path.isPublished = isPublished;
  if (tagline !== undefined) path.tagline = tagline;
  if (snapshot !== undefined) path.snapshot = snapshot;
  if (roadmap !== undefined) path.roadmap = roadmap;
  if (skillTree !== undefined) path.skillTree = skillTree;
  if (realStories !== undefined) path.realStories = realStories;
  if (entryPoints !== undefined) path.entryPoints = entryPoints;
  if (commonMistakes !== undefined) path.commonMistakes = commonMistakes;
  if (resources !== undefined) path.resources = resources;
  if (pivotOptions !== undefined) path.pivotOptions = pivotOptions;
  if (relatedPaths !== undefined) path.relatedPaths = relatedPaths;
  await path.save();
  res.json({ ok: true, careerPath: path.toSafeJSON() });
});

export const adminDeleteCareerPath = asyncHandler(async (req, res) => {
  const path = await CareerPath.findById(req.params.id);
  if (!path) throw new AppError('Career path not found', 404);
  await path.deleteOne();
  res.json({ ok: true });
});

// ─── FAQ videos ───────────────────────────────────────────────────────
export const adminListFaqVideos = asyncHandler(async (req, res) => {
  const videos = await FaqVideo.find().sort({ order: 1 });
  res.json({ ok: true, faqVideos: videos.map((v) => v.toSafeJSON()) });
});

export const adminCreateFaqVideo = asyncHandler(async (req, res) => {
  const { question, shortAnswer, videoUrl, order, isPublished } = req.body;
  if (!question || !videoUrl) throw new AppError('question and videoUrl are required', 400);
  const video = await FaqVideo.create({
    question,
    shortAnswer,
    videoUrl,
    order,
    isPublished,
    uploadedBy: req.admin._id,
  });
  res.status(201).json({ ok: true, faqVideo: video.toSafeJSON() });
});

export const adminUpdateFaqVideo = asyncHandler(async (req, res) => {
  const video = await FaqVideo.findById(req.params.id);
  if (!video) throw new AppError('FAQ video not found', 404);
  const { question, shortAnswer, videoUrl, order, isPublished } = req.body;
  if (question !== undefined) video.question = question;
  if (shortAnswer !== undefined) video.shortAnswer = shortAnswer;
  if (videoUrl !== undefined) video.videoUrl = videoUrl;
  if (order !== undefined) video.order = order;
  if (isPublished !== undefined) video.isPublished = isPublished;
  await video.save();
  res.json({ ok: true, faqVideo: video.toSafeJSON() });
});

export const adminDeleteFaqVideo = asyncHandler(async (req, res) => {
  const video = await FaqVideo.findById(req.params.id);
  if (!video) throw new AppError('FAQ video not found', 404);
  await video.deleteOne();
  res.json({ ok: true });
});

// ─── Quiz Questions (admin CRUD) ──────────────────────────────────────
export const adminListQuizQuestions = asyncHandler(async (req, res) => {
  const questions = await QuizQuestion.find().sort({ order: 1 });
  res.json({ ok: true, questions });
});

export const adminCreateQuizQuestion = asyncHandler(async (req, res) => {
  const { id, order, question, subtext, type, options } = req.body;
  if (!id || !question) throw new AppError('id and question are required', 400);
  const existing = await QuizQuestion.findOne({ id });
  if (existing) throw new AppError('A question with this id already exists', 409);
  const q = await QuizQuestion.create({ id, order, question, subtext, type, options });
  res.status(201).json({ ok: true, question: q });
});

export const adminUpdateQuizQuestion = asyncHandler(async (req, res) => {
  const q = await QuizQuestion.findById(req.params.id);
  if (!q) throw new AppError('Question not found', 404);
  const { order, question, subtext, type, options, isActive } = req.body;
  if (order !== undefined) q.order = order;
  if (question !== undefined) q.question = question;
  if (subtext !== undefined) q.subtext = subtext;
  if (type !== undefined) q.type = type;
  if (options !== undefined) q.options = options;
  if (isActive !== undefined) q.isActive = isActive;
  await q.save();
  res.json({ ok: true, question: q });
});

export const adminDeleteQuizQuestion = asyncHandler(async (req, res) => {
  const q = await QuizQuestion.findById(req.params.id);
  if (!q) throw new AppError('Question not found', 404);
  await q.deleteOne();
  res.json({ ok: true });
});

// ─── Career Path Items (video/doc/article/task/quiz per career path) ─────
export const adminListCareerPathItems = asyncHandler(async (req, res) => {
  const filter = req.query.careerPath ? { careerPath: req.query.careerPath } : {};
  const items = await CareerPathItem.find(filter).sort({ order: 1 });
  res.json({ ok: true, items: items.map((i) => i.toSafeJSON()) });
});

export const adminCreateCareerPathItem = asyncHandler(async (req, res) => {
  const { careerPath, title, description, type, url, durationLabel, order, isPublished } = req.body;
  if (!careerPath || !title) throw new AppError('careerPath and title are required', 400);
  const item = await CareerPathItem.create({
    careerPath,
    title,
    description,
    type,
    url,
    durationLabel,
    order,
    isPublished,
    uploadedBy: req.admin._id,
  });
  res.status(201).json({ ok: true, item: item.toSafeJSON() });
});

export const adminUpdateCareerPathItem = asyncHandler(async (req, res) => {
  const item = await CareerPathItem.findById(req.params.id);
  if (!item) throw new AppError('Career path item not found', 404);
  const { title, description, type, url, durationLabel, order, isPublished } = req.body;
  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description;
  if (type !== undefined) item.type = type;
  if (url !== undefined) item.url = url;
  if (durationLabel !== undefined) item.durationLabel = durationLabel;
  if (order !== undefined) item.order = order;
  if (isPublished !== undefined) item.isPublished = isPublished;
  await item.save();
  res.json({ ok: true, item: item.toSafeJSON() });
});

export const adminDeleteCareerPathItem = asyncHandler(async (req, res) => {
  const item = await CareerPathItem.findById(req.params.id);
  if (!item) throw new AppError('Career path item not found', 404);
  await item.deleteOne();
  res.json({ ok: true });
});
