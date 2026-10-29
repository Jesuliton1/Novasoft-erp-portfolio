
import { con } from '../models/db.js';

// Obtener las reservas disponibles
export const obtenerReservas = (req, res) => {
  const sql = `
    SELECT
      r.idReserva,
      r.fechaEntrada,
      r.fechaSalida,
      r.precioTotal,
      u.nombre AS cliente
    FROM reservas r
    JOIN usuario u ON r.idUsuario = u.idUsuario
    ORDER BY r.idReserva DESC
  `;

  con.query(sql, (err, resultados) => {
    if (err) {
      console.error('Error al obtener reservas:', err.code);

      return res.status(500).json({
        message: 'No se pudieron obtener las reservas'
      });
    }

    res.status(200).json(resultados);
  });
};

// Registrar una factura para una reserva
export const registrarFactura = (req, res) => {
  const { idReserva, estado } = req.body || {};

  const id = Number(idReserva);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: 'Selecciona una reserva válida'
    });
  }

  const estadosPermitidos = [
    'Pendiente',
    'Pagado',
    'Cancelado'
  ];

  if (!estadosPermitidos.includes(estado)) {
    return res.status(400).json({
      message: 'Estado de factura no válido'
    });
  }

  // Comprobar que la reserva existe
  const sqlReserva = `
    SELECT idReserva
    FROM reservas
    WHERE idReserva = ?
  `;

  con.execute(sqlReserva, [id], (err, reservas) => {
    if (err) {
      console.error('Error al comprobar reserva:', err.code);

      return res.status(500).json({
        message: 'Error al comprobar la reserva'
      });
    }

    if (reservas.length === 0) {
      return res.status(404).json({
        message: 'La reserva seleccionada no existe'
      });
    }

    // Comprobar si ya tiene una factura
    const sqlExiste = `
      SELECT idFactura
      FROM facturas
      WHERE idReserva = ?
      LIMIT 1
    `;

    con.execute(sqlExiste, [id], (err, facturas) => {
      if (err) {
        console.error('Error al comprobar factura:', err.code);

        return res.status(500).json({
          message: 'Error al comprobar la factura'
        });
      }

      if (facturas.length > 0) {
        return res.status(409).json({
          message: 'Esta reserva ya tiene una factura registrada'
        });
      }

      // Guardar factura
      const sqlFactura = `
        INSERT INTO facturas
        (fechaFactura, estado, idReserva)
        VALUES (CURDATE(), ?, ?)
      `;

      con.execute(sqlFactura, [estado, id], (err, resultado) => {
        if (err) {
          console.error('Error al registrar factura:', err.code);

          return res.status(500).json({
            message: 'No se pudo registrar la factura'
          });
        }

        res.status(201).json({
          message: 'Factura registrada correctamente',
          idFactura: resultado.insertId
        });
      });
    });
  });
};

// Consultar las facturas registradas
export const obtenerFacturas = (req, res) => {
  const sql = `
    SELECT
      f.idFactura,
      f.fechaFactura,
      f.estado,
      f.idReserva,
      r.precioTotal AS total,
      u.nombre AS cliente
    FROM facturas f
    JOIN reservas r ON f.idReserva = r.idReserva
    JOIN usuario u ON r.idUsuario = u.idUsuario
    ORDER BY f.idFactura DESC
  `;

  con.query(sql, (err, resultados) => {
    if (err) {
      console.error('Error al obtener facturas:', err.code);

      return res.status(500).json({
        message: 'No se pudieron obtener las facturas'
      });
    }

    res.status(200).json(resultados);
  });
};
