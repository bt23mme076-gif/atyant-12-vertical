import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { config } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import contentRoutes from './routes/content.js';
import chatRoutes from './routes/chat.js';
import decisionRoutes from './routes/decision.js';
import paymentRoutes from './routes/payments.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import { webhook as paymentsWebhook } from './controllers/paymentController.js';

const app = express();

app.set('trust proxy', 1); // honour X-Forwarded-For when behind a proxy

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// gzip/brotli-negotiated response compression. Mounted after helmet (so
// security headers are set first) and before any routes, so every JSON/HTML
// response gets compressed. Cheap CPU cost, meaningful bandwidth/latency win
// on the larger JSON payloads (mentor lists, roadmap content, etc.).
app.use(compression());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Origins now come from config.corsOrigins (parsed from CORS_ORIGINS in
// env.js) instead of being hardcoded here, so allowed origins can change
// per-deploy without a code change. Make sure CORS_ORIGINS is set in every
// environment — see .env.example for the production defaults.
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Triggered a nodemon restart to ensure .env is reloaded

// We mount it BEFORE the JSON parser, with a raw parser that also stores
// the buffer on req.rawBody.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body; // Buffer
    next();
  },
  paymentsWebhook
);

// Now the regular JSON parser for everything else
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'atyant-backend', env: config.nodeEnv, time: new Date().toISOString() });
});
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'atyant-backend', docs: '/api' });
});

import uploadRoutes from './routes/upload.js';
import roadmapRoutes from './routes/roadmap.js';
import careerRoutes from './routes/careers.js';
import quizRoutes from './routes/quiz.js';
import courseRoutes from './routes/courses.js';

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/decision', decisionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/courses', courseRoutes);

// 404 + error handler last
app.use(notFoundHandler);
app.use(errorHandler);

export default app;