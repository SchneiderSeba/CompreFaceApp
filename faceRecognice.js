import { compreFace } from "./clientCompreFace.js";
import fs from "fs";
import dotenv from "dotenv";
 
dotenv.config();

let recognitionService = compreFace.initFaceRecognitionService(process.env.COMPRE_FACE_API_KEY);

// Initialize or get reference to a gallery

export async function addNewFaceToPull() {
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
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          img { max-width: 100%; margin-top: 20px; border: 3px solid #4CAF50; border-radius: 8px; }
          .info { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 10px 0; }
          h1 { color: #2e7d32; margin-bottom: 20px; }
          .data-item { margin: 10px 0; font-size: 16px; }
          .label { font-weight: bold; color: #1b5e20; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Face Added Successfully to Collection!</h1>
          
          <div class="info">
            <div class="data-item">
              <span class="label">👤 Name:</span> ${decodeURIComponent(name)}
            </div>
            <div class="data-item">
              <span class="label">🆔 Image ID:</span> ${response.image_id}
            </div>
            <div class="data-item">
              <span class="label">📊 Subject:</span> ${response.subject}
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