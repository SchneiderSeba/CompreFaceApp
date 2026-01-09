import { CompreFace } from '@exadel/compreface-js-sdk';

const url = process.env.COMPRE_FACE_URL || 'https://demo.compreface.ai';
// const port = 443;

export const compreFace = new CompreFace(url);