// LOCAL-ONLY debugging helper — dumps mentor PII (email, name, college,
// bundles, bio) to the console. This replaces the old repo-root `test.js`,
// which did the same thing but sat in the project root where it looked like
// a real test file and was easy to accidentally run in a shared/CI
// environment. Keeping the same capability here because it's genuinely
// useful for local debugging, but under a name/location that makes clear
// it's a manual, local-only tool — never run this against production data
// without a good reason, and never commit its output anywhere.
//
// Usage: node src/scripts/debugDumpMentors.js
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

async function run() {
  await connectDB();

  const mentors = await User.find({ role: 'mentor' });

  console.log(
    mentors.map((m) => ({
      email: m.email,
      name: m.name,
      college: m.college,
      bundles: m.bundles,
      bio: m.bio,
    }))
  );

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('debugDumpMentors failed:', err);
  process.exit(1);
});
