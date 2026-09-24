import { compreFace, compreFaceBaseUrl } from "./clientCompreFace.js";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
 
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDirectory = path.join(__dirname, "TempImage");
const imageDirectory = path.join(__dirname, "image");
const apiKeyVariable = process.env.COMPREFACE_API_KEY_ENV || 'COMPRE_FACE_API_KEY';
const apiKey = process.env[apiKeyVariable];

if (!apiKey) {
  throw new Error(`Falta configurar la clave indicada por COMPREFACE_API_KEY_ENV (${apiKeyVariable})`);
}

const recognitionService = compreFace.initFaceRecognitionService(apiKey);

export async function checkRecognitionService() {
  const response = await fetch(`${compreFaceBaseUrl}/api/v1/recognition/subjects`, {
    headers: { 'x-api-key': apiKey },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`CompreFace respondió con HTTP ${response.status}`);
  }

  const body = await response.json();
  return { subjects: Array.isArray(body?.subjects) ? body.subjects.length : 0 };
}

function decodeBase64Image(base64Image) {
  if (typeof base64Image !== 'string') {
    throw new Error('La imagen debe enviarse como una cadena base64');
  }

  const match = base64Image.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new Error('El formato de la imagen no es válido');
  }

  const imageBuffer = Buffer.from(match[1], 'base64');
  if (imageBuffer.length === 0) {
    throw new Error('La imagen está vacía');
  }

  return imageBuffer;
}

function removeTemporaryFile(tempPath) {
  if (tempPath && fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }
}

function userFacingError(message, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Función para agregar una cara desde imagen base64 capturada del frontend
export async function addCapturedFace(base64Image, name) {
  const faceCollection = recognitionService.getFaceCollection();
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) {
    throw new Error('El nombre es obligatorio');
  }

  const encodedName = encodeURIComponent(normalizedName);
  let tempPath = null;
  
  try {
    const imageBuffer = decodeBase64Image(base64Image);
    
    // Guardar temporalmente la imagen
    fs.mkdirSync(tempDirectory, { recursive: true });
    tempPath = path.join(tempDirectory, `temp_add_${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, imageBuffer);
    
    // Agregar la cara a la colección usando el path del archivo
    const response = await faceCollection.add(tempPath, encodedName);
    console.log("Face added from capture:", response);
    
    return {
      success: true,
      name: decodeURIComponent(encodedName),
      image_id: response.image_id,
      subject: response.subject
    };
  } catch (error) {
    console.error('Error adding captured face:', error.message);
    
    if (error.response?.status === 400) {
      throw userFacingError('No se detectó un rostro en la imagen. Asegúrate de que tu cara esté bien iluminada y visible.');
    }
    throw error;
  } finally {
    try {
      removeTemporaryFile(tempPath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }
  }
}

export async function deleteCapturedFace(imageId) {
  if (!imageId) return;
  await recognitionService.getFaceCollection().delete(imageId);
}

export async function recognizFace(base64Image) {
  let tempPath = null;

  try {
    const imageBuffer = decodeBase64Image(base64Image);

    fs.mkdirSync(tempDirectory, { recursive: true });

    tempPath = path.join(tempDirectory, `temp_rec_${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, imageBuffer);


    const response = await recognitionService.recognize(tempPath, {
      limit: 1,
      det_prob_threshold: 0.85
    });

    if (!response?.result?.length) {
      throw userFacingError('No se pudo reconocer un rostro en la imagen. Intenta acercarte o mejora la iluminación.');
    }

    console.log("Recognition result:", response);
    return response;
  } catch (error) {
    console.error('Error recognizing face:', error.message);

    if (error.response?.status === 400) {
      throw userFacingError('No se pudo reconocer un rostro en la imagen. Intenta acercarte o mejora la iluminación.');
    }
    throw error;
  } finally {
    try {
      removeTemporaryFile(tempPath);
    } catch (cleanupError) {
      console.error('Error cleaning up recognition temp file:', cleanupError);
    }
  }
}

export async function addNewFaceToPullManualy() {
  let faceCollection = recognitionService.getFaceCollection();

  let name = encodeURIComponent('Sebastian');  //TODO - cAMBIAR A RECEPCION DE VARIABLE DE NOMBRE
  
  const imageToAdd = fs.readdirSync(imageDirectory);

  if (imageToAdd.length === 0) {
    throw new Error('No hay imágenes en la carpeta image');
  }

  console.log("Image to add:", imageToAdd);

  try {
    const addedImagePath = path.join(imageDirectory, imageToAdd[0]);
    const response = await faceCollection.add(addedImagePath, name);
    console.log("Face added:", response);

    let addedImageId = response.image_id;
    let addedImageSubject = response.subject;
    let addedImageName = decodeURIComponent(name);
    let imageData = fs.readFileSync(addedImagePath, { encoding: 'base64' });
    
    return {
      success: true,
      name: addedImageName,
      image_id: addedImageId,
      subject: addedImageSubject,
      image: `data:image/jpeg;base64,${imageData}`
    };
  } catch (error) {
    console.error('Error adding manual face:', error.message);
    throw error;
  }
}
