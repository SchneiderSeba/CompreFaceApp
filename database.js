import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDirectory = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const configuredPath = process.env.DATABASE_PATH || path.join(defaultDataDirectory, 'faceapp.sqlite');

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

  CREATE TABLE IF NOT EXISTS empleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo TEXT NOT NULL,
    legajo TEXT NOT NULL UNIQUE,
    compreface_subject TEXT NOT NULL UNIQUE,
    compreface_image_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    similarity REAL,
    detection_probability REAL,
    checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_check_ins_empleado_id ON check_ins(empleado_id);
  CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_at ON check_ins(checked_in_at);
`);

// Move employees created by older versions into their dedicated table.
database.exec(`
  INSERT OR IGNORE INTO empleados (
    nombre_completo, legajo, compreface_subject, compreface_image_id, created_at
  )
  SELECT display_name, employee_code, compreface_subject, compreface_image_id, created_at
  FROM users
  WHERE role = 'employee'
    AND employee_code IS NOT NULL
    AND compreface_subject IS NOT NULL;
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

function publicEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.nombre_completo,
    employeeCode: row.legajo,
    role: 'employee',
    comprefaceSubject: row.compreface_subject,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    checkInCount: Number(row.check_in_count || 0),
    lastCheckInAt: row.last_check_in_at || null
  };
}

const employeeWithActivitySelect = `
  SELECT
    empleados.*,
    COUNT(check_ins.id) AS check_in_count,
    MAX(check_ins.checked_in_at) AS last_check_in_at
  FROM empleados
  LEFT JOIN check_ins ON check_ins.empleado_id = empleados.id
`;

export const adminConfiguration = {
  configured: false,
  issue: null
};

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Administrador';

  if (!username || !password) {
    adminConfiguration.issue = 'missing_credentials';
    console.warn('⚠️ Administración deshabilitada: configura ADMIN_USERNAME y ADMIN_PASSWORD en el entorno.');
    return;
  }

  if (password.length < 12) {
    adminConfiguration.issue = 'weak_password';
    console.warn('⚠️ Administración deshabilitada: ADMIN_PASSWORD debe tener al menos 12 caracteres.');
    return;
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
    adminConfiguration.configured = true;
    adminConfiguration.issue = null;
    return;
  }

  database.prepare(`
    INSERT INTO users (username, password_hash, display_name, role)
    VALUES (?, ?, ?, 'admin')
  `).run(username, hashPassword(password), displayName);
  adminConfiguration.configured = true;
  adminConfiguration.issue = null;
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
    INSERT INTO empleados (
      nombre_completo, legajo, compreface_subject, compreface_image_id
    ) VALUES (?, ?, ?, ?)
  `).run(displayName, employeeCode, comprefaceSubject, comprefaceImageId);
  return getEmployeeById(result.lastInsertRowid);
}

export function listEmployees() {
  return database.prepare(`
    ${employeeWithActivitySelect}
    GROUP BY empleados.id
    ORDER BY empleados.nombre_completo COLLATE NOCASE
  `).all().map(publicEmployee);
}

export function getEmployeeBySubject(subject) {
  return publicEmployee(database.prepare(`
    ${employeeWithActivitySelect}
    WHERE empleados.compreface_subject = ?
    GROUP BY empleados.id
    LIMIT 1
  `).get(subject));
}

export function getEmployeeById(id) {
  return publicEmployee(database.prepare(`
    ${employeeWithActivitySelect}
    WHERE empleados.id = ?
    GROUP BY empleados.id
    LIMIT 1
  `).get(id));
}

export function updateEmployee({ id, displayName, employeeCode }) {
  const result = database.prepare(`
    UPDATE empleados
    SET nombre_completo = ?, legajo = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(displayName, employeeCode, id);
  return result.changes ? getEmployeeById(id) : null;
}

export function createCheckIn({ employeeId, similarity, detectionProbability }) {
  const result = database.prepare(`
    INSERT INTO check_ins (empleado_id, similarity, detection_probability)
    VALUES (?, ?, ?)
  `).run(employeeId, similarity ?? null, detectionProbability ?? null);

  const row = database.prepare(`
    SELECT id, empleado_id, similarity, detection_probability, checked_in_at
    FROM check_ins WHERE id = ?
  `).get(result.lastInsertRowid);

  return {
    id: row.id,
    employeeId: row.empleado_id,
    similarity: row.similarity,
    detectionProbability: row.detection_probability,
    checkedInAt: row.checked_in_at
  };
}

export function getDashboardStats() {
  const totals = database.prepare(`
    SELECT
      (SELECT COUNT(*) FROM empleados) AS employees,
      (SELECT COUNT(*) FROM check_ins) AS check_ins,
      (SELECT COUNT(*) FROM check_ins WHERE date(checked_in_at) = date('now')) AS today_check_ins,
      (SELECT COUNT(DISTINCT empleado_id) FROM check_ins WHERE date(checked_in_at) = date('now')) AS today_employees
  `).get();

  const dailyRows = database.prepare(`
    SELECT date(checked_in_at) AS day, COUNT(*) AS count
    FROM check_ins
    WHERE date(checked_in_at) >= date('now', '-6 days')
    GROUP BY date(checked_in_at)
    ORDER BY day
  `).all();
  const dailyByDate = new Map(dailyRows.map((row) => [row.day, Number(row.count)]));
  const dailyCheckIns = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const day = date.toISOString().slice(0, 10);
    return { day, count: dailyByDate.get(day) || 0 };
  });

  const employeeActivity = database.prepare(`
    SELECT
      empleados.id,
      empleados.nombre_completo AS display_name,
      empleados.legajo AS employee_code,
      COUNT(check_ins.id) AS count,
      MAX(check_ins.checked_in_at) AS last_check_in_at
    FROM empleados
    LEFT JOIN check_ins ON check_ins.empleado_id = empleados.id
    GROUP BY empleados.id
    ORDER BY count DESC, empleados.nombre_completo COLLATE NOCASE
  `).all().map((row) => ({
    employeeId: row.id,
    displayName: row.display_name,
    employeeCode: row.employee_code,
    count: Number(row.count),
    lastCheckInAt: row.last_check_in_at || null
  }));

  const recentCheckIns = database.prepare(`
    SELECT
      check_ins.id,
      check_ins.checked_in_at,
      check_ins.similarity,
      empleados.id AS employee_id,
      empleados.nombre_completo AS display_name,
      empleados.legajo AS employee_code
    FROM check_ins
    JOIN empleados ON empleados.id = check_ins.empleado_id
    ORDER BY check_ins.checked_in_at DESC, check_ins.id DESC
    LIMIT 10
  `).all().map((row) => ({
    id: row.id,
    checkedInAt: row.checked_in_at,
    similarity: row.similarity,
    employeeId: row.employee_id,
    displayName: row.display_name,
    employeeCode: row.employee_code
  }));

  return {
    totals: {
      employees: Number(totals.employees),
      checkIns: Number(totals.check_ins),
      todayCheckIns: Number(totals.today_check_ins),
      todayEmployees: Number(totals.today_employees)
    },
    dailyCheckIns,
    employeeActivity,
    recentCheckIns
  };
}

export function closeDatabase() {
  database.close();
}
