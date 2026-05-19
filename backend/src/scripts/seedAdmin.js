// One-shot script: `npm run seed:admin`
// Creates the first admin user using SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env.
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';

async function run() {
  if (!config.seed.adminEmail || !config.seed.adminPassword) {
    console.error('❌ Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first');
    process.exit(1);
  }

  await connectDB();

  const existing = await Admin.findOne({ email: config.seed.adminEmail.toLowerCase() });
  if (existing) {
    console.log(`ℹ️  Admin ${existing.email} already exists. Updating password.`);
    await existing.setPassword(config.seed.adminPassword);
    await existing.save();
  } else {
    const admin = new Admin({
      email: config.seed.adminEmail,
      name: 'Super Admin',
      role: 'superadmin',
    });
    await admin.setPassword(config.seed.adminPassword);
    await admin.save();
    console.log(`✅ Created admin: ${admin.email}`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
