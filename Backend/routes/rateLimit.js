const express = require('express');
const rateLimiter = require('../services/rateLimiter');
const telemetry = require('../services/telemetry');
const { verifyApiKey, verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.all(['/check-limit', '/check-limit/*'], verifyApiKey, async (req, res) => {
  try {
    const { keyHash: apiKeyIdentifier, limit: requestLimit, windowMs: windowDurationMs, name: apiKeyName, userId: ownerUserId } = req.apiKeyMetadata;
    const subPath = req.path.replace(/^\/check-limit/, '');
    const requestedEndpoint =
      req.query.endpoint ||
      req.body?.endpoint ||
      req.headers['x-endpoint'] ||
      req.headers['endpoint'] ||
      req.headers['x-target-endpoint'] ||
      (subPath && subPath !== '/' ? subPath : '/api/default');

    const endUserId =
      req.headers['x-user-id'] ||
      req.headers['x-client-user-id'] ||
      req.headers['x-identifier'] ||
      req.query.userId ||
      req.query.user_id ||
      req.query.identifier ||
      req.body?.userId ||
      req.body?.user_id ||
      req.body?.identifier ||
      null;

    const activeUserLabel = endUserId ? `${apiKeyName} (${endUserId})` : apiKeyName;
    const rateLimitResult = await rateLimiter.isAllowed(
      apiKeyIdentifier,
      requestLimit,
      windowDurationMs,
      endUserId,
      activeUserLabel,
      requestedEndpoint,
      req.clientIp,
      ownerUserId
    );

    res.setHeader('X-RateLimit-Limit', requestLimit);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimitResult.retryAfter);

    if (rateLimitResult.allowed) {
      return res.status(200).json({
        allowed: true,
        remaining: rateLimitResult.remaining,
        retryAfter: 0
      });
    } else {
      return res.status(429).json({
        allowed: false,
        remaining: 0,
        retryAfter: rateLimitResult.retryAfter
      });
    }
  } catch (rateLimitRequestError) {
    console.error('❌ Error checking rate limit:', rateLimitRequestError);
    return res.status(200).json({
      allowed: true,
      remaining: 1,
      retryAfter: 0,
      warning: 'Server error, failing open.'
    });
  }
});

router.get('/analytics/stats', verifyJWT, async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    const stats = await telemetry.getStats(ownerUserId);
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('❌ Failed to retrieve telemetry stats:', err);
    return res.status(500).json({ error: 'Failed to retrieve telemetry stats.' });
  }
});

router.post('/analytics/reset', verifyJWT, async (req, res) => {
  try {
    const ownerUserId = req.user.userId;
    await telemetry.resetStats(ownerUserId);
    return res.status(200).json({
      success: true,
      message: 'Telemetry counters and rankings reset successfully.'
    });
  } catch (err) {
    console.error('❌ Failed to reset telemetry stats:', err);
    return res.status(500).json({ error: 'Failed to reset telemetry.' });
  }
});

module.exports = router;
