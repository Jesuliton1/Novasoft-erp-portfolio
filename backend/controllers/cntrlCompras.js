
import { con } from '../models/db.js';

// Registrar una compra con sus productos
const cntrlCompras = (req, res) => {
  const {
    fechacompra,
    proveedor,
    metodoPago,
    estadocompra,
    observaciones,
    productos
  } = req.body || {};

  // Comprobar campos obligatorios
  if (
    typeof fechacompra !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechacompra) ||
    typeof proveedor !== 'string' ||
    !proveedor.trim() ||
    !['Efectivo', 'Tarjeta', 'Transferencia'].includes(metodoPago) ||
    !['Pendiente', 'Pagado'].includes(estadocompra)
  ) {
    return res.status(400).json({
      error: 'Los datos de la compra no son válidos'
    });
  }

  const fecha = new Date(`${fechacompra}T00:00:00Z`);

  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.toISOString().slice(0, 10) !== fechacompra
  ) {
    return res.status(400).json({
      error: 'La fecha de compra no es válida'
    });
  }

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      error: 'Debes añadir al menos un producto'
    });
  }

  // Validar productos y calcular importes en el servidor
  let cantidadTotal = 0;
  let sumaPreciosUnitarios = 0;
  let totalCompra = 0;

  const productosValidados = [];

  for (const p of productos) {
    const cantidad = Number(p?.cantidad);
    const precioUnitario = Number(p?.precioUnitario);

    if (
      typeof p?.producto !== 'string' ||
      !p.producto.trim() ||
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      !Number.isFinite(precioUnitario) ||
      precioUnitario <= 0 ||
      Math.round(precioUnitario * 100) !== precioUnitario * 100
    ) {
      return res.status(400).json({
        error: 'Revisa el nombre, la cantidad y el precio de los productos'
      });
    }

    cantidadTotal += cantidad;
    sumaPreciosUnitarios += precioUnitario;
    totalCompra += cantidad * precioUnitario;

    productosValidados.push([
      p.producto.trim(),
      cantidad,
      precioUnitario.toFixed(2)
    ]);
  }

  if (
    !Number.isSafeInteger(cantidadTotal) ||
    !Number.isFinite(totalCompra) ||
    totalCompra > 999999999
  ) {
    return res.status(400).json({
      error: 'El importe de la compra no es válido'
    });
  }

  const total = totalCompra.toFixed(2);
  const precio = sumaPreciosUnitarios.toFixed(2);

  // Iniciar transacción
  con.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar compra:', err.code);

      return res.status(500).json({
        error: 'No se pudo iniciar la compra'
      });
    }

    const cancelar = (error, mensaje) => {
      console.error('Error al registrar compra:', error.code || 'INTERNAL_ERROR');

      con.rollback(() => {
        res.status(500).json({ error: mensaje });
      });
    };

    // 1. Guardar compra
    const sqlCompra = `
      INSERT INTO compras
      (
        fechacompra,
        proveedor,
        cantidad,
        precio,
        total,
        metodoPago,
        estadocompra,
        observaciones
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    con.query(
      sqlCompra,
      [
        fechacompra,
        proveedor.trim(),
        cantidadTotal,
        precio,
        total,
        metodoPago,
        estadocompra,
        typeof observaciones === 'string'
          ? observaciones.trim()
          : ''
      ],
      (err, resultadoCompra) => {
        if (err) {
          return cancelar(err, 'No se pudo registrar la compra');
        }

        const idCompra = resultadoCompra.insertId;

        // 2. Guardar los productos asociados
        const sqlProductos = `
          INSERT INTO productos
          (idCompra, producto, cantidad, precioUnitario)
          VALUES ?
        `;

        const valores = productosValidados.map((p) => [
          idCompra,
          p[0],
          p[1],
          p[2]
        ]);

        con.query(sqlProductos, [valores], (err) => {
          if (err) {
            return cancelar(err, 'No se pudieron registrar los productos');
          }

          // 3. Confirmar transacción
          con.commit((err) => {
            if (err) {
              return cancelar(err, 'No se pudo finalizar la compra');
            }

            res.status(201).json({
              mensaje: 'Compra y productos registrados correctamente',
              idCompra,
              total
            });
          });
        });
      }
    );
  });
};

export default cntrlCompras;

// Consultar compras
export const obtenerCompras = (req, res) => {
  const sql = `
    SELECT
      idCompra,
      fechacompra,
      proveedor,
      total,
      estadocompra
    FROM compras
    ORDER BY idCompra DESC
  `;

  con.query(sql, (err, resultados) => {
    if (err) {
      console.error('Error al obtener compras:', err.code);

      return res.status(500).json({
        message: 'No se pudieron obtener las compras'
      });
    }

    res.status(200).json(resultados);
  });
};
