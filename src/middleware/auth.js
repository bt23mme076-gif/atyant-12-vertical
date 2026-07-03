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
// Also enforces single-device login for students/mentors: every login mints
// a fresh `sid` stored on the user record and embedded in the JWT. If the
// token's `sid` no longer matches the user's `activeSessionId` (because they
// logged in elsewhere), the request is rejected with SESSION_INVALIDATED so
// the frontend can show "logged out because you signed in on another
// device" and force a re-login.
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
    let isAdmin = !!user;
    if (!user) {
      const { User } = await import('../models/User.js');
      user = await User.findById(payload.sub);
    }

    if (!user) throw new AppError('User not found', 401);

    // Single-device enforcement only applies to real student/mentor accounts
    // (admins are exempt so the team can stay logged in on multiple machines).
    if (!isAdmin && user.activeSessionId && payload.sid !== user.activeSessionId) {
      const err = new AppError('You have been logged out because your account was accessed from another device', 401);
      err.code = 'SESSION_INVALIDATED';
      throw err;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Best-effort auth for endpoints that must stay usable by guests (no token)
// but need to know who's calling *if* they're logged in — e.g.
// /api/payments/verify, which supports guest checkout but should verify
// order ownership when the caller does have a session. Unlike requireUser,
// this NEVER rejects the request: a missing, malformed, or expired token
// just means req.user stays undefined and the route treats the caller as a
// guest. Single-device session invalidation is intentionally not enforced
// here (it would turn "silently treat as guest" into an unexpected 401 for a
// route guests are allowed to hit).
export async function optionalUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next();
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return next();
    }

    let user = await Admin.findById(payload.sub);
    if (!user) {
      const { User } = await import('../models/User.js');
      user = await User.findById(payload.sub);
    }

    if (user) req.user = user;
    next();
  } catch (err) {
    // Any unexpected error here should degrade to "treat as guest", not
    // block the request.
    next();
  }
}
