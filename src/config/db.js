import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('MongoDB connected');

    try {
      await mongoose.connection.collection('users').dropIndex('email_1');
      console.log('Dropped old users email unique index successfully');
    } catch (e) {}

    try {
      await mongoose.connection.collection('leads').dropIndex('email_1');
      console.log('Dropped old leads email unique index successfully');
    } catch (e) {}

    try {
      await mongoose.connection.collection('payments').dropIndex('email_1');
      console.log('Dropped old payments email unique index successfully');
    } catch (e) {}

    // NOTE: these three dropIndex calls are still here because I couldn't
    // confirm from the sandbox whether the `email_1` unique indexes have
    // actually been dropped in your production database — deleting this
    // recovery logic without checking first could silently reintroduce old
    // "duplicate key on email" crashes on a fresh/restored DB. Each call is
    // already a cheap no-op (empty catch) once the index is gone, so leaving
    // them costs nothing at boot. Please confirm production is clean and I'll
    // remove these in a follow-up pass.
    //
    // The mentor-bundle migration that used to run here on every boot has
    // moved to src/scripts/migrateMentorBundles.js — run it manually
    // (`node src/scripts/migrateMentorBundles.js`) instead of paying its cost
    // on every server restart.

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

