const mongoose = require('mongoose');
const Redis = require('ioredis');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/axionlimit';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// The project uses ONE shared Redis connection. Different features use different
// Redis key names (for example, `apikey:*` and `rate_limit:*`) on this same server.
let redisClient = null;

const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected.');
    });

    await mongoose.connect(mongoUri);
    const ApiKey = require('../models/ApiKey');
    await ApiKey.syncIndexes().catch(err => console.warn('⚠️ Sync indexes warning:', err.message));
  } catch (err) {
    console.error('❌ MongoDB initial connection failed:', err);
    process.exit(1);
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      }
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully.');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    redisClient.on('close', () => {
      console.warn('⚠️ Redis connection closed.');
    });

    redisClient.on('reconnecting', (time) => {
      console.log(`🔄 Redis reconnecting: attempt in ${time}ms...`);
    });
  } catch (err) {
    console.error('❌ Redis initial connection failed:', err);
  }
};

module.exports = {
  connectDB,
  getRedisClient: () => redisClient,
  setRedisClient: (client) => { redisClient = client; },
  mongoose
};
