import { z } from 'zod';
import { SiteContent } from '../models/SiteContent.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const DEFAULT_KEY = 'default';

// Returns the current overrides object (or {} if none set).
export const getContent = asyncHandler(async (req, res) => {
  const key = req.params.key || DEFAULT_KEY;
  const doc = await SiteContent.findOne({ key });
  res.json({ ok: true, key, data: doc?.data || {}, updatedAt: doc?.updatedAt || null });
});

// The schema is intentionally permissive — admins paste arbitrary JSON
// to override values from src/data/siteContent.js. We only validate that
// it's an object.
export const updateContentSchema = z.object({
  data: z.record(z.any()),
});

export const updateContent = asyncHandler(async (req, res) => {
  const key = req.params.key || DEFAULT_KEY;
  const doc = await SiteContent.findOneAndUpdate(
    { key },
    { data: req.body.data, updatedBy: req.admin._id },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ ok: true, key, data: doc.data, updatedAt: doc.updatedAt });
});

export const clearContent = asyncHandler(async (req, res) => {
  const key = req.params.key || DEFAULT_KEY;
  await SiteContent.findOneAndUpdate(
    { key },
    { data: {}, updatedBy: req.admin._id },
    { new: true, upsert: true }
  );
  res.json({ ok: true, key, data: {} });
});
