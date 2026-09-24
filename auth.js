import { getUserBySession } from './database.js';

export const SESSION_COOKIE = 'faceapp_session';

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return [part.trim(), ''];
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }).filter(([key]) => key));
}

export function getSessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] || null;
}

export function requireAdmin(req, res, next) {
  const user = getUserBySession(getSessionToken(req));
  if (!user) return res.status(401).json({ error: 'Debes iniciar sesión' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  req.user = user;
  next();
}
