import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';
import { assignActiveBatch } from '../services/batchService.js';

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['student', 'mentor']),
  referralCode: z.string().trim().optional(),
});

export const loginSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
  password: z.string().min(1),
  deviceInfo: z.string().trim().max(200).optional(),
});

// PATCH /api/users/me — covers every field updateProfile currently handles.
// NOTE: `bundles` is intentionally NOT included here. A mentor's bundles must
// only change via admin action (see adminUpdateMentorBundles in this file /
// PATCH /api/admin/mentors/:id/bundles) or, in future, be derived server-side
// from verified Payment records — never from a self-service profile edit
// (that would let a mentor grant themselves any paid bundle for free). Any
// `bundles` key sent by an old/cached frontend is silently stripped by
// validate() rather than erroring, since Zod drops unknown keys by default.
//
// `state` / `preferredLang` are validated as trimmed strings rather than a
// hardcoded enum: the real option lists (ALL_INDIAN_STATES, POPULAR_LANGUAGES)
// live in the frontend's src/data/siteContent.js. Duplicating them here would
// require keeping two copies in sync forever and risks silently rejecting
// valid input if the frontend list changes first. Flagging this as a decision
// point — happy to hardcode a shared enum/constants file both sides import if
// you'd rather have stricter server-side enforcement.
//
// `category` DOES get a hard enum since ProfilePage.jsx's <select> has no
// free-text/"other" option — General / OBC-NCL / EWS / SC / ST / PwD are the
// only values the UI can ever produce.
//
// `gender` has no <select> wired up in the UI at all right now (dead field,
// always sent as ''), so it's validated as a loose trimmed string rather than
// an enum to avoid guessing at categories you haven't defined yet. Flagging
// for your input if/when a gender field is actually added to the form.
//
// `cgpa` is bounded to 0–10 assuming the standard Indian 10-point CGPA scale.
// Flagging in case any mentors report a percentage instead — that would need
// a different bound (0–100) or a separate field.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits").optional(),
  email: z
    .union([z.string().trim().toLowerCase().email("Invalid email address"), z.literal('')])
    .optional(),
  college: z.string().trim().max(200).optional(),
  state: z.string().trim().max(100).optional(),
  category: z.enum(['General', 'OBC-NCL', 'EWS', 'SC', 'ST', 'PwD']).optional(),
  rank: z.coerce.number().int().min(1).max(2000000).optional(),
  bio: z.string().trim().max(5000, "Bio must be 5000 characters or fewer").optional(),
  branch: z.string().trim().max(200).optional(),
  cgpa: z.coerce.number().min(0).max(10).optional(),
  categoryRank: z.coerce.number().int().min(1).max(2000000).optional(),
  preferredLang: z.string().trim().max(50).optional(),
  gender: z.string().trim().max(30).optional(),
});

// Generates a short, human-shareable referral code like "RAHUL482".
async function generateReferralCode(name) {
  const base = (name || 'ATYANT').replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase() || 'ATYANT';
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Math.floor(100 + Math.random() * 900); // 3 digits
    const candidate = `${base}${suffix}`;
    const exists = await User.findOne({ referralCode: candidate });
    if (!exists) return candidate;
  }
  return `${base}${Date.now().toString().slice(-5)}`;
}

export const signup = asyncHandler(async (req, res) => {
  const { name, phone, password, role, referralCode } = req.body;

  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new AppError('Phone number already registered', 400);
  }

  const user = new User({ name, phone, role });
  await user.setPassword(password);
  user.referralCode = await generateReferralCode(name);

  if (referralCode) {
    const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
    if (referrer) {
      user.referredBy = referrer._id;
      referrer.referralCount = (referrer.referralCount || 0) + 1;
      await referrer.save();
    }
  }

  // Auto-join the currently open batch/cohort for students.
  if (role === 'student') {
    user.batch = await assignActiveBatch();
  }

  // Mint the single-device session id immediately so the very first login
  // is already tracked.
  const sid = uuidv4();
  user.activeSessionId = sid;
  await user.save();

  const token = signToken({ sub: user._id.toString(), role: user.role, sid });
  res.status(201).json({ ok: true, token, user: user.toSafeJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { phone, password, deviceInfo } = req.body;

  const user = await User.findOne({ phone });
  if (!user) throw new AppError('Invalid credentials', 401);

  const ok = await user.verifyPassword(password);
  if (!ok) throw new AppError('Invalid credentials', 401);

  // Backfill for accounts created before this field existed.
  if (!user.referralCode) user.referralCode = await generateReferralCode(user.name);
  if (user.role === 'student' && !user.batch) user.batch = await assignActiveBatch();

  // Single-device login: minting a new sid immediately invalidates any
  // token issued to a previous device, since requireUser compares sid on
  // every request.
  const sid = uuidv4();
  user.activeSessionId = sid;
  user.activeDeviceInfo = deviceInfo || '';
  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken({ sub: user._id.toString(), role: user.role, sid });
  res.json({ ok: true, token, user: user.toSafeJSON() });
});

export const logout = asyncHandler(async (req, res) => {
  req.user.activeSessionId = null;
  req.user.activeDeviceInfo = '';
  await req.user.save();
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: req.user.toSafeJSON() });
});

// req.body is already validated + coerced + stripped of unknown keys by
// validate(updateProfileSchema) (see routes/users.js) before this runs, so
// no more manual `if (x !== undefined)` guards or parseInt/parseFloat calls
// are needed here — Zod already did the type coercion and rejected anything
// out of range.
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, email, college, state, category, rank, bio, branch, cgpa, categoryRank, preferredLang, gender } = req.body;

  const user = req.user;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (email !== undefined) user.email = email;

  if (user.role === 'mentor') {
    if (college !== undefined) user.college = college;
    if (branch !== undefined) user.branch = branch;
    if (cgpa !== undefined) user.cgpa = cgpa;
    if (state !== undefined) user.state = state;
    if (category !== undefined) user.category = category;
    if (rank !== undefined) user.rank = rank;
    if (categoryRank !== undefined) user.categoryRank = categoryRank;
    if (preferredLang !== undefined) user.preferredLang = preferredLang;
    if (gender !== undefined) user.gender = gender;
    if (bio !== undefined) user.bio = bio;
    // bundles is intentionally not settable here — see updateProfileSchema
    // comment above and adminUpdateMentorBundles below.
  }
  await user.save();
  res.json({ ok: true, user: user.toSafeJSON() });
});

// PATCH /api/admin/mentors/:id/bundles — admin-only. Replaces a mentor's
// bundles array wholesale with the given list. This is the only way bundles
// can change now that self-service editing has been removed from
// updateProfile (see above).
export const adminUpdateMentorBundlesSchema = z.object({
  bundles: z.array(z.string().trim().min(1)).max(20, "Too many bundles"),
});

export const adminUpdateMentorBundles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bundles } = req.body;

  const mentor = await User.findById(id);
  if (!mentor || mentor.role !== 'mentor') {
    throw new AppError('Mentor not found', 404);
  }

  mentor.bundles = bundles;
  await mentor.save();

  res.json({ ok: true, mentor: mentor.toSafeJSON() });
});
