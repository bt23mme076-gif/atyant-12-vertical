import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDecision } from '../services/decisionService.js';
import { Lead } from '../models/Lead.js';

export const decideSchema = z.object({
  stream: z.enum(['pcm', 'pcb', 'commerce']),
  rank: z.number().int().nonnegative(),
  confusion: z.string().max(2000).optional(),
  // optional contact — if provided we also create a lead so the team
  // can reach out.
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
});

export const decide = asyncHandler(async (req, res) => {
  const { stream, rank, confusion, name, email } = req.body;
  const result = getDecision({ stream, rank, confusion });

  let leadId = null;
  if (name && email) {
    const lead = await Lead.create({
      name,
      email,
      source: 'decision_engine',
      stream,
      rank,
      confusion,
      meta: { userAgent: req.headers['user-agent'], ip: req.ip },
    });
    leadId = lead._id;
  }

  res.json({ ok: true, result, leadId });
});
