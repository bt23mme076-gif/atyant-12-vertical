import { AppError } from '../utils/asyncHandler.js';

// Generic Zod validator for req.body. Returns 400 with field-level errors.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(new AppError('Validation failed', 400, details));
  }
  req.body = result.data; // strip unknown fields / coerce types
  next();
};
