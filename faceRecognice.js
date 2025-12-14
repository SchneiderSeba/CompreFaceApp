import { compreFace } from "./clientCompreFace.js";
import fs from "fs";
import dotenv from "dotenv";
 
dotenv.config();

let recognitionService = compreFace.initFaceRecognitionService(process.env.COMPRE_FACE_API_KEY);

// Initialize or get reference to a gallery

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
    // fs.unlinkSync(tempPath);
    
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
    
    // Mensaje de error más específico
    if (error.response?.status === 400) {
      throw new Error('No se detectó un rostro en la imagen. Asegúrate de que tu cara esté bien iluminada y visible.');
    }
    throw error;
  }
}

export async function addNewFaceToPullManualy() {
  let faceCollection = recognitionService.getFaceCollection();
  let name = encodeURIComponent('Sebastian');
  
  try {
    const response = await faceCollection.add("./image/pass-ireland.jpg", name);
    console.log("Face added:", response);
    
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Face Added Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: transparent; }
          .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          img { max-width: 100%; margin-top: 20px; border: 3px solid #4CAF50; border-radius: 8px; }
          .info { background: #ffffff9d; padding: 15px; border-radius: 5px; margin: 10px 0; }
          h1 { color: #2e7d32; margin-bottom: 20px; }
          .data-item { margin: 10px 0; font-size: 16px; }
          .label { font-weight: bold; color: #1b5e20; }
          .span { color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Face Added Successfully to Collection!</h1>
          
          <div class="info">
            <div class="data-item">
              <span class="label">👤 Name:</span> <span class="span">${decodeURIComponent(name)}</span>
            </div>
            <div class="data-item">
              <span class="label">🆔 Image ID:</span> <span class="span">${response.image_id}</span>
            </div>
            <div class="data-item">
              <span class="label">📊 Subject:</span> <span class="span">${response.subject}</span>
            </div>
          </div>
          
          <h2>📷 Added Image:</h2>
    `;
    
    // Mostrar la imagen
    let imageData = fs.readFileSync("./image/pass-ireland.jpg", { encoding: 'base64' });
    htmlContent += `<img src="data:image/jpeg;base64,${imageData}" alt="Added Face"/>`;
    
    htmlContent += `
        </div>
      </body>
      </html>
    `;
    
    return htmlContent;
  } catch (error) {
    console.error(error);
    throw error;
  }
}