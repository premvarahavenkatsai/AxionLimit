/*
 * One-time security migration for installations created before hashed API keys.
 * It removes the legacy raw `key` field. Those legacy keys are intentionally
 * revoked because a raw secret cannot be safely converted after the fact.
 */
const { connectDB, mongoose } = require('../config/db');
const ApiKey = require('../models/ApiKey');

async function run() {
  await connectDB();
  const result = await ApiKey.collection.updateMany(
    { key: { $exists: true } },
    { $unset: { key: '' }, $set: { isActive: false } }
  );
  console.log(`Purged raw values and disabled ${result.modifiedCount} legacy API key(s).`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Legacy API-key purge failed:', err);
  await mongoose.disconnect();
  process.exitCode = 1;
});
