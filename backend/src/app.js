import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { webhook as paymentsWebhook } from './controllers/paymentController.js';

const app = express();

app.set('trust proxy', 1); // honour X-Forwarded-For when behind a proxy

app.use(helmet());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(
  cors({
    origin: [
      'https://atyantjee.vercel.app', // added for production frontend
      'http://localhost:3000', // keep for local dev
      'http://localhost:5173', // if using Vite
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// IMPORTANT: Razorpay webhook needs the RAW body to verify the signature.
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/decision', decisionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// 404 + error handler last
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
