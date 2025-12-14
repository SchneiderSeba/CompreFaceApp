import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { compreFace } from './clientCompreFace.js';
import { addNewFaceToPullManualy } from './faceRecognice.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar límite para imágenes base64
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', async (req, res) => {
  try {
    const htmlContent = await addNewFaceToPullManualy();
    res.send(htmlContent);
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

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});