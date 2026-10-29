
import { useState } from 'react';
import './estilosCmp.css';
import api from '../../services/api';

const productoInicial = {
  producto: '',
  cantidad: '',
  precioUnitario: ''
};

const datosIniciales = {
  fechacompra: '',
  proveedor: '',
  metodoPago: '',
  estadocompra: '',
  observaciones: ''
};

const Compras = () => {
  const [productos, setProductos] = useState([
    { ...productoInicial }
  ]);

  const [formData, setFormData] = useState({
    ...datosIniciales
  });

  const [enviando, setEnviando] = useState(false);

  // Modificar los datos de un producto
  const manejarCambioProducto = (index, e) => {
    const { name, value } = e.target;

    setProductos((anteriores) =>
      anteriores.map((producto, posicion) =>
        posicion === index
          ? { ...producto, [name]: value }
          : producto
      )
    );
  };

  // Añadir otro producto
  const agregarProducto = () => {
    setProductos((anteriores) => [
      ...anteriores,
      { ...productoInicial }
    ]);
  };

  // Calcular el importe total
  const calcularTotal = () => {
    const total = productos.reduce((acumulado, producto) => {
      const cantidad = Number(producto.cantidad);
      const precio = Number(producto.precioUnitario);

      if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) {
        return acumulado;
      }

      return acumulado + cantidad * precio;
    }, 0);

    return total.toFixed(2);
  };

  // Actualizar los campos de compra
  const manejarCompra = (e) => {
    const { name, value } = e.target;

    setFormData((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  // Enviar compra al backend
  const manejarEnvioC = async (e) => {
    e.preventDefault();

    if (enviando) return;

    for (const producto of productos) {
      const cantidad = Number(producto.cantidad);
      const precio = Number(producto.precioUnitario);

      if (!producto.producto.trim()) {
        alert('Introduce el nombre de todos los productos');
        return;
      }

      if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
        alert('La cantidad debe ser un número entero mayor que cero');
        return;
      }

      if (!Number.isFinite(precio) || precio <= 0) {
        alert('El precio unitario debe ser mayor que cero');
        return;
      }
    }

    const cantidadTotal = productos.reduce(
      (acumulado, producto) =>
        acumulado + Number(producto.cantidad),
      0
    );

    const precioTotal = productos.reduce(
      (acumulado, producto) =>
        acumulado + Number(producto.precioUnitario),
      0
    );

    const total = calcularTotal();

    setEnviando(true);

    try {
      await api.post('/compras', {
        ...formData,
        cantidad: cantidadTotal,
        precio: precioTotal.toFixed(2),
        total,
        productos: productos.map((producto) => ({
          producto: producto.producto.trim(),
          cantidad: Number(producto.cantidad),
          precioUnitario: Number(producto.precioUnitario)
        }))
      });

      alert('Compra registrada correctamente');

      setFormData({ ...datosIniciales });
      setProductos([{ ...productoInicial }]);

    } catch (error) {
      console.error('Error al registrar compra:');

      if (error.response?.status === 401) {
        alert('Tu sesión ha caducado. Inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        alert('No tienes permisos para registrar compras.');
      } else {
        alert(
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Error al registrar la compra'
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <div className="titulo">
        <h1>Formulario de Compras</h1>
      </div>

      <div className="formularioC">
        <form onSubmit={manejarEnvioC}>
          <label>Fecha de Compra:</label>
          <input
            type="date"
            name="fechacompra"
            value={formData.fechacompra}
            onChange={manejarCompra}
            required
          />
          <br /><br />

          <label>Proveedor:</label>
          <input
            type="text"
            name="proveedor"
            value={formData.proveedor}
            onChange={manejarCompra}
            placeholder="Nombre del proveedor o empresa"
            required
          />
          <br /><br />

          <label>Productos comprados:</label>

          <div id="productos">
            {productos.map((producto, index) => (
              <div key={index}>
                <input
                  type="text"
                  name="producto"
                  placeholder="Producto"
                  value={producto.producto}
                  onChange={(e) => manejarCambioProducto(index, e)}
                  required
                />

                <input
                  type="number"
                  name="cantidad"
                  placeholder="Cantidad"
                  value={producto.cantidad}
                  onChange={(e) => manejarCambioProducto(index, e)}
                  min="1"
                  step="1"
                  required
                />

                <input
                  type="number"
                  name="precioUnitario"
                  placeholder="Precio unitario"
                  value={producto.precioUnitario}
                  onChange={(e) => manejarCambioProducto(index, e)}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={agregarProducto}
          >
            Agregar otro producto
          </button>
          <br /><br />

          <label>Total:</label>
          <input
            type="number"
            value={calcularTotal()}
            readOnly
          />
          <br /><br />

          <label>Método de Pago:</label>
          <select
            name="metodoPago"
            value={formData.metodoPago}
            onChange={manejarCompra}
            required
          >
            <option value="">Seleccione</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
          </select>
          <br /><br />

          <label>Estado:</label>
          <select
            name="estadocompra"
            value={formData.estadocompra}
            onChange={manejarCompra}
            required
          >
            <option value="">Seleccione</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </select>
          <br /><br />

          <label>Observaciones:</label>
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={manejarCompra}
            placeholder="Introduce una aclaración"
          />
          <br /><br />

          <button type="submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrar Compra'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Compras;
