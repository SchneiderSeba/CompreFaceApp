import { CompreFace } from '@exadel/compreface-js-sdk';

// 1. Extrae solo el dominio, SIN 'https://' y SIN '/' al final
const urlRaw = process.env.COMPRE_FACE_URL || 'compreface.schneidersebastian.com';
const cleanDomain = urlRaw.replace(/^https?:\/\//, '').replace(/\/$/, '');

// 2. Para usar HTTPS, el puerto DEBE ser 443. 
// El SDK usará https:// automáticamente si el puerto es 443.
export const compreFace = new CompreFace(cleanDomain, 443);