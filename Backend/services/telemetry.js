const { getRedisClient } = require('../config/db');

// Redis records #4–#8: shared dashboard telemetry.
// - telemetry:total_requests     (counter)
// - telemetry:allowed_requests   (counter)
// - telemetry:blocked_requests   (counter)
// - telemetry:top_users          (sorted set: API-key name → request count)
// - telemetry:top_endpoints      (sorted set: endpoint → request count)

const getTelemetryKeys = (ownerUserId = 'global') => {
  const prefix = `telemetry:${ownerUserId || 'global'}`;
  return {
    total: `${prefix}:total_requests`,
    allowed: `${prefix}:allowed_requests`,
    blocked: `${prefix}:blocked_requests`,
    topUsers: `${prefix}:top_users`,
    topEndpoints: `${prefix}:top_endpoints`
  };
};

const logAnalytics = async (identifier, endpoint, allowed, ownerUserId = 'global') => {
  const redis = getRedisClient();

  if (!redis || redis.status !== 'ready') return;

  const keys = getTelemetryKeys(ownerUserId);

  try {
    const pipeline = redis.pipeline();

    pipeline.incr(keys.total);

    if (allowed) {
      pipeline.incr(keys.allowed);
    } else {
      pipeline.incr(keys.blocked);
    }

    const activeIdentifier = identifier || 'anonymous';
    const activeEndpoint = endpoint || '/unknown';

    pipeline.zincrby(keys.topUsers, 1, activeIdentifier);
    pipeline.zincrby(keys.topEndpoints, 1, activeEndpoint);

    await pipeline.exec();
  } catch (err) {
    console.error('❌ Telemetry pipeline processing error:', err);
  }
};

const getStats = async (ownerUserId = 'global') => {
  const redis = getRedisClient();

  const emptyStats = {
    total: 0,
    allowed: 0,
    blocked: 0,
    topUsers: [],
    topEndpoints: []
  };

  if (!redis || redis.status !== 'ready') {
    return emptyStats;
  }

  const keys = getTelemetryKeys(ownerUserId);

  try {
    const [total, allowed, blocked] = await redis.mget(
      keys.total,
      keys.allowed,
      keys.blocked
    );

    const topUsersRaw = await redis.zrevrange(keys.topUsers, 0, 9, 'WITHSCORES');
    const topEndpointsRaw = await redis.zrevrange(keys.topEndpoints, 0, 9, 'WITHSCORES');

    const parseSortedSet = (rawList) => {
      const result = [];
      for (let i = 0; i < rawList.length; i += 2) {
        result.push({
          name: rawList[i],
          value: parseInt(rawList[i + 1], 10)
        });
      }
      return result;
    };

    return {
      total: parseInt(total || 0, 10),
      allowed: parseInt(allowed || 0, 10),
      blocked: parseInt(blocked || 0, 10),
      topUsers: parseSortedSet(topUsersRaw),
      topEndpoints: parseSortedSet(topEndpointsRaw)
    };
  } catch (err) {
    console.error('❌ Telemetry stats fetch error:', err);
    return emptyStats;
  }
};

const resetStats = async (ownerUserId = 'global') => {
  const redis = getRedisClient();
  if (!redis || redis.status !== 'ready') return;

  const keys = getTelemetryKeys(ownerUserId);

  try {
    await redis.del(
      keys.total,
      keys.allowed,
      keys.blocked,
      keys.topUsers,
      keys.topEndpoints
    );
  } catch (err) {
    console.error('❌ Error resetting telemetry stats:', err);
  }
};

module.exports = {
  logAnalytics,
  getStats,
  resetStats
};
