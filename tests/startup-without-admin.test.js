import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

let server;
let baseUrl;
let closeDatabase;

before(async () => {
  process.env.DATABASE_PATH = ':memory:';
  process.env.ADMIN_USERNAME = '';
  process.env.ADMIN_PASSWORD = '';
  process.env.COMPRE_FACE_API_KEY = '';
  process.env.COMPREFACE_API_KEY_ENV = 'COMPRE_FACE_API_KEY';

  const databaseModule = await import('../database.js');
  closeDatabase = databaseModule.closeDatabase;

  const { app } = await import('../index.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  closeDatabase();
});

test('backend remains live without optional production credentials', async () => {
  const response = await fetch(`${baseUrl}/api/health/live`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).service, 'backend');
});

test('admin login is safely disabled when credentials are missing', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'anything' })
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /no está configurado/i);
});

test('recognition reports missing configuration without crashing the process', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.services.backend, 'ok');
  assert.equal(body.services.compreface, 'not_configured');
});
