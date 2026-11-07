const test = require('node:test');
const assert = require('node:assert/strict');
const rateLimiter = require('../services/rateLimiter');

test('rateLimiter.isAllowed handles optional userId parameter without errors when Redis is mock/offline', async () => {
  // Offline or uninitialized redis client should safely fail open
  const resultGlobal = await rateLimiter.isAllowed('mock_api_key_hash', 10, 60000);
  assert.equal(resultGlobal.allowed, true);
  assert.equal(typeof resultGlobal.remaining, 'number');

  const resultUser = await rateLimiter.isAllowed('mock_api_key_hash', 10, 60000, 'user_123');
  assert.equal(resultUser.allowed, true);
  assert.equal(typeof resultUser.remaining, 'number');
});
