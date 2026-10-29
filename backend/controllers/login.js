import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import process from 'node:process';
import { marcaCredencial } from '../security/sesiones.js';

export const crearLogin = (db, obtenerSecreto = () => process.env.JWT_SECRET) => (req, res) => {
  const { usuario, password } = req.body || {};
  if (typeof usuario !== 'string' || !usuario || usuario.length > 255 ||
      typeof password !== 'string' || !password || password.length > 1024) {
    return res.status(400).json({ message: 'Introduce usuario y contraseña' });
  }
  const secreto = obtenerSecreto();
  if (!secreto) return res.status(500).json({ message: 'Error de configuración del servidor' });
  db.execute(`SELECT idUsuario, nombre, contraseña, correo, idClase
    FROM usuario WHERE nombre = ?`, [usuario], async (error, rows) => {
    if (error) return res.status(500).json({ message: 'Error en el servidor' });
    if (rows.length !== 1) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    const user = rows[0];
    try {
      if (!await bcrypt.compare(password, user.contraseña || '')) {
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
      }
      const token = jwt.sign({ id: user.idUsuario, rol: user.idClase, cv: marcaCredencial(user, secreto) },
        secreto, { algorithm: 'HS256', expiresIn: '1h' });
      return res.json({ message: 'Login exitoso', token, usuario: {
        idUsuario: user.idUsuario, nombre: user.nombre, correo: user.correo, idClase: user.idClase
      } });
    } catch { return res.status(500).json({ message: 'Error en el servidor' }); }
  });
};
