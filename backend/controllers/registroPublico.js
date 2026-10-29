import bcrypt from 'bcryptjs';
import { contraseñaValida } from '../security/validacion.js';

// Dependencia inyectada para verificar el registro sin conectar con MySQL.
export const crearRegistroPublico = (db) => async (req, res) => {
  const datos = req.body && typeof req.body === 'object' ? req.body : {};
  if (['idClase', 'rol', 'role', 'clase'].some((campo) => campo in datos)) {
    return res.status(400).json({ error: 'No se permite seleccionar un perfil' });
  }
  const campos = ['nombre', 'dni', 'correo', 'telefono', 'ciudad', 'pais'];
  const limites = [50, 20, 255, 20, 50, 50];
  if (campos.some((campo, i) => typeof datos[campo] !== 'string' ||
    !datos[campo].trim() || datos[campo].trim().length > limites[i]) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo || '') ||
    !contraseñaValida(datos.contraseña)) {
    return res.status(400).json({ error: 'Revisa los campos. La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes.' });
  }
  try {
    // El login busca por nombre: sin UNIQUE, un registro duplicado podría
    // impedir el acceso a una cuenta existente. No alterar el esquema aquí.
    const indices = await new Promise((resolve, reject) => db.execute(`
      SELECT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuario' AND NON_UNIQUE = 0
      GROUP BY INDEX_NAME
      HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME) = 'nombre'
        AND MAX(SUB_PART) IS NULL`, [], (error, rows) => error ? reject(error) : resolve(rows)));
    if (!indices.length) {
      return res.status(503).json({ error: 'Registro pendiente de configuración segura. Contacta con el administrador.' });
    }
    const hash = await bcrypt.hash(datos.contraseña, 12);
    // Cliente (4), el mismo perfil utilizado por el registro de reservas.
    // No reutilizar el controlador administrativo de trabajadores.
    db.execute(`INSERT INTO usuario
      (nombre, dni, contraseña, correo, telefono, ciudad, pais, idClase)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
      datos.nombre.trim(), datos.dni.trim(), hash, datos.correo.trim(),
      datos.telefono.trim(), datos.ciudad.trim(), datos.pais.trim(), 4
    ], (error) => {
      if (error) {
        return res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({
          error: 'No se pudo registrar la cuenta'
        });
      }
      return res.status(201).json({ message: 'Usuario registrado correctamente' });
    });
  } catch {
    return res.status(500).json({ error: 'No se pudo registrar la cuenta' });
  }
};
