import { CompreFace } from '@exadel/compreface-js-sdk';

let url = 'http://localhost';
let port = 8000; // Puerto de CompreFace (no el de tu servidor Express)
export const compreFace = new CompreFace(url, port);

