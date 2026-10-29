import { con } from '../models/db.js';

// LLamada a base de datos para registrar una reserva
export const obtenerPresupuestos = (req, res) => {
  const query = `
    SELECT p.idPresupuesto, p.fechaPresupuesto, p.estado, r.precioTotal AS total, u.nombre AS proveedor
    FROM presupuestos p
    JOIN reservas r ON p.idReserva = r.idReserva
    JOIN usuario u ON r.idUsuario = u.idUsuario
  `;

  // Ejecutar la consulta
  con.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener presupuestos:', err.code);
      return res.status(500).json({ message: 'Error al obtener presupuestos' });
    }

    res.status(200).json(results);
  });
};