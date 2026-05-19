import rateLimit from 'express-rate-limit';

// Tight limit on login attempts to slow brute force.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lead capture — public endpoint, prevent spam floods.
export const leadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Too many submissions. Please wait a moment.' },
});

// Chat — public, but LLM calls cost money. Tight per-IP cap.
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { ok: false, error: 'Sending messages too fast. Slow down a bit.' },
});

// Decision engine — public, cheap to compute, but still rate limit.
export const decisionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
});
