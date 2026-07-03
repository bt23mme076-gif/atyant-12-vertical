// One-shot script: `node src/scripts/migrateMentorBundles.js`
//
// This used to run on EVERY server boot inside connectDB() (config/db.js),
// which meant iterating every mentor document and JSON-diffing their
// bundles array on every single restart — wasted work on every deploy once
// the data was actually migrated. Moved here to run once (or whenever you
// need to re-normalize legacy bundle values), following the same pattern as
// seedAdmin.js / seedRoadmap.js.
//
// What it does:
// - Converts legacy bundle names/ids (mentor-facing labels like "Dream Seat
//   Protection™" or old ids like "dream-seat") to the current canonical ids
//   ("complete-round", "ultimate-peace").
// - Drops discontinued plans (Quick/Starter Clarity, Complete Guidance) from
//   any mentor's bundles array entirely.
// - De-duplicates the resulting array.
//
// Safe to re-run: it only writes a mentor's bundles field when the
// normalized array actually differs from what's stored.
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

async function run() {
  await connectDB();

  const mentors = await User.find({ role: 'mentor' });

  let updatedCount = 0;
  for (const mentor of mentors) {
    if (Array.isArray(mentor.bundles)) {
      const originalStr = JSON.stringify(mentor.bundles);

      let newBundles = mentor.bundles.map((b) => {
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
    console.log(`✅ Migrated ${updatedCount} mentor profile(s) to canonical bundle ids.`);
  } else {
    console.log('✅ No mentor profiles needed bundle migration — already canonical.');
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
