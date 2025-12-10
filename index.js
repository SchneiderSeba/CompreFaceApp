import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { compreFace } from './clientCompreFace.js';
import { addNewFaceToPull } from './faceRecognice.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
  try {
    const htmlContent = await addNewFaceToPull();
    res.send(htmlContent);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});