import { Buffer } from 'node:buffer';
export const contraseñaValida = (value) => typeof value === 'string' &&
  value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72;
export const correoValido = (value) => typeof value === 'string' && value.length <= 255 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
