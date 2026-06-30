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

    // Background migration: automatically convert mentor bundles to standard canonical IDs
    // - Converts ultimate-peace to standard ID with new ₹1999 student pricing
    // - Converts complete-round to standard ID with new ₹999 student pricing
    // - Filters out starter-clarity (₹99) and complete-guidance (₹399) plans, which have been discontinued
    try {
      const UserModule = await import('../models/User.js');
      const User = UserModule.User;
      const mentors = await User.find({ role: 'mentor' });
      
      let updatedCount = 0;
      for (const mentor of mentors) {
        if (Array.isArray(mentor.bundles)) {
          const originalStr = JSON.stringify(mentor.bundles);
          
          let newBundles = mentor.bundles.map(b => {
            if (b === 'Quick Clarity' || b === 'quick-clarity' || b === 'Starter Clarity' || b === 'starter-clarity') {
              return null;
            }
            if (b === 'Complete Guidance' || b === 'complete-guidance') {
              return null;
            }
            if (b === 'Dream Seat Protection™' || b === 'dream-seat' || b === 'Complete Round Support' || b === 'complete-round') {
              return 'complete-round';
            }
            if (b === 'Ultimate Peace of Mind' || b === 'ultimate-peace') {
              return 'ultimate-peace';
            }
            return b;
          }).filter(Boolean);

          newBundles = [...new Set(newBundles)];

          if (JSON.stringify(newBundles) !== originalStr) {
            await User.updateOne({ _id: mentor._id }, { $set: { bundles: newBundles } });
            updatedCount++;
          }
        }
      }
      if (updatedCount > 0) {
        console.log(`[Migration] Successfully converted ${updatedCount} mentor profiles to standard ₹999 / ₹1999 pricing bundles!`);
      }
    } catch (e) {
      console.error('Error during mentor bundle database migration:', e);
    }

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

