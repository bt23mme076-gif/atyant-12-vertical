import { config } from '../config/env.js';
import { AppError } from '../utils/asyncHandler.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: 'Not found', path: req.originalUrl });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Mongoose validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    console.error('⚠️  Duplicate key error — field/value:', JSON.stringify(err.keyValue));
    return res.status(409).json({
      ok: false,
      error: 'Duplicate value',
      field: Object.keys(err.keyValue || {})[0] || 'unknown',
      details: err.keyValue,
    });
  }
  // Mongoose cast (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ ok: false, error: `Invalid ${err.path}` });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const body = {
    ok: false,
    error: err.message || 'Internal server error',
  };
  if (err.details) body.details = err.details;
  if (config.nodeEnv !== 'production' && statusCode >= 500) {
    body.stack = err.stack;
  }

  if (statusCode >= 500) console.error('🔥', err);
  res.status(statusCode).json(body);
}
