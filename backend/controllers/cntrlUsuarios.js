import { Buffer } from 'node:buffer';

import { con } from '../models/db.js';
import bcrypt from 'bcryptjs';

// Registrar un nuevo trabajador
export const registrarUsuario = async (req, res) => {
  const {
    nombre, dni, contraseña, correo,
    telefono, ciudad, pais, idClase
  } = req.body || {};

  const rol = Number(idClase);

  if (
    typeof nombre !== 'string' || !nombre.trim() ||
    typeof dni !== 'string' || !dni.trim() ||
    typeof contraseña !== 'string' ||
    typeof correo !== 'string' || !correo.trim() ||
    typeof telefono !== 'string' || !telefono.trim() ||
    typeof ciudad !== 'string' || !ciudad.trim() ||
    typeof pais !== 'string' || !pais.trim()
  ) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios'
    });
  }

  // Solo crear contables y agentes desde esta funcion
  if (![2, 3].includes(rol)) {
    return res.status(400).json({
      error: 'Perfil de trabajador no permitido'
    });
  }

  if (contraseña.length < 12 || Buffer.byteLength(contraseña, 'utf8') > 72) {
    return res.status(400).json({
      error: 'La contraseña debe tener entre 12 y 72 caracteres'
    });
  }

  try {
    const hash = await bcrypt.hash(contraseña, 12);

    const sql = `
      INSERT INTO usuario
      (nombre, dni, contraseña, correo, telefono, ciudad, pais, idClase)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    con.execute(sql, [
      nombre.trim(), dni.trim(), hash, correo.trim(),
      telefono.trim(), ciudad.trim(), pais.trim(), rol
    ], (err) => {
      if (err) {
        console.error('Error al registrar trabajador:', err.code);

        return res.status(500).json({
          error: 'No se pudo registrar el trabajador'
        });
      }

      res.status(201).json({
        message: 'Trabajador registrado correctamente'
      });
    });
  } catch {
    console.error('Error al registrar trabajador:', 'INTERNAL_ERROR');

    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

// Obtener trabajadores sin devolver contraseñas
export const obtenerTrabajadores = (req, res) => {
  const sql = `
    SELECT
      u.idUsuario,
      u.nombre,
      u.correo,
      u.telefono,
      u.ciudad,
      u.pais,
      u.idClase,
      c.nombreClase
    FROM usuario u
    JOIN clase c ON u.idClase = c.idClase
    WHERE u.idClase IN (1, 2, 3)
  `;

  con.execute(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener trabajadores:', err.code);

      return res.status(500).json({
        error: 'Error al obtener trabajadores'
      });
    }

    const administradores = results.filter(
      user => user.idClase === 1
    );

    const contables = results.filter(
      user => user.idClase === 2
    );

    const agentes = results.filter(
      user => user.idClase === 3
    );

    res.json({ administradores, contables, agentes });
  });
};

// Eliminar un trabajador
export const eliminarTrabajador = (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: 'ID de trabajador no válido'
    });
  }

  if (id === req.usuario?.id) {
    return res.status(403).json({
      message: 'No puedes eliminar tu propia cuenta'
    });
  }

  // No permitir eliminar administradores desde RRHH
  const sql = `
    DELETE FROM usuario
    WHERE idUsuario = ? AND idClase IN (2, 3)
  `;

  con.execute(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar trabajador:', err.code);

      return res.status(500).json({
        message: 'No se pudo eliminar el trabajador'
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Trabajador no encontrado o no permitido'
      });
    }

    res.json({
      message: 'Trabajador eliminado correctamente'
    });
  });
};
