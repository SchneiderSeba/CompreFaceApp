import assert from 'node:assert/strict';
import { test } from 'node:test';

const enabled = process.env.RUN_INTEGRATION_TESTS === 'true';
const backendUrl = (process.env.INTEGRATION_BACKEND_URL || 'https://comprefaceapp-production-a8a0.up.railway.app').replace(/\/$/, '');

test('production integration: backend, PostgreSQL and CompreFace are healthy', { skip: !enabled }, async () => {
  const response = await fetch(`${backendUrl}/api/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.services.backend, 'ok');
  assert.equal(body.services.database, 'postgresql');
  assert.equal(body.services.compreface, 'ok');
});

test('production integration: liveness endpoint responds without authentication', { skip: !enabled }, async () => {
  const response = await fetch(`${backendUrl}/api/health/live`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});
