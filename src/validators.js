import { AppError, ERROR_CODES } from './http-errors.js';

const EMPLOYEE_CODE = /^[A-Z0-9_-]{2,32}$/;
const SUBJECT = /^\S{1,120}$/;

export function requireString(value, field, { max = 120, trim = true } = {}) {
  const normalized = typeof value === 'string' && trim ? value.trim() : value;
  if (typeof normalized !== 'string' || !normalized || normalized.length > max) {
    throw new AppError(ERROR_CODES.INVALID_INPUT, `${field} es obligatorio y no puede superar ${max} caracteres`, 400);
  }
  return normalized;
}

export function parseEmployeeInput(body = {}) {
  const displayName = requireString(body.displayName ?? body.name, 'El nombre');
  const employeeCode = requireString(body.employeeCode, 'El legajo').toUpperCase();
  if (!EMPLOYEE_CODE.test(employeeCode)) {
    throw new AppError(ERROR_CODES.INVALID_INPUT, 'El legajo debe tener entre 2 y 32 letras, números, guiones o guiones bajos', 400);
  }
  return { displayName, employeeCode };
}

export function parseSubjectInput(value) {
  const subject = requireString(value, 'El sujeto de CompreFace');
  if (!SUBJECT.test(subject)) throw new AppError(ERROR_CODES.INVALID_INPUT, 'El sujeto de CompreFace no es válido', 400);
  return subject;
}

export function parsePositiveId(value, field = 'El identificador') {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(ERROR_CODES.INVALID_INPUT, `${field} no es válido`, 400);
  return id;
}

