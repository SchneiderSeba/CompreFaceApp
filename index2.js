import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { addNewFaceToPullManualy } from './faceRecognice.js';
import { cleanTempFolder } from './cleanTempImg.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, 'FrontEnd', 'faceApp', 'dist');
const shouldServeClient = process.env.SERVE_CLIENT === 'true' || fs.existsSync(clientDistPath);
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

app.use(cors());
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

app.get('/api/manual-pull', async (req, res) => {
  try {
    const result = await addNewFaceToPullManualy();
    res.json(result);
    console.log('Result sent to client:', result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.post('/capture', async (req, res) => {
  try {
    const { image, name } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Llamar a la función que procesa la imagen
    const { addCapturedFace } = await import('./faceRecognice.js');
    const result = await addCapturedFace(image, name || 'Unknown');
    
    res.json(result);
  } catch (error) {
    console.error('Error processing capture:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/recognize', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    const { recognizFace } = await import('./faceRecognice.js');
    const result = await recognizFace(image);
    res.json(result);
  } catch (error) {
    console.error('Error during recognition:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

if (shouldServeClient) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    const isApiRoute = req.path.startsWith('/api') || req.path.startsWith('/capture') || req.path.startsWith('/recognize');
    if (isApiRoute) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Ejecutar la limpieza de la carpeta TempImage al iniciar el servidor
cleanTempFolder();

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});