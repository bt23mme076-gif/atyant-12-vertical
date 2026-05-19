import { z } from 'zod';
import { Admin } from '../models/Admin.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email: email.toLowerCase() });
  // Constant-ish response to avoid leaking which emails exist
  if (!admin) throw new AppError('Invalid credentials', 401);

  const ok = await admin.verifyPassword(password);
  if (!ok) throw new AppError('Invalid credentials', 401);

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signToken({ sub: admin._id.toString(), role: admin.role });
  res.json({ ok: true, token, admin: admin.toSafeJSON() });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, admin: req.admin.toSafeJSON() });
});
