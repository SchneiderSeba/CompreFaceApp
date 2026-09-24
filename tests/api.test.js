import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

let server;
let baseUrl;
let adminCookie;
let closeDatabase;

before(async () => {
  process.env.DATABASE_PATH = ':memory:';
  process.env.ADMIN_USERNAME = 'admin-test';
  process.env.ADMIN_PASSWORD = 'a-strong-test-password';
  process.env.ADMIN_DISPLAY_NAME = 'Admin Test';
  process.env.COMPRE_FACE_API_KEY = 'test-key';
  process.env.COMPREFACE_API_KEY_ENV = 'COMPRE_FACE_API_KEY';

  const databaseModule = await import('../database.js');
  closeDatabase = databaseModule.closeDatabase;
  databaseModule.createEmployee({
    displayName: 'Empleado Test',
    employeeCode: 'EMP-TEST',
    comprefaceSubject: 'employee_EMP-TEST',
    comprefaceImageId: 'test-image'
  });

  const { app } = await import('../index.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin-test', password: 'a-strong-test-password' })
  });
  assert.equal(loginResponse.status, 200);
  adminCookie = loginResponse.headers.get('set-cookie').split(';')[0];
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  closeDatabase();
});

test('rejects invalid admin credentials', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin-test', password: 'incorrect-password' })
  });
  assert.equal(response.status, 401);
});

test('employees cannot log in', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'EMP-TEST', password: 'anything-at-all' })
  });
  assert.equal(response.status, 401);
});

test('protects employee administration from anonymous requests', async () => {
  const response = await fetch(`${baseUrl}/api/employees`);
  assert.equal(response.status, 401);
});

test('allows an admin to list employees', async () => {
  const response = await fetch(`${baseUrl}/api/employees`, {
    headers: { cookie: adminCookie }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.employees.length, 1);
  assert.equal(body.employees[0].employeeCode, 'EMP-TEST');
  assert.equal(body.employees[0].username, null);
});

test('capture rejects anonymous requests', async () => {
  const response = await fetch(`${baseUrl}/capture`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test' })
  });
  assert.equal(response.status, 401);
});

test('capture validates required fields for admins', async () => {
  const response = await fetch(`${baseUrl}/capture`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ name: 'Test' })
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'No image provided' });
});

test('recognize remains available without login', async () => {
  const response = await fetch(`${baseUrl}/recognize`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'No image provided' });
});
