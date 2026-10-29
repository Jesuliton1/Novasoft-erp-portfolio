import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import './estilosCmp.css';

const ListaFacturasCompras = () => {
  const [facturas, setFacturas] = useState([]);
  const [compras, setCompras] = useState([]);

  // Cargar facturas desde el backend
  useEffect(() => {
    const cargarFacturas = async () => {
      try {
        const response = await api.get('/facturas');
        setFacturas(response.data);
      } catch {
        console.error('Error al cargar facturas:');
      }
    };

    const cargarCompras = async () => {
      try {
        const response = await api.get('/compras');
        setCompras(response.data);
      } catch {
        console.error('Error al cargar compras:');
      }
    };

    cargarFacturas();
    cargarCompras();
  }, []);

  return (
    <div className="ventana">
      <div className="titulo">
        <h1>Lista de Facturas y Compras</h1>
      </div>

      <div className="contenedorListas">
        {/* Lista de Facturas */}
        <div className="lista">
          <h2>Lista de Facturas</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((factura) => (
                <tr key={factura.idFactura}>
                  <td>{factura.idFactura}</td>
                  <td>{factura.cliente}</td>
                  <td>{new Date(factura.fechaFactura).toLocaleDateString('es-ES')}</td>
                  <td>{factura.total}</td>
                  <td>{factura.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lista de Compras */}
        <div className="lista">
          <h2>Lista de Compras</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((compra) => (
                <tr key={compra.idCompra}>
                  <td>{compra.idCompra}</td>
                  <td>{compra.proveedor}</td>
                  <td>{new Date(compra.fechacompra).toLocaleDateString('es-ES')}</td>
                  <td>{compra.total}</td>
                  <td>{compra.estadocompra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ListaFacturasCompras;
