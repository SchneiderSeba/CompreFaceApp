import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { addCapturedFace, checkRecognitionService, deleteCapturedFace, recognizFace } from './faceRecognice.js';
import { cleanTempFolder } from './cleanTempImg.js';
import {
  createEmployee,
  createSession,
  deleteSession,
  findAdminByUsername,
  getEmployeeBySubject,
  getUserBySession,
  listEmployees,
  verifyPassword
} from './database.js';
import { getSessionToken, requireAdmin, SESSION_COOKIE } from './auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, 'FrontEnd', 'faceApp', 'dist');
const shouldServeClient = process.env.SERVE_CLIENT === 'true' || fs.existsSync(clientDistPath);
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000,http://localhost:5173')
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
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
  );
}

app.post('/api/auth/login', (req, res) => {
  const key = req.ip || 'unknown';
  const attempt = loginAttempts.get(key);
  if (attempt && attempt.blockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Demasiados intentos. Intenta nuevamente en unos minutos.' });
  }

  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const admin = username ? findAdminByUsername(username) : null;

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    const failures = (attempt?.failures || 0) + 1;
    loginAttempts.set(key, {
      failures,
      blockedUntil: failures >= 5 ? Date.now() + 15 * 60 * 1000 : 0
    });
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  loginAttempts.delete(key);
  const session = createSession(admin.id);
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

app.get('/api/auth/me', (req, res) => {
  const user = getUserBySession(getSessionToken(req));
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  deleteSession(getSessionToken(req));
  setSessionCookie(res, '', 0);
  res.status(204).end();
});

app.get('/api/employees', requireAdmin, (_req, res) => {
  res.json({ employees: listEmployees() });
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
    if (!/^[A-Z0-9_-]{2,32}$/.test(normalizedCode)) {
      return res.status(400).json({ error: 'El legajo debe tener entre 2 y 32 letras, números, guiones o guiones bajos' });
    }

    const displayName = name.trim();
    const comprefaceSubject = `employee_${normalizedCode}`;
    let faceResult;

    try {
      faceResult = await addCapturedFace(image, comprefaceSubject);
      const employee = createEmployee({
        displayName,
        employeeCode: normalizedCode,
        comprefaceSubject,
        comprefaceImageId: faceResult.image_id
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
    const duplicate = error.message?.includes('UNIQUE constraint failed');
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
    for (const face of result.result || []) {
      for (const subject of face.subjects || []) {
        const employee = getEmployeeBySubject(subject.subject);
        if (employee) {
          subject.displayName = employee.displayName;
          subject.employeeCode = employee.employeeCode;
        }
      }
    }
    res.json(result);
  } catch (error) {
    console.error('Error during recognition:', error.message);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const { subjects } = await checkRecognitionService();
    res.json({
      status: 'ok',
      services: { backend: 'ok', compreface: 'ok' },
      subjects,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('CompreFace health check failed:', error.message);
    res.status(503).json({
      status: 'degraded',
      services: { backend: 'ok', compreface: 'unavailable' },
      timestamp: new Date().toISOString()
    });
  }
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
