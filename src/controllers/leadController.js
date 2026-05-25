import { z } from 'zod';
import { Lead } from '../models/Lead.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';

export const createLeadSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  source: z.enum(['lead_modal', 'chat', 'decision_engine', 'pricing', 'other']).optional(),
  stream: z.enum(['pcm', 'pcb', 'commerce']).optional(),
  rank: z.number().int().nonnegative().optional(),
  confusion: z.string().max(2000).optional(),
});

export const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    ...req.body,
    meta: {
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.headers.referrer,
      ip: req.ip,
    },
  });
  res.status(201).json({ ok: true, lead: { id: lead._id, createdAt: lead.createdAt } });
});

// Admin: list with pagination/filtering
export const listLeads = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  if (req.query.q) {
    const rx = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Lead.countDocuments(filter),
  ]);

  res.json({ ok: true, page, limit, total, items });
});

export const updateLeadSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  phone: z.string().max(20).optional(),
  name: z.string().min(1).max(120).optional(),
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!lead) throw new AppError('Lead not found', 404);
  res.json({ ok: true, lead });
});

export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) throw new AppError('Lead not found', 404);
  res.json({ ok: true });
});

// Admin: CSV export
export const exportLeadsCsv = asyncHandler(async (req, res) => {
  const leads = await Lead.find({}).sort({ createdAt: -1 }).lean();

  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };

  const header = ['Name', 'Email', 'Phone', 'Source', 'Stream', 'Rank', 'Status', 'Confusion', 'Captured At'];
  const rows = leads.map((l) =>
    [
      escape(l.name),
      escape(l.email),
      escape(l.phone),
      escape(l.source),
      escape(l.stream),
      escape(l.rank),
      escape(l.status),
      escape(l.confusion),
      escape(l.createdAt?.toISOString()),
    ].join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leads-${Date.now()}.csv"`);
  res.send(csv);
});
