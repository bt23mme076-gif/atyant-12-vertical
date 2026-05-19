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
