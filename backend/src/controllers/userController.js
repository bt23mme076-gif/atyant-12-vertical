import { z } from 'zod';
import { User } from '../models/User.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['student', 'mentor']),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('Email already in use', 400);
  }

  // Double check if a user with the same phone already exists if you want strict unique accounts
  const existingPhone = await User.findOne({ phone });
  if (existingPhone) {
    throw new AppError('Phone number already registered', 400);
  }

  const user = new User({ name, email, phone, role });
  await user.setPassword(password);
  await user.save();

  const token = signToken({ sub: user._id.toString(), role: user.role });
  res.status(201).json({ ok: true, token, user: user.toSafeJSON() });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('Invalid credentials', 401);

  const ok = await user.verifyPassword(password);
  if (!ok) throw new AppError('Invalid credentials', 401);

  user.lastLoginAt = new Date();
  await user.save();
  const token = signToken({ sub: user._id.toString(), role: user.role });
  res.json({ ok: true, token, user: user.toSafeJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: req.user.toSafeJSON() });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, college, state, rank, bundles, bio } = req.body;
  
  const user = req.user;
  if (name !== undefined) user.name = name;
  
  if (user.role === 'mentor') {
    if (college !== undefined) user.college = college;
    if (state !== undefined) user.state = state;
    if (rank !== undefined) {
      const parsedRank = parseInt(rank, 10);
      user.rank = isNaN(parsedRank) ? 0 : parsedRank;
    }
    if (bundles !== undefined) user.bundles = Array.isArray(bundles) ? bundles : [];
    if (bio !== undefined) user.bio = bio;
  }
  await user.save();
  res.json({ ok: true, user: user.toSafeJSON() });
});
