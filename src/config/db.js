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
