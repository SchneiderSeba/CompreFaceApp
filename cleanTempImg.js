import fs from "fs";
import path from "path";

/**
 * Script para limpiar la carpeta TempImage cada 5 minutos
 */
export function cleanTempFolder() {
  const folderPath = "./TempImage";
  const msInFiveMinutes = 5 * 60 * 1000; // 300,000 ms

  // Verificar si la carpeta existe antes de intentar leerla
  if (!fs.existsSync(folderPath)) {
    console.log(`La carpeta ${folderPath} no existe. Creándola...`);
    fs.mkdirSync(folderPath, { recursive: true });
    return;
  }

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error("Error al leer la carpeta TempImage:", err);
      return;
    }

    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error al obtener stats de ${file}:`, err);
          return;
        }

        // Si el archivo es más viejo que 5 minutos, eliminarlo
        if (now - stats.mtimeMs > msInFiveMinutes) {
          fs.unlink(filePath, (err) => {
            if (err) console.error(`No se pudo eliminar ${file}:`, err);
            else console.log(`Archivo temporal eliminado por antigüedad: ${file}`);
          });
        }
      });
    });
  });
}

const fiveMin = 5 * 60 * 1000;

// Ejecutar cada 5 minutos (300,000 milisegundos)
setInterval(cleanTempFolder, fiveMin);

// Ejecutar una vez al arrancar el servidor
