/**
 * Run once to drop any stale / incorrect unique indexes on the payments collection.
 * Usage:  node --experimental-vm-modules src/scripts/fixIndexes.js
 *    OR:  npm run fix:indexes   (add to package.json if needed)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌  MONGODB_URI not set');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log('✅  Connected to MongoDB');

const db = mongoose.connection.db;
const col = db.collection('payments');

// List current indexes
const indexes = await col.indexes();
console.log('\n📋  Current indexes on "payments" collection:');
indexes.forEach((idx) => {
  console.log(`  - key: ${JSON.stringify(idx.key)}  unique: ${idx.unique ?? false}  name: ${idx.name}`);
});

// Fields that should NOT be unique (only cashfreeOrderId should be unique)
const SHOULD_NOT_BE_UNIQUE = ['email', 'phone', 'paymentSessionId'];

let dropped = 0;
for (const idx of indexes) {
  if (!idx.unique) continue;               // not unique → fine
  if (idx.name === '_id_') continue;       // _id is always unique → fine
  const fields = Object.keys(idx.key);
  if (fields.length === 1 && fields[0] === 'cashfreeOrderId') continue; // correct unique

  // Anything else that is unique is stale — drop it
  console.log(`\n🗑️   Dropping stale unique index "${idx.name}" on field(s): ${fields.join(', ')}`);
  await col.dropIndex(idx.name);
  dropped++;
}

if (dropped === 0) {
  console.log('\n✅  No stale unique indexes found — indexes are clean.');
} else {
  console.log(`\n✅  Dropped ${dropped} stale index(es). Re-run to verify.`);
}

await mongoose.disconnect();
console.log('👋  Done');
