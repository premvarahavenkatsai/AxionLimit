const crypto = require('crypto');

const API_KEY_PREFIX = 'ax_';

function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

function generateApiKey() {
  const rawKey = `${API_KEY_PREFIX}${crypto.randomBytes(32).toString('base64url')}`;
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, 11)
  };
}

function maskedKeyIdentifier(keyPrefix) {
  return `${keyPrefix}…`;
}

function isExpired(expiresAt, now = new Date()) {
  return Boolean(expiresAt && new Date(expiresAt) <= now);
}

function publicApiKey(apiKey) {
  const source = apiKey.toObject ? apiKey.toObject() : apiKey;
  return {
    _id: source._id,
    name: source.name,
    label: source.label,
    environment: source.environment,
    isActive: source.isActive,
    expiresAt: source.expiresAt || null,
    keyIdentifier: maskedKeyIdentifier(source.keyPrefix),
    rateLimit: source.rateLimit,
    ipWhitelist: source.ipWhitelist || [],
    ipBlacklist: source.ipBlacklist || [],
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
}

module.exports = { hashApiKey, generateApiKey, isExpired, publicApiKey };
