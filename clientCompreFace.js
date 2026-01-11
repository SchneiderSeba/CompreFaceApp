import { CompreFace } from '@exadel/compreface-js-sdk';

// 1. Forzamos el dominio sin protocolo
const domain = "compreface.schneidersebastian.com";

// 2. Inicializamos con puerto 443 como NÚMERO
// Al ser 443, el SDK usará HTTPS automáticamente
export const compreFace = new CompreFace(domain, 443);