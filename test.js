import mongoose from 'mongoose';
import { User } from './backend/src/models/User.js';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const mentors = await User.find({ role: 'mentor' });
  console.log(mentors.map(m => ({ email: m.email, name: m.name, college: m.college, bundles: m.bundles, bio: m.bio })));
  process.exit(0);
}
check();
