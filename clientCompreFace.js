import { CompreFace } from '@exadel/compreface-js-sdk';
import 'dotenv/config';

const configuredUrl = process.env.COMPREFACE_URL || 'http://localhost';
const parsedUrl = new URL(configuredUrl);
const server = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
const defaultPort = parsedUrl.protocol === 'https:' ? 443 : 8000;
const port = Number(process.env.COMPREFACE_PORT || parsedUrl.port || defaultPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('COMPREFACE_PORT debe ser un puerto válido');
}

export const compreFace = new CompreFace(server, port);
export const compreFaceBaseUrl = `${server}:${port}`;
