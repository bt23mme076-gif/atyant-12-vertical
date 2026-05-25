import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import mongoose from 'mongoose';

async function start() {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`Atyant backend listening on http://localhost:${config.port}`);
    console.log(`   env=${config.nodeEnv}`);
  });

  // Graceful shutdown — finish in-flight requests, then close DB
  const shutdown = (signal) => async () => {
    console.log(`\n${signal} received — shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    // Hard exit after 10s
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
