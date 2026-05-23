import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/asyncHandler.js';
import { Admin } from '../models/Admin.js';

// Requires a valid Bearer token from a real admin in the DB. Attaches
// req.admin so downstream handlers can use it.
export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin) throw new AppError('Admin not found', 401);

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}

// Requires a valid Bearer token from a real user (or admin) in the DB.
export async function requireUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }

    // Try finding an admin first (so admins can hit user routes), else find a user
    let user = await Admin.findById(payload.sub);
    if (!user) {
      const { User } = await import('../models/User.js');
      user = await User.findById(payload.sub);
    }
    
    if (!user) throw new AppError('User not found', 401);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
