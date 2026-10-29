import jwt from 'jsonwebtoken';
import process from 'node:process';
import { sesionVigente } from './sesiones.js';

export const crearVerificadorToken = (db, obtenerSecreto = () => process.env.JWT_SECRET) => (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Debes iniciar sesion' });
  const secreto = obtenerSecreto();
  if (!secreto) return res.status(500).json({ message: 'Error de configuracion del servidor' });
  let decoded;
  try {
    decoded = jwt.verify(auth.slice(7), secreto, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(decoded.id) || decoded.id <= 0) throw new Error();
  } catch {
    return res.status(401).json({ message: 'Sesion caducada o token invalido' });
  }
  db.execute('SELECT idUsuario, idClase, contraseña FROM usuario WHERE idUsuario = ?', [decoded.id], (error, rows) => {
    if (error) return res.status(500).json({ message: 'Error al verificar la sesion' });
    if (rows.length !== 1 || !sesionVigente(decoded.cv, rows[0], secreto)) {
      return res.status(401).json({ message: 'Sesion caducada o token invalido' });
    }
    req.usuario = { id: rows[0].idUsuario, rol: rows[0].idClase };
    return next();
  });
};
export const permitirRoles = (...roles) => (req, res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) {
    return res.status(403).json({ message: 'No tienes permisos para esta operacion' });
  }
  return next();
};
