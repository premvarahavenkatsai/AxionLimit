const express = require('express');
const ApiKey = require('../models/ApiKey');
const { verifyJWT } = require('../middleware/auth');
const { getRedisClient } = require('../config/db');
const { generateApiKey, publicApiKey } = require('../services/apiKeySecurity');

const router = express.Router();
const ENVIRONMENTS = new Set(['dev', 'staging', 'prod']);
router.use(verifyJWT);

function validateKeyInput(body, { partial = false } = {}) {
  const updates = {};
  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) return { error: 'A key name is required.' };
    updates.name = body.name.trim();
  }
  if (body.label !== undefined) {
    if (typeof body.label !== 'string') return { error: 'Label must be text.' };
    updates.label = body.label.trim();
  }
  if (body.environment !== undefined) {
    if (!ENVIRONMENTS.has(body.environment)) return { error: 'Environment must be dev, staging, or prod.' };
    updates.environment = body.environment;
  }
  if (body.limit !== undefined) {
    const value = Number.parseInt(body.limit, 10);
    if (!Number.isInteger(value) || value < 1) return { error: 'Limit must be a positive integer.' };
    updates['rateLimit.limit'] = value;
  }
  if (body.windowMs !== undefined) {
    const value = Number.parseInt(body.windowMs, 10);
    if (!Number.isInteger(value) || value < 1000) return { error: 'Window must be at least 1000ms.' };
    updates['rateLimit.windowMs'] = value;
  }
  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === '') updates.expiresAt = null;
    else {
      const value = new Date(body.expiresAt);
      if (Number.isNaN(value.getTime()) || value <= new Date()) return { error: 'Expiration must be a future date.' };
      updates.expiresAt = value;
    }
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') return { error: 'isActive must be true or false.' };
    updates.isActive = body.isActive;
  }
  if (body.ipWhitelist !== undefined) {
    if (!Array.isArray(body.ipWhitelist)) return { error: 'ipWhitelist must be an array of strings.' };
    updates.ipWhitelist = body.ipWhitelist.map(ip => String(ip).trim()).filter(Boolean);
  }
  if (body.ipBlacklist !== undefined) {
    if (!Array.isArray(body.ipBlacklist)) return { error: 'ipBlacklist must be an array of strings.' };
    updates.ipBlacklist = body.ipBlacklist.map(ip => String(ip).trim()).filter(Boolean);
  }
  return { updates };
}

async function invalidateApiKeyCache(keyHash) {
  const redis = getRedisClient();
  if (redis && redis.status === 'ready') await redis.del(`apikey:${keyHash}`);
}

router.get('/', async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    return res.json({ success: true, keys: keys.map(publicApiKey) });
  } catch (err) { return res.status(500).json({ error: 'Failed to retrieve API keys.' }); }
});

router.post('/', async (req, res) => {
  const userId = req.user.userId;
  const input = validateKeyInput(req.body);
  if (input.error) return res.status(400).json({ error: input.error });
  const redis = getRedisClient();
  const quotaKey = `apikey_limit:${userId}:${new Date().toISOString().slice(0, 10)}`;
  let quotaIncremented = false;
  try {
    let count;
    if (redis && redis.status === 'ready') {
      count = await redis.incr(quotaKey); quotaIncremented = true;
      if (count === 1) await redis.expire(quotaKey, Math.max(1, Math.ceil((new Date().setUTCHours(23, 59, 59, 999) - Date.now()) / 1000)));
    } else {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      count = await ApiKey.countDocuments({ userId, createdAt: { $gte: start } });
    }
    if (count > 3) {
      if (quotaIncremented) await redis.decr(quotaKey);
      return res.status(429).json({ error: 'Daily API key generation quota (max 3 keys/day) has been exceeded.' });
    }
    const generated = generateApiKey();
    const key = await ApiKey.create({
      userId,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      name: input.updates.name,
      label: input.updates.label || '',
      environment: input.updates.environment || 'dev',
      expiresAt: input.updates.expiresAt || null,
      rateLimit: { limit: input.updates['rateLimit.limit'] || 100, windowMs: input.updates['rateLimit.windowMs'] || 60000 },
      ipWhitelist: input.updates.ipWhitelist || [],
      ipBlacklist: input.updates.ipBlacklist || []
    });
    return res.status(201).json({ success: true, message: 'Copy this API key now; it will not be shown again.', rawKey: generated.rawKey, key: publicApiKey(key) });
  } catch (err) {
    if (quotaIncremented && redis && redis.status === 'ready') await redis.decr(quotaKey).catch(() => {});
    console.error('Error creating API key:', err);
    return res.status(500).json({ error: 'Failed to generate API key.' });
  }
});

router.patch('/:id', async (req, res) => {
  const input = validateKeyInput(req.body, { partial: true });
  if (input.error) return res.status(400).json({ error: input.error });
  if (!Object.keys(input.updates).length) return res.status(400).json({ error: 'No supported key fields provided.' });
  try {
    const key = await ApiKey.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, { $set: input.updates }, { new: true, runValidators: true });
    if (!key) return res.status(404).json({ error: 'API key not found or unauthorized.' });
    await invalidateApiKeyCache(key.keyHash).catch(err => console.error('Failed to clear API key cache:', err));
    return res.json({ success: true, key: publicApiKey(key) });
  } catch (err) { return res.status(500).json({ error: 'Failed to update API key.' }); }
});

router.post('/:id/rotate', async (req, res) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!key) return res.status(404).json({ error: 'API key not found or unauthorized.' });
    const oldHash = key.keyHash;
    const generated = generateApiKey();
    key.keyHash = generated.keyHash; key.keyPrefix = generated.keyPrefix; key.isActive = true;
    await key.save();
    await invalidateApiKeyCache(oldHash).catch(err => console.error('Failed to clear old API key cache:', err));
    return res.json({ success: true, message: 'Copy the rotated API key now; it will not be shown again.', rawKey: generated.rawKey, key: publicApiKey(key) });
  } catch (err) { console.error('Error rotating API key:', err); return res.status(500).json({ error: 'Failed to rotate API key.' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!key) return res.status(404).json({ error: 'API key not found or unauthorized.' });
    await invalidateApiKeyCache(key.keyHash).catch(err => console.error('Failed to clear API key cache:', err));
    return res.json({ success: true, message: 'API key revoked and deleted successfully.' });
  } catch (err) { return res.status(500).json({ error: 'Failed to revoke API key.' }); }
});

module.exports = router;
