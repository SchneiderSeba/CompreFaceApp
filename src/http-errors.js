export const ERROR_CODES = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

export class AppError extends Error {
  constructor(code, message, status = 500, options = {}) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.expose = options.expose ?? status < 500;
  }
}

export function sendError(res, error, fallback = 'No se pudo completar la operación') {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const code = error?.code && /^[A-Z0-9_]+$/.test(error.code) ? error.code : ERROR_CODES.INTERNAL_ERROR;
  const message = error?.expose ? error.message : fallback;
  return res.status(status).json({ error: message, code });
}

