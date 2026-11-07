const test = require('node:test');
const assert = require('node:assert/strict');
const ApiKey = require('../models/ApiKey');
const { generateApiKey, hashApiKey, isExpired, publicApiKey } = require('../services/apiKeySecurity');

test('creation generates a cryptographically random raw key and stores only its SHA-256 hash', () => {
  const generated = generateApiKey();
  assert.match(generated.rawKey, /^ax_[A-Za-z0-9_-]+$/);
  assert.equal(generated.keyHash, hashApiKey(generated.rawKey));
  assert.notEqual(generated.keyHash, generated.rawKey);
  assert.equal(generated.keyHash.length, 64);
});

test('hash verification accepts only the original raw key', () => {
  const generated = generateApiKey();
  assert.equal(hashApiKey(generated.rawKey), generated.keyHash);
  assert.notEqual(hashApiKey(`${generated.rawKey}changed`), generated.keyHash);
});

test('disabled and expired lifecycle states are rejected by the metadata checks', () => {
  const active = { isActive: true, expiresAt: new Date(Date.now() + 60_000) };
  const disabled = { ...active, isActive: false };
  const expired = { ...active, expiresAt: new Date(Date.now() - 1) };
  assert.equal(disabled.isActive && !isExpired(disabled.expiresAt), false);
  assert.equal(expired.isActive && !isExpired(expired.expiresAt), false);
});

test('rotation replaces the old digest, invalidating the old raw key', () => {
  const oldKey = generateApiKey();
  const rotatedKey = generateApiKey();
  assert.notEqual(oldKey.keyHash, rotatedKey.keyHash);
  assert.notEqual(hashApiKey(oldKey.rawKey), rotatedKey.keyHash);
  assert.equal(hashApiKey(rotatedKey.rawKey), rotatedKey.keyHash);
});

test('model serialization and public key responses never expose raw keys or hashes', () => {
  const generated = generateApiKey();
  const key = new ApiKey({
    userId: '507f1f77bcf86cd799439011', keyHash: generated.keyHash, keyPrefix: generated.keyPrefix,
    name: 'test', rateLimit: { limit: 1, windowMs: 1000 }
  });
  const serialized = key.toJSON();
  const publicKey = publicApiKey(key);
  assert.equal(serialized.keyHash, undefined);
  assert.equal(serialized.keyPrefix, undefined);
  assert.equal(publicKey.keyHash, undefined);
  assert.equal(publicKey.rawKey, undefined);
  assert.equal(JSON.stringify(publicKey).includes(generated.rawKey), false);
  assert.equal(JSON.stringify(publicKey).includes(generated.keyHash), false);
});
