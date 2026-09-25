import { compreFaceBaseUrl } from './clientCompreFace.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imageDirectory = path.join(__dirname, 'image');
const apiKeyVariable = process.env.COMPREFACE_API_KEY_ENV || 'COMPRE_FACE_API_KEY';
const apiKey = process.env[apiKeyVariable];
const configuredThreshold = Number(process.env.COMPREFACE_DETECTION_THRESHOLD || 0.6);
const detectionThreshold = Number.isFinite(configuredThreshold)
  && configuredThreshold >= 0
  && configuredThreshold <= 1
  ? configuredThreshold
  : 0.6;

export const recognitionConfiguration = {
  configured: Boolean(apiKey),
  apiKeyVariable,
  detectionThreshold
};

if (!recognitionConfiguration.configured) {
  console.warn(`⚠️ Reconocimiento deshabilitado: falta configurar ${apiKeyVariable}.`);
}

function requireApiKey() {
  if (apiKey) return apiKey;
  const error = new Error(`El reconocimiento no está configurado: falta ${apiKeyVariable}`);
  error.statusCode = 503;
  throw error;
}

function userFacingError(message, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function decodeBase64Image(base64Image) {
  if (typeof base64Image !== 'string') {
    throw userFacingError('La imagen debe enviarse como una cadena base64', 400);
  }

  const match = base64Image.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw userFacingError('El formato de la imagen no es válido', 400);
  }

  const format = match[1] === 'jpg' ? 'jpeg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    throw userFacingError('La imagen está vacía', 400);
  }

  return {
    buffer,
    mimeType: `image/${format}`,
    extension: format === 'jpeg' ? 'jpg' : format
  };
}

function summarizeUpstreamBody(body) {
  if (body == null) return '';
  const summary = typeof body === 'string' ? body : JSON.stringify(body);
  return summary.slice(0, 500);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestCompreFace(endpoint, { method = 'GET', image, params } = {}) {
  const key = requireApiKey();
  const url = new URL(endpoint, `${compreFaceBaseUrl}/`);

  for (const [name, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
  }

  const headers = { 'x-api-key': key };
  let body;
  if (image) {
    body = new FormData();
    body.append(
      'file',
      new Blob([image.buffer], { type: image.mimeType }),
      `capture.${image.extension}`
    );
  }

  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(30000)
  });
  const responseBody = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(`CompreFace respondió con HTTP ${response.status}`);
    error.upstreamStatus = response.status;
    error.upstreamBody = responseBody;
    throw error;
  }

  return responseBody;
}

function logCompreFaceError(context, error) {
  const detail = summarizeUpstreamBody(error.upstreamBody);
  console.error(
    `${context}:`,
    error.message,
    detail ? `- ${detail}` : ''
  );
}

export async function checkRecognitionService() {
  const body = await requestCompreFace('/api/v1/recognition/subjects');
  return { subjects: Array.isArray(body?.subjects) ? body.subjects.length : 0 };
}

export async function addCapturedFace(base64Image, name) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) throw userFacingError('El nombre es obligatorio', 400);

  try {
    const image = decodeBase64Image(base64Image);
    const response = await requestCompreFace('/api/v1/recognition/faces', {
      method: 'POST',
      image,
      params: {
        subject: normalizedName,
        det_prob_threshold: detectionThreshold
      }
    });

    return {
      success: true,
      name: normalizedName,
      image_id: response.image_id,
      subject: response.subject
    };
  } catch (error) {
    logCompreFaceError('Error adding captured face', error);
    if (error.upstreamStatus === 400) {
      throw userFacingError('No se detectó un rostro con suficiente claridad. Acércate a la cámara y mejora la iluminación.');
    }
    throw error;
  }
}

export async function deleteCapturedFace(imageId) {
  if (!imageId) return;
  await requestCompreFace(`/api/v1/recognition/faces/${encodeURIComponent(imageId)}`, {
    method: 'DELETE'
  });
}

export async function recognizFace(base64Image) {
  try {
    const image = decodeBase64Image(base64Image);
    const response = await requestCompreFace('/api/v1/recognition/recognize', {
      method: 'POST',
      image,
      params: {
        limit: 1,
        det_prob_threshold: detectionThreshold
      }
    });

    if (!response?.result?.length) {
      throw userFacingError('No se pudo reconocer un rostro en la imagen. Intenta acercarte o mejora la iluminación.');
    }

    return response;
  } catch (error) {
    logCompreFaceError('Error recognizing face', error);
    if (error.upstreamStatus === 400) {
      throw userFacingError('No se detectó un rostro con suficiente claridad. Acércate a la cámara y mejora la iluminación.');
    }
    throw error;
  }
}

export async function addNewFaceToPullManualy() {
  const imageFiles = fs.readdirSync(imageDirectory);
  if (imageFiles.length === 0) throw new Error('No hay imágenes en la carpeta image');

  const imagePath = path.join(imageDirectory, imageFiles[0]);
  const extension = path.extname(imagePath).slice(1).toLowerCase();
  const format = extension === 'jpg' ? 'jpeg' : extension;
  const response = await requestCompreFace('/api/v1/recognition/faces', {
    method: 'POST',
    image: {
      buffer: fs.readFileSync(imagePath),
      mimeType: `image/${format}`,
      extension
    },
    params: {
      subject: 'Sebastian',
      det_prob_threshold: detectionThreshold
    }
  });

  return {
    success: true,
    name: 'Sebastian',
    image_id: response.image_id,
    subject: response.subject,
    image: `data:image/${format};base64,${fs.readFileSync(imagePath, { encoding: 'base64' })}`
  };
}
