import { RoadmapPillar } from '../models/RoadmapPillar.js';
import { RoadmapItem } from '../models/RoadmapItem.js';
import { CareerPath } from '../models/CareerPath.js';
import { FaqVideo } from '../models/FaqVideo.js';
import { Batch } from '../models/Batch.js';
import { User } from '../models/User.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/jwt.js';
import { assignActiveBatch } from '../services/batchService.js';
import { config } from '../config/env.js';

// Recomputes a user's per-pillar and overall progress percentages after an
// item is marked complete. Kept here (rather than on the model) so it can
// use the live pillar item-counts.
async function recomputeProgress(user) {
  const pillars = await RoadmapPillar.find({ isPublished: true });
  const itemCounts = await RoadmapItem.aggregate([
    { $match: { isPublished: true } },
    { $group: { _id: '$pillar', count: { $sum: 1 } } },
  ]);
  const countByPillar = Object.fromEntries(itemCounts.map((c) => [String(c._id), c.count]));

  let totalItems = 0;
  let totalCompleted = 0;

  for (const pillar of pillars) {
    const total = countByPillar[String(pillar._id)] || 0;
    const entry = user.roadmapProgress.find((p) => String(p.pillar) === String(pillar._id));
    const completed = entry ? entry.completedItems.length : 0;
    if (entry) entry.percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    totalItems += total;
    totalCompleted += completed;
  }

  user.overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
}

// Applies the daily streak rule: consecutive calendar days extend the
// streak, a missed day resets it to 1, same-day repeats are a no-op.
function applyStreak(user) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = user.lastCheckInDate
    ? new Date(user.lastCheckInDate.getFullYear(), user.lastCheckInDate.getMonth(), user.lastCheckInDate.getDate())
    : null;

  if (last && last.getTime() === today.getTime()) {
    return; // already checked in today
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const isConsecutive = last && today.getTime() - last.getTime() === oneDayMs;

  user.currentStreak = isConsecutive ? user.currentStreak + 1 : 1;
  user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
  user.lastCheckInDate = now;
}

// Best-effort optional auth: attaches req.user if a valid user token is
// present, but never blocks the request when it's missing/invalid. Lets the
// pillar list include personal progress for logged-in visitors while still
// working for logged-out ones.
export const optionalUser = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme === 'Bearer' && token) {
      const payload = verifyToken(token);
      const user = await User.findById(payload.sub);
      if (user && (!user.activeSessionId || payload.sid === user.activeSessionId)) {
        req.user = user;
      }
    }
  } catch {
    // ignore — treat as logged out
  }
  next();
};

export const listPillars = asyncHandler(async (req, res) => {
  const pillars = await RoadmapPillar.find({ isPublished: true }).sort({ order: 1 });
  const items = await RoadmapItem.find({ isPublished: true }).sort({ order: 1 });

  const threshold = config.referral.unlockThreshold;
  const referralCount = req.user?.referralCount || 0;

  const pillarMap = {};
  for (const p of pillars) {
    pillarMap[String(p._id)] = p.key;
  }

  const itemsByPillar = {};
  for (const item of items) {
    const pId = String(item.pillar);
    const pKey = pillarMap[pId];
    if (!itemsByPillar[pId]) itemsByPillar[pId] = [];

    let locked = false;
    let price = 0;
    if (pKey === 'industry-ready-skills') {
      price = 249;
      if (req.user) {
        if (!req.user.premium && !req.user.purchasedRoadmapItems?.includes(String(item._id))) {
          locked = true;
        }
      } else {
        locked = true;
      }
    } else {
      locked = item.requiresReferralUnlock && referralCount < threshold;
    }

    itemsByPillar[pId].push({
      ...item.toSafeJSON(),
      locked,
      price: price > 0 ? price : undefined,
    });
  }

  const progressByPillar = {};
  if (req.user) {
    for (const entry of req.user.roadmapProgress || []) {
      progressByPillar[String(entry.pillar)] = {
        percent: entry.percent,
        completedItemIds: entry.completedItems.map((id) => String(id)),
      };
    }
  }

  const data = pillars.map((pillar) => ({
    ...pillar.toSafeJSON(),
    items: itemsByPillar[String(pillar._id)] || [],
    itemCount: (itemsByPillar[String(pillar._id)] || []).length,
    progress: progressByPillar[String(pillar._id)] || { percent: 0, completedItemIds: [] },
  }));

  res.json({
    ok: true,
    pillars: data,
    overallProgress: req.user ? req.user.overallProgress || 0 : 0,
    referralUnlock: { threshold, current: referralCount, unlocked: referralCount >= threshold },
  });
});

export const completeItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const item = await RoadmapItem.findById(itemId).populate('pillar');
  if (!item) throw new AppError('Roadmap item not found', 404);

  if (item.pillar && item.pillar.key === 'industry-ready-skills') {
    if (!req.user.premium && !req.user.purchasedRoadmapItems?.includes(String(item._id))) {
      throw new AppError('Purchase this section to unlock and complete', 403);
    }
  } else if (item.requiresReferralUnlock && (req.user.referralCount || 0) < config.referral.unlockThreshold) {
    throw new AppError('Refer more friends to unlock this content', 403);
  }

  const user = req.user;
  let entry = user.roadmapProgress.find((p) => String(p.pillar) === String(item.pillar));
  if (!entry) {
    user.roadmapProgress.push({ pillar: item.pillar, completedItems: [], percent: 0 });
    entry = user.roadmapProgress[user.roadmapProgress.length - 1];
  }

  const already = entry.completedItems.some((id) => String(id) === String(item._id));
  if (!already) {
    entry.completedItems.push(item._id);
    entry.updatedAt = new Date();
    applyStreak(user); // completing content counts as showing up today
  }

  await recomputeProgress(user);
  await user.save();

  res.json({
    ok: true,
    overallProgress: user.overallProgress,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    pillarProgress: entry.percent,
  });
});

export const checkIn = asyncHandler(async (req, res) => {
  const user = req.user;
  applyStreak(user);
  await user.save();
  res.json({
    ok: true,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    lastCheckInDate: user.lastCheckInDate,
  });
});

export const getStreak = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    currentStreak: req.user.currentStreak || 0,
    longestStreak: req.user.longestStreak || 0,
    lastCheckInDate: req.user.lastCheckInDate || null,
    overallProgress: req.user.overallProgress || 0,
  });
});

export const getMyBatch = asyncHandler(async (req, res) => {
  let user = req.user;
  if (!user.batch) {
    user.batch = await assignActiveBatch();
    await user.save();
  }
  const batch = await Batch.findById(user.batch);
  if (!batch) throw new AppError('Batch not found', 404);

  const memberCount = await User.countDocuments({ batch: batch._id });
  res.json({ ok: true, batch: batch.toSafeJSON(), memberCount });
});

// "29 career paths. One platform." grid on the Career Exploration Hub.
// Returns the featured subset (shown by default) plus the remaining
// published paths separately, so the frontend's "+N more" control can
// expand in place instead of being a dead label.
export const listCareerPaths = asyncHandler(async (req, res) => {
  const all = await CareerPath.find({ isPublished: true }).sort({ order: 1 });
  const featured = all.filter((p) => p.isFeatured).map((p) => p.toSafeJSON());
  const more = all.filter((p) => !p.isFeatured).map((p) => p.toSafeJSON());

  res.json({
    ok: true,
    featured,
    more,
    totalCount: all.length,
    remainingCount: more.length,
  });
});

// FAQ pop-up videos — quick guidance clips shown when a student taps a
// common question on the Roadmap page.
export const listFaqVideos = asyncHandler(async (req, res) => {
  const videos = await FaqVideo.find({ isPublished: true }).sort({ order: 1 });
  res.json({ ok: true, faqVideos: videos.map((v) => v.toSafeJSON()) });
});

// Referral status for the logged-in student: their shareable code, how many
// successful referrals they have, and how many more they need to unlock
// referral-gated roadmap content.
export const getReferralStatus = asyncHandler(async (req, res) => {
  const threshold = config.referral.unlockThreshold;
  const count = req.user.referralCount || 0;
  res.json({
    ok: true,
    referralCode: req.user.referralCode || '',
    referralCount: count,
    threshold,
    unlocked: count >= threshold,
    remaining: Math.max(0, threshold - count),
    shareUrl: `${config.frontendUrl}/login?ref=${req.user.referralCode || ''}`,
  });
});
