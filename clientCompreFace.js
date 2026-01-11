import { CompreFace } from '@exadel/compreface-js-sdk';

const urlRaw = process.env.COMPRE_FACE_URL || 'compreface.schneidersebastian.com';
const domain = urlRaw.replace(/^https?:\/\//, '').replace(/\/$/, '');

// Forzamos el puerto 443 para HTTPS (Contabo/Caddy)
export const compreFace = new CompreFace(domain, 443);