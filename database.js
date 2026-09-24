import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configuredPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'faceapp.sqlite');

if (configuredPath !== ':memory:') {
  fs.mkdirSync(path.dirname(path.resolve(configuredPath)), { recursive: true });
}

const database = new DatabaseSync(configuredPath);
database.exec('PRAGMA foreign_keys = ON');
if (configuredPath !== ':memory:') {
  database.exec('PRAGMA journal_mode = WAL');
}

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    employee_code TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
    compreface_subject TEXT UNIQUE,
    compreface_image_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
      (role = 'admin' AND username IS NOT NULL AND password_hash IS NOT NULL)
      OR
      (role = 'employee' AND password_hash IS NULL)
    )
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`);

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false;
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    employeeCode: row.employee_code,
    role: row.role,
    comprefaceSubject: row.compreface_subject,
    createdAt: row.created_at
  };
}

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Administrador';

  if (!username || !password || password.length < 12) {
    throw new Error('Configura ADMIN_USERNAME y ADMIN_PASSWORD (mínimo 12 caracteres) para crear el administrador inicial');
  }

  const existingAdmin = database.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();
  if (existingAdmin) {
    const passwordChanged = !verifyPassword(password, existingAdmin.password_hash);
    database.prepare(`
      UPDATE users SET username = ?, display_name = ?, password_hash = ? WHERE id = ?
    `).run(
      username,
      displayName,
      passwordChanged ? hashPassword(password) : existingAdmin.password_hash,
      existingAdmin.id
    );
    if (passwordChanged) database.prepare('DELETE FROM sessions WHERE user_id = ?').run(existingAdmin.id);
    return;
  }

  database.prepare(`
    INSERT INTO users (username, password_hash, display_name, role)
    VALUES (?, ?, ?, 'admin')
  `).run(username, hashPassword(password), displayName);
}

seedAdmin();

export function findAdminByUsername(username) {
  return database.prepare(`
    SELECT * FROM users
    WHERE role = 'admin' AND username = ? COLLATE NOCASE
    LIMIT 1
  `).get(username);
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(userId) {
  const now = Date.now();
  database.prepare('DELETE FROM sessions WHERE CAST(expires_at AS INTEGER) <= ?').run(now);
  const token = randomBytes(32).toString('base64url');
  const expiresAtMs = now + 8 * 60 * 60 * 1000;
  database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, expiresAtMs);
  return { token, expiresAt: new Date(expiresAtMs).toISOString() };
}

export function getUserBySession(token) {
  if (!token) return null;
  const row = database.prepare(`
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND CAST(sessions.expires_at AS INTEGER) > ?
    LIMIT 1
  `).get(hashToken(token), Date.now());
  return publicUser(row);
}

export function deleteSession(token) {
  if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function createEmployee({ displayName, employeeCode, comprefaceSubject, comprefaceImageId }) {
  const result = database.prepare(`
    INSERT INTO users (
      display_name, employee_code, role, compreface_subject, compreface_image_id
    ) VALUES (?, ?, 'employee', ?, ?)
  `).run(displayName, employeeCode, comprefaceSubject, comprefaceImageId);
  return publicUser(database.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid));
}

export function listEmployees() {
  return database.prepare(`
    SELECT * FROM users WHERE role = 'employee' ORDER BY display_name COLLATE NOCASE
  `).all().map(publicUser);
}

export function getEmployeeBySubject(subject) {
  return publicUser(database.prepare(`
    SELECT * FROM users WHERE role = 'employee' AND compreface_subject = ? LIMIT 1
  `).get(subject));
}

export function closeDatabase() {
  database.close();
}
