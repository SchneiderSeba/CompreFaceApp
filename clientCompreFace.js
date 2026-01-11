import { CompreFace } from '@exadel/compreface-js-sdk';

const urlRaw = process.env.COMPRE_FACE_URL || 'https://compreface.schneidersebastian.com';

// Eliminamos el protocolo 'https://' porque el SDK lo añade internamente según el puerto
const cleanDomain = urlRaw.replace(/^https?:\/\//, '').replace(/\/$/, '');

export const compreFace = new CompreFace(cleanDomain, 443);