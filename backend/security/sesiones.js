import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

export const marcaCredencial = (usuario, secreto) => createHmac('sha256', secreto)
  .update(`${usuario.idUsuario}:${usuario.contraseña}`).digest('hex');
export const sesionVigente = (marca, usuario, secreto) => {
  if (typeof marca !== 'string' || !/^[a-f0-9]{64}$/.test(marca) ||
      typeof usuario.contraseña !== 'string' || !usuario.contraseña) return false;
  return timingSafeEqual(Buffer.from(marca, 'hex'), Buffer.from(marcaCredencial(usuario, secreto), 'hex'));
};
