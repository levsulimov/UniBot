import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../src/config.js';

test('uses the current MAX API domain by default', () => {
  const config = getConfig({});
  assert.equal(config.maxApiBaseUrl, 'https://platform-api2.max.ru');
});

test('allows an explicit MAX API URL for test proxies', () => {
  const config = getConfig({ MAX_API_BASE_URL: 'http://localhost:8080' });
  assert.equal(config.maxApiBaseUrl, 'http://localhost:8080');
});
