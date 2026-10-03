import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDataDirectory = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const legacyDatabasePath = process.env.DATABASE_PATH || path.join(defaultDataDirectory, 'faceapp.sqlite');
const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) throw new Error('DATABASE_URL es requerida para usar PostgreSQL');

const database = new Pool({
  connectionString,
  max: Number.parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  options: '-c timezone=UTC'
});

export const databaseDriver = 'postgresql';
export const adminConfiguration = { configured: false, issue: null };

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

function serializedDate(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    displayName: row.display_name,
    employeeCode: row.employee_code,
    role: row.role,
    comprefaceSubject: row.compreface_subject,
    createdAt: serializedDate(row.created_at)
  };
}

function publicEmployee(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    displayName: row.nombre_completo,
    employeeCode: row.legajo,
    role: 'employee',
    comprefaceSubject: row.compreface_subject,
    createdAt: serializedDate(row.created_at),
    updatedAt: serializedDate(row.updated_at),
    checkInCount: Number(row.check_in_count || 0),
    lastCheckInAt: row.last_check_in_at ? serializedDate(row.last_check_in_at) : null
  };
}

const employeeWithActivitySelect = `
  SELECT empleados.*, COUNT(check_ins.id) AS check_in_count,
    MAX(check_ins.checked_in_at) AS last_check_in_at
  FROM empleados
  LEFT JOIN check_ins ON check_ins.empleado_id = empleados.id
`;

async function createSchema() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      display_name TEXT NOT NULL,
      employee_code TEXT UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
      compreface_subject TEXT UNIQUE,
      compreface_image_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (
        (role = 'admin' AND username IS NOT NULL AND password_hash IS NOT NULL)
        OR (role = 'employee' AND password_hash IS NULL)
      )
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS empleados (
      id BIGSERIAL PRIMARY KEY,
      nombre_completo TEXT NOT NULL,
      legajo TEXT NOT NULL UNIQUE,
      compreface_subject TEXT NOT NULL UNIQUE,
      compreface_image_id TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id BIGSERIAL PRIMARY KEY,
      empleado_id BIGINT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
      similarity DOUBLE PRECISION,
      detection_probability DOUBLE PRECISION,
      idempotency_key TEXT UNIQUE,
      checked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS migration_history (
      migration_key TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      details JSONB
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_check_ins_empleado_id ON check_ins(empleado_id);
    CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_at ON check_ins(checked_in_at);
  `);
}

async function applySchemaMigrations() {
  const migrations = [
    ['schema_v2_idempotency', async (client) => {
      await client.query('ALTER TABLE empleados ADD COLUMN IF NOT EXISTS idempotency_key TEXT');
      await client.query('ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS idempotency_key TEXT');
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_empleados_idempotency_key ON empleados(idempotency_key) WHERE idempotency_key IS NOT NULL');
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_check_ins_idempotency_key ON check_ins(idempotency_key) WHERE idempotency_key IS NOT NULL');
    }],
    ['schema_v3_subject_diagnostics', async (client) => {
      await client.query('CREATE INDEX IF NOT EXISTS idx_empleados_compreface_subject ON empleados(compreface_subject)');
    }]
  ];
  for (const [migrationKey, apply] of migrations) {
    const existing = await database.query('SELECT 1 FROM migration_history WHERE migration_key = $1 LIMIT 1', [migrationKey]);
    if (existing.rowCount) continue;
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      await apply(client);
      await client.query('INSERT INTO migration_history (migration_key, details) VALUES ($1, $2)', [migrationKey, JSON.stringify({ version: migrationKey })]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function sqliteTableExists(legacy, tableName) {
  return Boolean(legacy.prepare(`
    SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1
  `).get(tableName));
}

async function migrateLegacySqlite() {
  if (legacyDatabasePath === ':memory:' || !fs.existsSync(legacyDatabasePath)) return;
  const migrationKey = 'legacy_sqlite_v1';
  const migrated = await database.query(
    'SELECT 1 FROM migration_history WHERE migration_key = $1 LIMIT 1',
    [migrationKey]
  );
  if (migrated.rowCount) return;

  const legacy = new DatabaseSync(legacyDatabasePath, { readOnly: true });
  const client = await database.connect();
  try {
    const employees = sqliteTableExists(legacy, 'empleados')
      ? legacy.prepare('SELECT * FROM empleados ORDER BY id').all()
      : [];
    const checkIns = sqliteTableExists(legacy, 'check_ins')
      ? legacy.prepare('SELECT * FROM check_ins ORDER BY id').all()
      : [];

    await client.query('BEGIN');
    const employeeIdMap = new Map();

    for (const employee of employees) {
      const inserted = await client.query(`
        INSERT INTO empleados (
          id, nombre_completo, legajo, compreface_subject, compreface_image_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        Number(employee.id), employee.nombre_completo, employee.legajo,
        employee.compreface_subject, employee.compreface_image_id,
        employee.created_at, employee.updated_at || employee.created_at
      ]);

      let postgresId = inserted.rows[0]?.id;
      if (!postgresId) {
        const existing = await client.query(
          'SELECT id FROM empleados WHERE legajo = $1 OR compreface_subject = $2 LIMIT 1',
          [employee.legajo, employee.compreface_subject]
        );
        postgresId = existing.rows[0]?.id;
      }
      if (postgresId) employeeIdMap.set(Number(employee.id), Number(postgresId));
    }

    for (const checkIn of checkIns) {
      const employeeId = employeeIdMap.get(Number(checkIn.empleado_id));
      if (!employeeId) continue;
      await client.query(`
        INSERT INTO check_ins (id, empleado_id, similarity, detection_probability, checked_in_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        Number(checkIn.id), employeeId, checkIn.similarity,
        checkIn.detection_probability, checkIn.checked_in_at
      ]);
    }

    for (const table of ['empleados', 'check_ins']) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 1),
          EXISTS(SELECT 1 FROM ${table})
        )
      `);
    }
    await client.query(
      'INSERT INTO migration_history (migration_key, details) VALUES ($1, $2)',
      [migrationKey, JSON.stringify({ employees: employees.length, checkIns: checkIns.length })]
    );
    await client.query('COMMIT');
    console.log(`✅ Migración SQLite → PostgreSQL: ${employees.length} empleados y ${checkIns.length} check-ins.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    legacy.close();
  }
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Administrador';

  if (!username || !password) {
    adminConfiguration.issue = 'missing_credentials';
    console.warn('⚠️ Administración deshabilitada: configura ADMIN_USERNAME y ADMIN_PASSWORD.');
    return;
  }
  if (password.length < 12) {
    adminConfiguration.issue = 'weak_password';
    console.warn('⚠️ Administración deshabilitada: ADMIN_PASSWORD debe tener al menos 12 caracteres.');
    return;
  }

  const existing = await database.query("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const admin = existing.rows[0];
  if (admin) {
    const passwordChanged = !verifyPassword(password, admin.password_hash);
    await database.query(
      'UPDATE users SET username = $1, display_name = $2, password_hash = $3 WHERE id = $4',
      [username, displayName, passwordChanged ? hashPassword(password) : admin.password_hash, admin.id]
    );
    if (passwordChanged) await database.query('DELETE FROM sessions WHERE user_id = $1', [admin.id]);
  } else {
    await database.query(`
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES ($1, $2, $3, 'admin')
    `, [username, hashPassword(password), displayName]);
  }
  adminConfiguration.configured = true;
  adminConfiguration.issue = null;
}

await createSchema();
await applySchemaMigrations();
await migrateLegacySqlite();
await seedAdmin();
console.log('✅ Base de datos inicializada con PostgreSQL.');

export async function findAdminByUsername(username) {
  const result = await database.query(`
    SELECT * FROM users WHERE role = 'admin' AND LOWER(username) = LOWER($1) LIMIT 1
  `, [username]);
  return result.rows[0] || null;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId) {
  const now = Date.now();
  const token = randomBytes(32).toString('base64url');
  const expiresAtMs = now + 8 * 60 * 60 * 1000;
  await database.query('DELETE FROM sessions WHERE expires_at <= $1', [now]);
  await database.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, expiresAtMs]
  );
  return { token, expiresAt: new Date(expiresAtMs).toISOString() };
}

export async function getUserBySession(token) {
  if (!token) return null;
  const result = await database.query(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = $1 AND sessions.expires_at > $2 LIMIT 1
  `, [hashToken(token), Date.now()]);
  return publicUser(result.rows[0]);
}

export async function refreshSession(token) {
  const user = await getUserBySession(token);
  if (!user) return null;
  const expiresAtMs = Date.now() + 8 * 60 * 60 * 1000;
  await database.query('UPDATE sessions SET expires_at = $1 WHERE token_hash = $2', [expiresAtMs, hashToken(token)]);
  return { ...user, expiresAt: new Date(expiresAtMs).toISOString() };
}

export async function deleteSession(token) {
  if (token) await database.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

export async function createEmployee({ displayName, employeeCode, comprefaceSubject, comprefaceImageId }) {
  return createEmployeeWithIdempotency({ displayName, employeeCode, comprefaceSubject, comprefaceImageId });
}

export async function createEmployeeWithIdempotency({ displayName, employeeCode, comprefaceSubject, comprefaceImageId, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await database.query('SELECT id FROM empleados WHERE idempotency_key = $1 LIMIT 1', [idempotencyKey]);
    if (existing.rowCount) return getEmployeeById(existing.rows[0].id);
  }
  const result = await database.query(`
    INSERT INTO empleados (nombre_completo, legajo, compreface_subject, compreface_image_id, idempotency_key)
    VALUES ($1, $2, $3, $4, $5) RETURNING id
  `, [displayName, employeeCode, comprefaceSubject, comprefaceImageId, idempotencyKey || null]);
  return getEmployeeById(result.rows[0].id);
}

export async function listEmployees() {
  const result = await database.query(`
    ${employeeWithActivitySelect}
    GROUP BY empleados.id ORDER BY LOWER(empleados.nombre_completo)
  `);
  return result.rows.map(publicEmployee);
}

export async function getEmployeeBySubject(subject) {
  const result = await database.query(`
    ${employeeWithActivitySelect}
    WHERE empleados.compreface_subject = $1
    GROUP BY empleados.id LIMIT 1
  `, [subject]);
  return publicEmployee(result.rows[0]);
}

export async function reassignEmployeeSubject({ employeeId, comprefaceSubject, comprefaceImageId = null }) {
  const result = await database.query(`
    UPDATE empleados
    SET compreface_subject = $1, compreface_image_id = COALESCE($2, compreface_image_id), updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 RETURNING id
  `, [comprefaceSubject, comprefaceImageId, employeeId]);
  return result.rowCount ? getEmployeeById(employeeId) : null;
}

export async function getFaceDiagnostics() {
  const result = await database.query(`
    SELECT empleados.*, COUNT(check_ins.id) AS check_in_count,
      MAX(check_ins.checked_in_at) AS last_check_in_at
    FROM empleados LEFT JOIN check_ins ON check_ins.empleado_id = empleados.id
    GROUP BY empleados.id ORDER BY LOWER(empleados.nombre_completo)
  `);
  return result.rows.map((row) => ({
    employee: publicEmployee(row),
    imageId: row.compreface_image_id,
    subject: row.compreface_subject,
    synchronization: row.compreface_subject && row.compreface_image_id ? 'linked' : 'incomplete'
  }));
}

export async function getEmployeeById(id) {
  const result = await database.query(`
    ${employeeWithActivitySelect}
    WHERE empleados.id = $1
    GROUP BY empleados.id LIMIT 1
  `, [id]);
  return publicEmployee(result.rows[0]);
}

export async function updateEmployee({ id, displayName, employeeCode }) {
  const result = await database.query(`
    UPDATE empleados SET nombre_completo = $1, legajo = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3 RETURNING id
  `, [displayName, employeeCode, id]);
  return result.rowCount ? getEmployeeById(id) : null;
}

export async function createCheckIn({ employeeId, similarity, detectionProbability, idempotencyKey }) {
  if (idempotencyKey) {
    const existing = await database.query('SELECT id, empleado_id, similarity, detection_probability, checked_in_at FROM check_ins WHERE idempotency_key = $1 LIMIT 1', [idempotencyKey]);
    if (existing.rowCount) {
      const row = existing.rows[0];
      return { id: Number(row.id), employeeId: Number(row.empleado_id), similarity: row.similarity, detectionProbability: row.detection_probability, checkedInAt: serializedDate(row.checked_in_at) };
    }
  }
  const result = await database.query(`
    INSERT INTO check_ins (empleado_id, similarity, detection_probability, idempotency_key)
    VALUES ($1, $2, $3, $4)
    RETURNING id, empleado_id, similarity, detection_probability, checked_in_at
  `, [employeeId, similarity ?? null, detectionProbability ?? null, idempotencyKey || null]);
  const row = result.rows[0];
  return {
    id: Number(row.id),
    employeeId: Number(row.empleado_id),
    similarity: row.similarity,
    detectionProbability: row.detection_probability,
    checkedInAt: serializedDate(row.checked_in_at)
  };
}

export async function getDashboardStats() {
  const [totalsResult, dailyResult, activityResult, recentResult] = await Promise.all([
    database.query(`
      SELECT
        (SELECT COUNT(*) FROM empleados) AS employees,
        (SELECT COUNT(*) FROM check_ins) AS check_ins,
        (SELECT COUNT(*) FROM check_ins WHERE (checked_in_at AT TIME ZONE 'UTC')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date) AS today_check_ins,
        (SELECT COUNT(DISTINCT empleado_id) FROM check_ins WHERE (checked_in_at AT TIME ZONE 'UTC')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date) AS today_employees
    `),
    database.query(`
      SELECT (checked_in_at AT TIME ZONE 'UTC')::date::text AS day, COUNT(*) AS count
      FROM check_ins
      WHERE (checked_in_at AT TIME ZONE 'UTC')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 6
      GROUP BY day ORDER BY day
    `),
    database.query(`
      SELECT empleados.id, empleados.nombre_completo AS display_name,
        empleados.legajo AS employee_code, COUNT(check_ins.id) AS count,
        MAX(check_ins.checked_in_at) AS last_check_in_at
      FROM empleados LEFT JOIN check_ins ON check_ins.empleado_id = empleados.id
      GROUP BY empleados.id ORDER BY count DESC, LOWER(empleados.nombre_completo)
    `),
    database.query(`
      SELECT check_ins.id, check_ins.checked_in_at, check_ins.similarity,
        empleados.id AS employee_id, empleados.nombre_completo AS display_name,
        empleados.legajo AS employee_code
      FROM check_ins JOIN empleados ON empleados.id = check_ins.empleado_id
      ORDER BY check_ins.checked_in_at DESC, check_ins.id DESC LIMIT 10
    `)
  ]);

  const totals = totalsResult.rows[0];
  const dailyByDate = new Map(dailyResult.rows.map((row) => [row.day, Number(row.count)]));
  const dailyCheckIns = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const day = date.toISOString().slice(0, 10);
    return { day, count: dailyByDate.get(day) || 0 };
  });

  return {
    totals: {
      employees: Number(totals.employees),
      checkIns: Number(totals.check_ins),
      todayCheckIns: Number(totals.today_check_ins),
      todayEmployees: Number(totals.today_employees)
    },
    dailyCheckIns,
    employeeActivity: activityResult.rows.map((row) => ({
      employeeId: Number(row.id), displayName: row.display_name,
      employeeCode: row.employee_code, count: Number(row.count),
      lastCheckInAt: row.last_check_in_at ? serializedDate(row.last_check_in_at) : null
    })),
    recentCheckIns: recentResult.rows.map((row) => ({
      id: Number(row.id), checkedInAt: serializedDate(row.checked_in_at),
      similarity: row.similarity, employeeId: Number(row.employee_id),
      displayName: row.display_name, employeeCode: row.employee_code
    }))
  };
}

export async function checkDatabaseConnection() {
  await database.query('SELECT 1');
  return databaseDriver;
}

export async function closeDatabase() {
  await database.end();
}
