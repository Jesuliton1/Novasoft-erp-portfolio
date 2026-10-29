
import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import api from '../../services/api';
import './estilosCmp.css';

const reservaInicial = {
  idReserva: '',
  fechaEntrada: '',
  fechaSalida: '',
  cliente: '',
  precioTotal: '',
  estado: 'Pendiente'
};

const formatearFecha = (fecha) => {
  if (!fecha) return '';

  if (typeof fecha === 'string') {
    return fecha.slice(0, 10);
  }

  const objeto = new Date(fecha);

  return Number.isNaN(objeto.getTime())
    ? ''
    : objeto.toISOString().slice(0, 10);
};

const fechaEspañola = (fecha) => {
  if (!fecha) return '-';

  const partes = formatearFecha(fecha).split('-');

  if (partes.length !== 3) return '-';

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const formatearPrecio = (precio) => {
  const numero = Number(precio);

  return Number.isFinite(numero)
    ? numero.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '0,00';
};

const Facturas = () => {
  const [reserva, setReserva] = useState({ ...reservaInicial });
  const [reservasDisponibles, setReservasDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  // Cargar reservas del backend
  useEffect(() => {
    const cargarReservas = async () => {
      try {
        const respuesta = await api.get('/reservas');

        const reservas = respuesta.data.map((item) => ({
          ...item,
          fechaEntrada: formatearFecha(item.fechaEntrada),
          fechaSalida: formatearFecha(item.fechaSalida)
        }));

        setReservasDisponibles(reservas);
      } catch (error) {
        console.error('Error al cargar reservas:');

        alert(
          error.response?.data?.message ||
          'No se pudieron cargar las reservas'
        );
      } finally {
        setCargando(false);
      }
    };

    cargarReservas();
  }, []);

  // Seleccionar una reserva
  const cargarReserva = (id) => {
    if (!id) {
      setReserva({ ...reservaInicial });
      return;
    }

    const seleccionada = reservasDisponibles.find(
      (item) => Number(item.idReserva) === Number(id)
    );

    setReserva(
      seleccionada
        ? { ...seleccionada, estado: 'Pendiente' }
        : { ...reservaInicial }
    );
  };

  // Cambiar el estado
  const handleChange = (e) => {
    const { name, value } = e.target;

    setReserva((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  // Registrar factura en MySQL
  const registrarFactura = async (e) => {
    e.preventDefault();

    if (!reserva.idReserva || registrando) return;

    setRegistrando(true);

    try {
      const respuesta = await api.post('/facturas', {
        idReserva: reserva.idReserva,
        estado: reserva.estado
      });

      alert(
        respuesta.data?.message ||
        respuesta.data?.mensaje ||
        'Factura registrada correctamente'
      );
    } catch (error) {
      console.error('Error al registrar factura:');

      if (error.response?.status === 401) {
        alert('Tu sesión ha caducado. Inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        alert('No tienes permisos para registrar facturas.');
      } else {
        alert(
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Error al registrar la factura'
        );
      }
    } finally {
      setRegistrando(false);
    }
  };

  // Generar PDF profesional de demostracion
  const generarPDF = async () => {
    if (!reserva.idReserva) {
      alert('Selecciona una reserva primero');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const azulOscuro = [0, 35, 65];
    const azul = [0, 90, 160];
    const gris = [100, 110, 120];

    // Cabecera azul
    doc.setFillColor(...azulOscuro);
    doc.rect(0, 0, 210, 49, 'F');

    // Logotipo
    try {
      const logo = new Image();
      logo.src = '/img/Logo.svg';

      await new Promise((resolve, reject) => {
        logo.onload = resolve;
        logo.onerror = reject;
      });

      // Convertir WEBP a PNG para mejorar la compatibilidad
      const canvas = document.createElement('canvas');
      canvas.width = logo.naturalWidth;
      canvas.height = logo.naturalHeight;

      const contexto = canvas.getContext('2d');

      contexto.drawImage(logo, 0, 0);

      const imagenPNG = canvas.toDataURL('image/png');

      const escala = Math.min(
        29 / logo.naturalWidth,
        29 / logo.naturalHeight
      );

      const ancho = logo.naturalWidth * escala;
      const alto = logo.naturalHeight * escala;

      doc.addImage(imagenPNG, 'PNG', 15, 10, ancho, alto);
    } catch (error) {
      console.warn('No se pudo añadir el logotipo:', error);
    }

    // Titulo
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('NOVASOFT', 52, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Agencia de viajes', 52, 28);

    doc.setFontSize(15);
    doc.text('RESUMEN DE RESERVA', 195, 21, {
      align: 'right'
    });

    doc.setFontSize(9);
    doc.text('DOCUMENTO DE DEMOSTRACION', 195, 30, {
      align: 'right'
    });

    // Referencia y fecha
    doc.setTextColor(...azulOscuro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INFORMACION DEL DOCUMENTO', 15, 65);

    doc.setDrawColor(220, 225, 230);
    doc.line(15, 69, 195, 69);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text(`Referencia de reserva: ${reserva.idReserva}`, 15, 79);
    doc.text(
      `Fecha de generacion: ${new Date().toLocaleDateString('es-ES')}`,
      15,
      87
    );

    // Datos del cliente
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...azulOscuro);
    doc.text('DATOS DEL CLIENTE', 15, 105);

    doc.line(15, 109, 195, 109);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(35, 45, 55);

    const nombreCliente = doc.splitTextToSize(
      String(reserva.cliente || 'Cliente no disponible'),
      165
    );

    doc.text(nombreCliente, 15, 119);

    // Detalles de la reserva
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...azulOscuro);
    doc.text('DETALLES DEL VIAJE', 15, 141);

    doc.line(15, 145, 195, 145);

    const fila = (etiqueta, valor, y) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...gris);
      doc.text(etiqueta, 15, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...azulOscuro);
      doc.text(String(valor), 195, y, {
        align: 'right'
      });
    };

    fila('Fecha de entrada', fechaEspañola(reserva.fechaEntrada), 158);
    fila('Fecha de salida', fechaEspañola(reserva.fechaSalida), 171);
    fila('Estado', reserva.estado || 'Pendiente', 184);

    // Total destacado
    doc.setFillColor(238, 245, 251);
    doc.roundedRect(15, 201, 180, 31, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...azul);
    doc.text('IMPORTE TOTAL', 23, 220);

    doc.setFontSize(19);
    doc.text(
      `${formatearPrecio(reserva.precioTotal)} EUR`,
      187,
      220,
      { align: 'right' }
    );

    // Aviso sobre el caracter del documento
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gris);

    const aviso = doc.splitTextToSize(
      'Documento de demostracion del ERP. No es una factura fiscal ni acredita por si mismo el pago de la reserva.',
      170
    );

    doc.text(aviso, 20, 247);

    // Pie
    doc.setDrawColor(220, 225, 230);
    doc.line(15, 272, 195, 272);

    doc.setFontSize(9);
    doc.setTextColor(...gris);
    doc.text(
      'Gracias por confiar en nuestra agencia de viajes.',
      105,
      281,
      { align: 'center' }
    );

    doc.text(
      'Novasoft ERP - Proyecto de demostracion',
      105,
      288,
      { align: 'center' }
    );

    // Descargar
    doc.save(`Reserva_${reserva.idReserva}_Novasoft.pdf`);
  };

  return (
    <div className="ventana">
      <div className="titulo">
        <h1>Facturas de Reservas</h1>
      </div>

      <div className="contenedor-listas">
        <div className="lista">
          <h2>Seleccionar Reserva</h2>

          <select
            value={reserva.idReserva || ''}
            onChange={(e) => cargarReserva(e.target.value)}
            disabled={cargando}
          >
            <option value="">
              {cargando
                ? 'Cargando reservas...'
                : 'Selecciona una reserva'}
            </option>

            {reservasDisponibles.map((item) => (
              <option key={item.idReserva} value={item.idReserva}>
                {item.idReserva} - {item.cliente} - {item.precioTotal} €
              </option>
            ))}
          </select>
        </div>

        <div className="lista">
          <h2>Detalles de la Reserva</h2>

          {reserva.idReserva ? (
            <form
              className="from-facturas"
              onSubmit={registrarFactura}
            >
              <label>ID Reserva:</label>
              <input
                type="text"
                value={reserva.idReserva}
                readOnly
              />

              <label>Cliente:</label>
              <input
                type="text"
                value={reserva.cliente || ''}
                readOnly
              />

              <label>Fecha Entrada:</label>
              <input
                type="date"
                value={reserva.fechaEntrada || ''}
                readOnly
              />

              <label>Fecha Salida:</label>
              <input
                type="date"
                value={reserva.fechaSalida || ''}
                readOnly
              />

              <label>Precio Total:</label>
              <input
                type="text"
                value={reserva.precioTotal || ''}
                readOnly
              />

              <label>Estado:</label>
              <select
                name="estado"
                value={reserva.estado}
                onChange={handleChange}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
                <option value="Cancelado">Cancelado</option>
              </select>

              <div className="botones">
                <button
                  type="submit"
                  disabled={registrando}
                >
                  {registrando
                    ? 'Registrando...'
                    : 'Registrar Factura'}
                </button>

                <button
                  type="button"
                  onClick={generarPDF}
                >
                  Generar PDF
                </button>
              </div>
            </form>
          ) : (
            <p>
              Por favor, selecciona una reserva para ver los detalles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Facturas;
