import { z } from 'zod';
import crypto from 'node:crypto';
import { ChatSession } from '../models/ChatSession.js';
import { asyncHandler, AppError } from '../utils/asyncHandler.js';
import { generateReply } from '../services/chatService.js';

export const sendMessageSchema = z.object({
  // sessionId is optional — if missing, server creates one
  sessionId: z.string().min(8).max(128).optional(),
  message: z.string().min(1).max(2000),
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  let { sessionId } = req.body;

  // Find or create session
  let session;
  if (sessionId) {
    session = await ChatSession.findOne({ sessionId });
  }
  if (!session) {
    sessionId = sessionId || crypto.randomUUID();
    session = await ChatSession.create({
      sessionId,
      meta: { userAgent: req.headers['user-agent'], ip: req.ip },
    });
  }

  // Append the user message BEFORE we call the model so it's in history.
  // But we send the LLM only the prior history + the new message body to
  // avoid double-counting in `chatService`.
  const reply = await generateReply({ session, userMessage: message });

  session.messages.push({ role: 'user', content: message });
  session.messages.push({ role: 'assistant', content: reply.content });
  await session.save();

  res.json({
    ok: true,
    sessionId,
    reply: reply.content,
    stub: reply.stub === true,
  });
});

// Admin-only: list sessions for visibility
export const listSessions = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);

  const [items, total] = await Promise.all([
    ChatSession.find({})
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('sessionId messages updatedAt createdAt'),
    ChatSession.countDocuments(),
  ]);

  const summary = items.map((s) => ({
    sessionId: s.sessionId,
    messageCount: s.messages.length,
    lastMessage: s.messages.at(-1)?.content?.slice(0, 200) || '',
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
  }));

  res.json({ ok: true, page, limit, total, items: summary });
});

export const getSession = asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
  if (!session) throw new AppError('Session not found', 404);
  res.json({ ok: true, session });
});
