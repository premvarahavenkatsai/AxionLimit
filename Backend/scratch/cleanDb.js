const mongoose = require('mongoose');
const { connectDB } = require('../config/db');

(async () => {
  await connectDB();
  const collection = mongoose.connection.collection('apikeys');
  const docs = await collection.find({}).toArray();
  console.log('Total documents in apikeys:', docs.length);
  
  const corrupted = docs.filter(d => !d.keyHash);
  console.log('Corrupted docs (missing keyHash):', corrupted.length);

  if (corrupted.length > 0) {
    const res = await collection.deleteMany({ $or: [{ keyHash: null }, { keyHash: { $exists: false } }] });
    console.log('✅ Cleaned up corrupted docs:', res.deletedCount);
  }

  const ApiKey = require('../models/ApiKey');
  await ApiKey.syncIndexes();
  console.log('✅ ApiKey indexes synced successfully!');
  process.exit(0);
})();
