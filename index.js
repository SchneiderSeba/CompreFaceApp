import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  addCapturedFace,
  checkRecognitionService,
  deleteCapturedFace,
  recognitionConfiguration,
  recognizFace
} from './faceRecognice.js';
import { cleanTempFolder } from './cleanTempImg.js';
import {
  adminConfiguration,
  checkDatabaseConnection,
  createCheckIn,
  createEmployee,
  createEmployeeWithIdempotency,
  createSession,
  deleteSession,
  findAdminByUsername,
  getDashboardStats,
  getDashboardReport,
  getEmployeeById,
  getEmployeeBySubject,
  getFaceDiagnostics,
  reassignEmployeeSubject,
  refreshSession,
  getUserBySession,
  listEmployees,
  listEmployeesPage,
  listCheckIns,
  listAuditLog,
  setEmployeeActive,
  updateEmployeeFace,
  updateEmployee,
  verifyPassword,
  databaseDriver
} from './database-provider.js';
import { getSessionToken, requireAdmin, SESSION_COOKIE } from './auth.js';
import { AppError, ERROR_CODES, sendError } from './src/http-errors.js';
import { parseEmployeeInput, parsePositiveId, parseSubjectInput } from './src/validators.js';
import XLSX from 'xlsx';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, 'FrontEnd', 'faceApp', 'dist');
const shouldServeClient = process.env.SERVE_CLIENT === 'true' || fs.existsSync(clientDistPath);
const allowedOrigins = (process.env.CLIENT_ORIGIN || [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://comprefacefront-production.up.railway.app',
  'https://facerecognize.schneidersebastian.com'
].join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const scriptSources = ["'self'"];
if (!isProduction) {
  scriptSources.push("'unsafe-eval'");
}

const connectSources = [
  "'self'",
  process.env.COMPREFACE_PUBLIC_URL || 'https://comprefaceapp-production-a8a0.up.railway.app'
];

const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": scriptSources,
  "connect-src": connectSources,
  "img-src": ["'self'", 'data:', 'blob:']
};

if (isProduction) app.set('trust proxy', 1);

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '60mb' })); // Aumentar límite para imágenes base64
app.use(express.urlencoded({ extended: true, limit: '60mb' }));
// Si usas Helmet, configúralo específicamente para permitir unsafe-eval
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: cspDirectives
    }
  })
);

const loginAttempts = new Map();

function setSessionCookie(res, token, maxAgeSeconds = 8 * 60 * 60) {
  const crossSite = isProduction ? '; SameSite=None; Secure' : '; SameSite=Lax';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}${crossSite}`
  );
}

app.post('/api/auth/login', async (req, res) => {
  if (!adminConfiguration.configured) {
    return res.status(503).json({
      error: 'El acceso administrativo todavía no está configurado en el servidor'
    });
  }

  const key = req.ip || 'unknown';
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.blockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' });
  }

  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const admin = username ? await findAdminByUsername(username) : null;

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    const failures = (attempt?.failures || 0) + 1;
    loginAttempts.set(key, {
      failures,
      blockedUntil: failures >= 5 ? Date.now() + 15 * 60 * 1000 : 0
    });
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  loginAttempts.delete(key);
  const session = await createSession(admin.id);
  setSessionCookie(res, session.token);
  res.json({
    user: {
      id: admin.id,
      username: admin.username,
      displayName: admin.display_name,
      role: admin.role
    }
  });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await getUserBySession(getSessionToken(req));
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  res.json({ user });
});

app.post('/api/auth/logout', async (req, res) => {
  await deleteSession(getSessionToken(req));
  setSessionCookie(res, '', 0);
  res.status(204).end();
});

app.post('/api/auth/refresh', async (req, res) => {
  const user = await refreshSession(getSessionToken(req));
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  setSessionCookie(res, getSessionToken(req));
  res.json({ user });
});

app.get('/api/employees', requireAdmin, async (req, res) => {
  const { search = '', active, sort = 'name', page, pageSize } = req.query;
  if (search || active !== undefined || page || pageSize || sort !== 'name') {
    return res.json(await listEmployeesPage({ search, active: active === undefined ? undefined : active === 'true', sort, page, pageSize }));
  }
  res.json({ employees: await listEmployees() });
});

app.get('/api/admin/audit-log', requireAdmin, async (req, res) => {
  res.json({ audit: await listAuditLog({ entityId: req.query.employeeId ? Number.parseInt(req.query.employeeId, 10) : undefined }) });
});

app.post('/api/admin/employees/import', requireAdmin, async (req, res) => {
  try {
    if (typeof req.body.dataBase64 !== 'string' || !req.body.dataBase64) return res.status(400).json({ error: 'Archivo requerido' });
    const workbook = XLSX.read(Buffer.from(req.body.dataBase64, 'base64'), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const imported = [];
    const errors = [];
    for (const [index, row] of rows.entries()) {
      try {
        const { displayName, employeeCode } = parseEmployeeInput({ name: row.nombre || row.name || row.displayName, employeeCode: row.legajo || row.employeeCode || row.code });
        const employee = await createEmployeeWithIdempotency({ displayName, employeeCode, comprefaceSubject: `pending_${employeeCode}`, comprefaceImageId: null, idempotencyKey: `import:${employeeCode}`, actorUserId: req.user.id });
        imported.push(employee);
      } catch (error) {
        errors.push({ row: index + 2, error: error.message });
      }
    }
    res.status(201).json({ imported: imported.length, errors, employees: imported });
  } catch (error) {
    res.status(400).json({ error: `No se pudo leer el archivo: ${error.message}` });
  }
});

app.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
  res.json(await getDashboardStats());
});

function reportFilters(query = {}) {
  const employeeId = Number.parseInt(query.employeeId, 10);
  return {
    from: typeof query.from === 'string' ? query.from : undefined,
    to: typeof query.to === 'string' ? query.to : undefined,
    employeeId: Number.isInteger(employeeId) && employeeId > 0 ? employeeId : undefined,
    page: query.page,
    pageSize: query.pageSize,
    period: ['day', 'week', 'month', 'range'].includes(query.period) ? query.period : 'week'
  };
}

app.get('/api/admin/reports', requireAdmin, async (req, res) => {
  res.json(await getDashboardReport(reportFilters(req.query)));
});

app.get('/api/admin/check-ins', requireAdmin, async (req, res) => {
  res.json(await listCheckIns(reportFilters(req.query)));
});

app.get('/api/admin/reports/daily.csv', requireAdmin, async (req, res) => {
  const report = await listCheckIns({ ...reportFilters(req.query), page: 1, pageSize: 100 });
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    ['id', 'empleado', 'legajo', 'fecha', 'similitud', 'deteccion'],
    ...report.items.map((item) => [item.id, item.displayName, item.employeeCode, item.checkedInAt, item.similarity, item.detectionProbability])
  ];
  res.type('text/csv').set('Content-Disposition', 'attachment; filename="check-ins.csv"').send(rows.map((row) => row.map(escape).join(',')).join('\n'));
});

app.patch('/api/employees/:id', requireAdmin, async (req, res) => {
  try {
    const id = parsePositiveId(req.params.id, 'El empleado');
    const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim() : '';
    const employeeCode = typeof req.body.employeeCode === 'string'
      ? req.body.employeeCode.trim().toUpperCase()
      : '';

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El empleado no es válido' });
    }
    if (!displayName || displayName.length > 120) {
      return res.status(400).json({ error: 'El nombre debe tener entre 1 y 120 caracteres' });
    }
    if (!/^[A-Z0-9_-]{2,32}$/.test(employeeCode)) {
      return res.status(400).json({ error: 'El legajo debe tener entre 2 y 32 letras, números, guiones o guiones bajos' });
    }

    const employee = await updateEmployee({ id, displayName, employeeCode, actorUserId: req.user.id });
    if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ employee });
  } catch (error) {
    const duplicate = error.code === '23505' || error.message?.includes('UNIQUE constraint failed');
    console.error('Error updating employee:', error.message);
    res.status(duplicate ? 409 : 500).json({
      error: duplicate ? 'Ya existe un empleado con ese legajo' : 'No se pudo actualizar el empleado'
    });
  }
});

app.patch('/api/employees/:id/status', requireAdmin, async (req, res) => {
  const id = parsePositiveId(req.params.id, 'El empleado');
  if (typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'active debe ser booleano' });
  const employee = await setEmployeeActive({ id, active: req.body.active, actorUserId: req.user.id });
  if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });
  res.json({ employee });
});

app.post('/api/employees/:id/face', requireAdmin, async (req, res) => {
  const id = parsePositiveId(req.params.id, 'El empleado');
  const employee = await getEmployeeById(id);
  if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });
  if (typeof req.body.image !== 'string' || !req.body.image) return res.status(400).json({ error: 'No image provided' });
  let faceResult;
  try {
    faceResult = await addCapturedFace(req.body.image, employee.comprefaceSubject);
    const updated = await updateEmployeeFace({ id, comprefaceSubject: employee.comprefaceSubject, comprefaceImageId: faceResult.image_id, actorUserId: req.user.id });
    if (employee.comprefaceImageId && employee.comprefaceImageId !== faceResult.image_id) await deleteCapturedFace(employee.comprefaceImageId);
    res.json({ employee: updated });
  } catch (error) {
    if (faceResult?.image_id) await deleteCapturedFace(faceResult.image_id).catch(() => {});
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.delete('/api/employees/:id/face', requireAdmin, async (req, res) => {
  const id = parsePositiveId(req.params.id, 'El empleado');
  const employee = await getEmployeeById(id);
  if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });
  if (employee.comprefaceImageId) await deleteCapturedFace(employee.comprefaceImageId);
  const updated = await updateEmployeeFace({ id, comprefaceSubject: employee.comprefaceSubject, comprefaceImageId: null, actorUserId: req.user.id });
  res.json({ employee: updated });
});

app.get('/api/admin/face-diagnostics', requireAdmin, async (_req, res) => {
  res.json({ diagnostics: await getFaceDiagnostics() });
});

app.patch('/api/admin/face-diagnostics/:id', requireAdmin, async (req, res) => {
  const employeeId = parsePositiveId(req.params.id, 'El empleado');
  const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
  const imageId = typeof req.body.imageId === 'string' ? req.body.imageId.trim() : null;
  try { parseSubjectInput(subject); } catch (error) { return sendError(res, error); }
  if (!Number.isInteger(employeeId) || employeeId <= 0 || !/^[^\s]{1,120}$/.test(subject)) {
    return res.status(400).json({ error: 'El sujeto de CompreFace no es válido' });
  }
  try {
    const employee = await reassignEmployeeSubject({ employeeId, comprefaceSubject: subject, comprefaceImageId: imageId });
    if (!employee) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ employee });
  } catch (error) {
    const duplicate = error.code === '23505' || error.message?.includes('UNIQUE constraint failed');
    res.status(duplicate ? 409 : 500).json({ error: duplicate ? 'Ese sujeto ya está vinculado a otro empleado' : 'No se pudo reasignar el sujeto' });
  }
});

async function createEmployeeHandler(req, res) {
  try {
    const { image, name, employeeCode } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedCode = typeof employeeCode === 'string' ? employeeCode.trim().toUpperCase() : '';
    // Shared boundary validator keeps capture input rules consistent with admin edits.
    parseEmployeeInput({ name, employeeCode: normalizedCode });
    if (!/^[A-Z0-9_-]{2,32}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'El legajo debe tener entre 2 y 32 letras, números, guiones o guiones bajos' });
    }

    const displayName = name.trim();
    const comprefaceSubject = `employee_${normalizedCode}`;
    let faceResult;

    try {
      faceResult = await addCapturedFace(image, comprefaceSubject);
      const employee = await createEmployeeWithIdempotency({
        displayName,
        employeeCode: normalizedCode,
        comprefaceSubject,
        comprefaceImageId: faceResult.image_id,
        idempotencyKey: req.get('Idempotency-Key')?.trim() || null,
        actorUserId: req.user.id
      });

      res.status(201).json({
        success: true,
        name: employee.displayName,
        employeeCode: employee.employeeCode,
        image_id: faceResult.image_id,
        subject: comprefaceSubject,
        employee
      });
    } catch (error) {
      if (faceResult?.image_id) {
        try {
          await deleteCapturedFace(faceResult.image_id);
        } catch (cleanupError) {
          console.error('Could not roll back CompreFace image:', cleanupError.message);
        }
      }
      throw error;
    }
  } catch (error) {
    const duplicate = error.code === '23505' || error.message?.includes('UNIQUE constraint failed');
    console.error('Error creating employee:', error.message);
    res.status(duplicate ? 409 : (error.statusCode || 500)).json({
      error: duplicate ? 'Ya existe un empleado con ese legajo' : error.message
    });
  }
}

app.post('/capture', requireAdmin, createEmployeeHandler);
app.post('/api/employees', requireAdmin, createEmployeeHandler);

app.post('/recognize', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    const result = await recognizFace(image);
    let matchedEmployee = null;
    let checkIn = null;
    for (const face of result.result || []) {
      for (const subject of face.subjects || []) {
        const employee = await getEmployeeBySubject(subject.subject);
        if (employee) {
          subject.displayName = employee.displayName;
          subject.employeeCode = employee.employeeCode;
          if (!matchedEmployee) {
            matchedEmployee = employee;
            checkIn = await createCheckIn({
              employeeId: employee.id,
              similarity: subject.similarity,
              detectionProbability: face.box?.probability,
              idempotencyKey: req.get('Idempotency-Key')?.trim() || null
            });
          }
        }
      }
    }
    res.json({ ...result, matchedEmployee, checkIn });
  } catch (error) {
    console.error('Error during recognition:', error.message);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.get('/api/health', async (_req, res) => {
  const [recognitionResult, databaseResult] = await Promise.allSettled([
    checkRecognitionService(),
    checkDatabaseConnection()
  ]);
  const recognitionOk = recognitionResult.status === 'fulfilled';
  const databaseOk = databaseResult.status === 'fulfilled';
  const healthy = recognitionOk && databaseOk && adminConfiguration.configured;

  if (!recognitionOk) console.error('CompreFace health check failed:', recognitionResult.reason?.message);
  if (!databaseOk) console.error('Database health check failed:', databaseResult.reason?.message);

  res.status(recognitionOk && databaseOk ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    services: {
      backend: 'ok',
      database: databaseOk ? databaseDriver : 'unavailable',
      compreface: recognitionOk
        ? 'ok'
        : (recognitionConfiguration.configured ? 'unavailable' : 'not_configured'),
      admin: adminConfiguration.configured ? 'ok' : 'not_configured'
    },
    ...(recognitionOk ? { subjects: recognitionResult.value.subjects } : {}),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/live', (_req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

if (shouldServeClient) {
  app.use(express.static(clientDistPath));
  app.get('/{*splat}', (req, res, next) => {
    const isApiRoute = req.path.startsWith('/api') || req.path.startsWith('/capture') || req.path.startsWith('/recognize');
    if (isApiRoute) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

export { app };

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  // Ejecutar la limpieza de la carpeta TempImage al iniciar el servidor
  cleanTempFolder();

  app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
  });
}
