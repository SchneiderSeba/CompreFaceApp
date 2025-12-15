import { compreFace } from "./clientCompreFace.js";
import fs from "fs";
import dotenv from "dotenv";
 
dotenv.config();

let recognitionService = compreFace.initFaceRecognitionService(process.env.COMPRE_FACE_API_KEY);

// Función para agregar una cara desde imagen base64 capturada del frontend
export async function addCapturedFace(base64Image, name) {
  let faceCollection = recognitionService.getFaceCollection();
  let encodedName = encodeURIComponent(name);
  let tempPath = null; // Declarar fuera del try para acceso en catch
  
  try {
    // Convertir base64 a buffer
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Guardar temporalmente la imagen
    tempPath = `./temp_${Date.now()}.jpg`;
    fs.writeFileSync(tempPath, imageBuffer);
    
    // Agregar la cara a la colección usando el path del archivo
    const response = await faceCollection.add(tempPath, encodedName);
    console.log("Face added from capture:", response);
    
    // Eliminar el archivo temporal
    fs.unlinkSync(tempPath);
    
    return {
      success: true,
      name: decodeURIComponent(encodedName),
      image_id: response.image_id,
      subject: response.subject,
      image: base64Image
    };
  } catch (error) {
    console.error('Error adding captured face:', error);
    
    // Limpiar archivo temporal si existe
    if (tempPath) {
      try {
        if (fs.existsSync(tempPath)) {
          // fs.unlinkSync(tempPath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    if (error.response?.status === 400) {
      throw new Error('No se detectó un rostro en la imagen. Asegúrate de que tu cara esté bien iluminada y visible.');
    }
    throw error;
  }
}

export async function recognizFace(base64Image) {
  let tempPath = null;

  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    tempPath = `./TempImage/temp_rec_${Date.now()}.jpg`;
    fs.writeFileSync(tempPath, imageBuffer);

    const response = await recognitionService.recognize(tempPath, {
      limit: 1,
      det_prob_threshold: 0.8
    });

    fs.unlinkSync(tempPath);
    console.log("Recognition result:", response);
    return response;
  } catch (error) {
    console.error('Error recognizing face:', error);

    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupError) {
        console.error('Error cleaning up recognition temp file:', cleanupError);
      }
    }

    if (error.response?.status === 400) {
      throw new Error('No se pudo reconocer un rostro en la imagen. Intenta acercarte o mejora la iluminación.');
    }
    throw error;
  }
}

export async function addNewFaceToPullManualy() {
  let faceCollection = recognitionService.getFaceCollection();

  let name = encodeURIComponent('Sebastian');  //TODO - cAMBIAR A RECEPCION DE VARIABLE DE NOMBRE
  
  let imageToAdd = fs.readdirSync("./image/");

  console.log("Image to add:", imageToAdd);

  try {
    const response = await faceCollection.add(`./image/${imageToAdd[0]}`, name);
    console.log("Face added:", response);

    let addedImagePath = `./image/${imageToAdd[0]}`;
    let addedImageId = response.image_id;
    let addedImageSubject = response.subject;
    let addedImageName = decodeURIComponent(name);
    let imageData = fs.readFileSync(`./image/${imageToAdd[0]}`, { encoding: 'base64' });
    
    return {
      success: true,
      name: addedImageName,
      image_id: addedImageId,
      subject: addedImageSubject,
      image: `data:image/jpeg;base64,${imageData}`
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}