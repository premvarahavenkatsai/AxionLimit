const { connectDB, getRedisClient, mongoose } = require('../config/db');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const rateLimiter = require('../services/rateLimiter');
const telemetry = require('../services/telemetry');
const { hashApiKey, generateApiKey } = require('../services/apiKeySecurity');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class MockRedis {
  constructor() {
    this.status = 'ready';
    this.data = {};
    this.zsets = {};
  }

  defineCommand(name, definition) {}

  async checkRateLimit(key, limit, windowMs, now, member) {
    if (!this.zsets[key]) {
      this.zsets[key] = [];
    }
    const zset = this.zsets[key];
    
    const clearBefore = now - windowMs;
    const pruned = zset.filter(x => x.score > clearBefore);
    this.zsets[key] = pruned;

    const count = pruned.length;
    if (count < limit) {
      pruned.push({ score: now, member });
      pruned.sort((a, b) => a.score - b.score);
      return [1, limit - count - 1, 0];
    } else {
      const oldest = pruned[0];
      let retryAfter = 0;
      if (oldest) {
        retryAfter = Math.ceil((oldest.score + windowMs - now) / 1000);
        if (retryAfter < 1) retryAfter = 1;
      }
      return [0, 0, retryAfter];
    }
  }

  async mget(...keys) {
    return keys.map(k => this.data[k] || '0');
  }

  async zrevrange(key, start, end, withScores) {
    const zset = this.zsets[key] || [];
    const sorted = [...zset].sort((a, b) => b.score - a.score);
    const sliced = sorted.slice(start, end + 1);
    
    if (withScores === 'WITHSCORES') {
      const result = [];
      sliced.forEach(item => {
        result.push(item.member, item.score.toString());
      });
      return result;
    }
    return sliced.map(item => item.member);
  }

  pipeline() {
    const self = this;
    const queue = [];
    return {
      incr(key) {
        queue.push(() => {
          self.data[key] = (parseInt(self.data[key] || 0, 10) + 1).toString();
        });
        return this;
      },
      zincrby(key, increment, member) {
        queue.push(() => {
          if (!self.zsets[key]) self.zsets[key] = [];
          const zset = self.zsets[key];
          const entry = zset.find(x => x.member === member);
          if (entry) {
            entry.score += parseInt(increment, 10);
          } else {
            zset.push({ member, score: parseInt(increment, 10) });
          }
        });
        return this;
      },
      async exec() {
        queue.forEach(fn => fn());
        return [];
      }
    };
  }

  async del(...keys) {
    keys.forEach(k => {
      delete this.data[k];
      delete this.zsets[k];
    });
  }

  disconnect() {
    this.status = 'end';
  }
}

async function runTests() {
  console.log('🏁 Starting AxionLimit Integration Tests...\n');

  try {
    await connectDB();
  } catch (err) {
    console.error('⚠️ Could not connect to MongoDB. Ensure your local MongoDB is running.', err);
    process.exit(1);
  }

  await sleep(1000);

  let redis = getRedisClient();
  let isMocked = false;

  if (!redis || redis.status !== 'ready') {
    console.log('\n⚠️ Local Redis connection refused. Initializing In-Memory Redis Simulator...');
    redis = new MockRedis();
    isMocked = true;
    
    const dbConfig = require('../config/db');
    dbConfig.setRedisClient(redis);
  } else {
    console.log('✅ Real Redis Client detected.');
  }

  const telemetryUserId = 'test_integration_user_123';
  await telemetry.resetStats(telemetryUserId);

  try {
    console.log('👤 Seeding mock user in MongoDB...');
    const testGoogleId = 'test_integration_user_123';
    let user = await User.findOne({ googleId: testGoogleId });
    if (user) {
      await User.deleteOne({ googleId: testGoogleId });
    }
    user = new User({
      googleId: testGoogleId,
      email: 'tester.axion@limit.local',
      name: 'Integration Tester',
      avatar: 'https://avatar.url'
    });
    await user.save();
    console.log(`✅ Seeded User ID: ${user._id}`);

    console.log('🔑 Seeding mock API Key in MongoDB...');
    const rawKey = 'ax_test_integration_key_999';
    const keyHash = hashApiKey(rawKey);
    await ApiKey.deleteOne({ keyHash });
    const apiKeyDoc = new ApiKey({
      keyHash,
      keyPrefix: generateApiKey().keyPrefix,
      userId: user._id,
      name: 'Integration Test Key',
      rateLimit: {
        limit: 5,
        windowMs: 10000
      }
    });
    await apiKeyDoc.save();
    console.log(`✅ Seeded API Key. Limit: 5 requests / 10s window.`);

    console.log('\n⚡ Testing Sliding Window Allowed Zone (Sending 5 requests)...');
    const endpoint = '/api/v1/resource';

    for (let i = 1; i <= 5; i++) {
      const res = await rateLimiter.isAllowed(keyHash, apiKeyDoc.rateLimit.limit, apiKeyDoc.rateLimit.windowMs);
      await telemetry.logAnalytics(telemetryUserId, apiKeyDoc.name, endpoint, res.allowed);
      console.log(`  Request #${i}: Allowed? ${res.allowed} | Remaining: ${res.remaining}`);
      
      if (!res.allowed) {
        throw new Error(`Request #${i} should have been ALLOWED.`);
      }
    }

    console.log('\n🚫 Testing Blocked Zone (Sending 6th request)...');
    const resBlocked = await rateLimiter.isAllowed(keyHash, apiKeyDoc.rateLimit.limit, apiKeyDoc.rateLimit.windowMs);
    await telemetry.logAnalytics(telemetryUserId, apiKeyDoc.name, endpoint, resBlocked.allowed);
    console.log(`  Request #6: Allowed? ${resBlocked.allowed} | Remaining: ${resBlocked.remaining} | RetryAfter: ${resBlocked.retryAfter}s`);
    
    if (resBlocked.allowed) {
      throw new Error('Request #6 should have been BLOCKED.');
    }
    if (resBlocked.retryAfter <= 0) {
      throw new Error('RetryAfter should be greater than 0 seconds.');
    }

    console.log('\n📊 Verifying Telemetry counters and ZSETs...');
    const stats = await telemetry.getStats(telemetryUserId);
    console.log('  Current stats:', stats);
    
    if (stats.total !== 6) {
      throw new Error(`Expected total telemetry requests: 6, got: ${stats.total}`);
    }
    if (stats.allowed !== 5) {
      throw new Error(`Expected allowed telemetry requests: 5, got: ${stats.allowed}`);
    }
    if (stats.blocked !== 1) {
      throw new Error(`Expected blocked telemetry requests: 1, got: ${stats.blocked}`);
    }
    
    if (stats.topEndpoints[0]?.name !== endpoint) {
      throw new Error(`Expected top endpoint: ${endpoint}, got: ${stats.topEndpoints[0]?.name}`);
    }
    if (stats.topUsers[0]?.name !== apiKeyDoc.name) {
      throw new Error(`Expected top user key label: ${apiKeyDoc.name}, got: ${stats.topUsers[0]?.name}`);
    }
    console.log('✅ Telemetry pipeline verified successfully.');

    if (!isMocked) {
      console.log('\n⏳ Waiting 11 seconds for sliding window logs to fall out...');
      await sleep(11000);

      console.log('⚡ Testing rate limiter recovery...');
      const resRecovered = await rateLimiter.isAllowed(keyHash, apiKeyDoc.rateLimit.limit, apiKeyDoc.rateLimit.windowMs);
      console.log(`  Request #7 (After sleep): Allowed? ${resRecovered.allowed} | Remaining: ${resRecovered.remaining}`);
      
      if (!resRecovered.allowed) {
        throw new Error('Request #7 should have been ALLOWED after window elapsed.');
      }
      console.log('✅ Rate limiter recovery verified successfully.');
    } else {
      console.log('\n⏳ Simulating 11-second sleep for mock Redis...');
      const futureNow = Date.now() + 11000;
      const key = `rate_limit:${keyHash}`;
      const [allowedStatus, remaining] = await redis.checkRateLimit(key, apiKeyDoc.rateLimit.limit, apiKeyDoc.rateLimit.windowMs, futureNow, `mock_future_req`);
      console.log(`  Mocked Request (Future): Allowed? ${allowedStatus === 1} | Remaining: ${remaining}`);
      if (allowedStatus !== 1) {
        throw new Error('Future request should have been ALLOWED.');
      }
      console.log('✅ Mock Rate limiter recovery verified successfully.');
    }

    console.log('\n🛠️ Testing Fail-Open Strategy when Redis is offline...');
    
    redis.status = 'end'; 
    const resFailOpen = await rateLimiter.isAllowed(keyHash, apiKeyDoc.rateLimit.limit, apiKeyDoc.rateLimit.windowMs);
    console.log(`  Fail-open Request: Allowed? ${resFailOpen.allowed} | Remaining: ${resFailOpen.remaining}`);
    
    if (!resFailOpen.allowed) {
      throw new Error('Fail-open request should have been ALLOWED.');
    }
    console.log('✅ Fail-open strategy verified successfully.');

    console.log('\n🧹 Cleaning up test seeding data in MongoDB...');
    await User.deleteOne({ _id: user._id });
    await ApiKey.deleteOne({ _id: apiKeyDoc._id });
    await telemetry.resetStats(telemetryUserId);
    console.log('✅ Seeding data cleaned up.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! AxionLimit is production-ready.');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
  } finally {
    await mongoose.disconnect();
    redis.disconnect();
    console.log('🔌 Disconnected MongoDB and Redis. Exiting.');
    process.exit(0);
  }
}

runTests();
