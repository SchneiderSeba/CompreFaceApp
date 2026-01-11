import { CompreFace } from '@exadel/compreface-js-sdk';

// Pasamos la URL completa con HTTPS. 
// Esto obliga al SDK a usar el puerto 443 y el protocolo correcto.
const url = "https://compreface.schneidersebastian.com";
const url2 = "http://144.91.112.29";
const port = 8000

// NO pases el segundo parámetro (puerto). Déjalo solo con la URL.
export const compreFace = new CompreFace(url2, port);