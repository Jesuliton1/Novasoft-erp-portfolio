
import { con } from '../models/db.js';

// Registrar una reserva completa de viaje
const registrarViaje = (req, res) => {
  const {
    nombre, dni, correo, telefono, ciudadC, paisC,
    nombreH, paisH, ciudadH, calle, habitaciones,
    compañia, notaVuelo, entrada, salida, precio, notaReserva
  } = req.body || {};

  // Comprobar campos obligatorios
  const obligatorios = [
    nombre, dni, correo, telefono, ciudadC, paisC,
    nombreH, paisH, ciudadH, calle, compañia, entrada, salida
  ];

  if (obligatorios.some(
    valor => typeof valor !== 'string' || !valor.trim()
  )) {
    return res.status(400).json({
      error: 'Completa todos los campos obligatorios'
    });
  }

  const numHabitaciones = Number(habitaciones);
  const precioTotal = Number(precio);

  if (
    !Number.isSafeInteger(numHabitaciones) ||
    numHabitaciones <= 0
  ) {
    return res.status(400).json({
      error: 'El número de habitaciones no es válido'
    });
  }

  if (
    !Number.isFinite(precioTotal) ||
    precioTotal <= 0
  ) {
    return res.status(400).json({
      error: 'El precio debe ser mayor que cero'
    });
  }

  // Validar fechas reales en formato YYYY-MM-DD
  const fechaValida = (fecha) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return false;
    }

    const objeto = new Date(`${fecha}T00:00:00Z`);

    return !Number.isNaN(objeto.getTime()) &&
      objeto.toISOString().slice(0, 10) === fecha;
  };

  if (!fechaValida(entrada) || !fechaValida(salida)) {
    return res.status(400).json({
      error: 'Las fechas introducidas no son válidas'
    });
  }

  if (salida < entrada) {
    return res.status(400).json({
      error: 'La fecha de salida no puede ser anterior a la entrada'
    });
  }

  const rollback = (error, respuesta) => {
    console.error('Error al registrar viaje:', error.code || 'INTERNAL_ERROR');

    con.rollback(() => {
      return res.status(500).json({
        error: respuesta
      });
    });
  };

  // Iniciar transacción
  con.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar transacción:', err.code);

      return res.status(500).json({
        error: 'No se pudo iniciar el registro del viaje'
      });
    }

    // 1. Registrar cliente
    const sqlUsuario = `
      INSERT INTO usuario
      (nombre, dni, correo, telefono, ciudad, pais, idClase)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    con.query(
      sqlUsuario,
      [nombre, dni, correo, telefono, ciudadC, paisC, 4],
      (err, resultadoUsuario) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return con.rollback(() => {
              res.status(409).json({
                error: 'El cliente ya existe. Revisa el correo o DNI.'
              });
            });
          }

          return rollback(err, 'Error al registrar el cliente');
        }

        const idUsuario = resultadoUsuario.insertId;

        // 2. Registrar reserva
        const sqlReserva = `
          INSERT INTO reservas
          (fechaEntrada, fechaSalida, precioTotal, notaReserva, idUsuario)
          VALUES (?, ?, ?, ?, ?)
        `;

        con.query(
          sqlReserva,
          [entrada, salida, precioTotal, notaReserva || '', idUsuario],
          (err, resultadoReserva) => {
            if (err) {
              return rollback(err, 'Error al registrar la reserva');
            }

            const idReserva = resultadoReserva.insertId;

            // 3. Registrar hotel
            const sqlHotel = `
              INSERT INTO hoteles
              (nombre, pais, ciudad, calle, habitaciones, idReserva)
              VALUES (?, ?, ?, ?, ?, ?)
            `;

            con.query(
              sqlHotel,
              [
                nombreH, paisH, ciudadH, calle,
                numHabitaciones, idReserva
              ],
              (err) => {
                if (err) {
                  return rollback(err, 'Error al registrar el hotel');
                }

                // 4. Registrar vuelo
                const sqlVuelo = `
                  INSERT INTO vuelos
                  (compañia, notaVuelo, idReserva)
                  VALUES (?, ?, ?)
                `;

                con.query(
                  sqlVuelo,
                  [compañia, notaVuelo || '', idReserva],
                  (err) => {
                    if (err) {
                      return rollback(err, 'Error al registrar el vuelo');
                    }

                    // Confirmar todas las operaciones
                    con.commit((err) => {
                      if (err) {
                        return rollback(
                          err,
                          'No se pudo finalizar la reserva'
                        );
                      }

                      res.status(201).json({
                        mensaje: 'Viaje registrado correctamente',
                        idReserva
                      });
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

export default registrarViaje;
