
import { useState } from 'react';
import api from '../../services/api';
import './estilosViajes.css';

// Datos iniciales del formulario
const datosIniciales = {
  nombre: '',
  clase: '4',
  dni: '',
  correo: '',
  telefono: '',
  ciudadC: '',
  paisC: '',
  nombreH: '',
  paisH: '',
  ciudadH: '',
  calle: '',
  habitaciones: '',
  compañia: '',
  notaVuelo: '',
  entrada: '',
  salida: '',
  precio: '',
  notaReserva: ''
};

// Componente del formulario de reservas de viajes
const Viajes = () => {
  const [formData, setFormData] = useState({ ...datosIniciales });
  const [enviando, setEnviando] = useState(false);

  // Actualizar los datos del formulario
  const manejarPresupuesto = (e) => {
    const { name, value } = e.target;

    setFormData((anterior) => ({
      ...anterior,
      [name]: value
    }));
  };

  // Registrar el viaje en el backend
  const manejarEnvioP = async (e) => {
    e.preventDefault();

    if (enviando) return;

    if (formData.salida < formData.entrada) {
      alert('La fecha de salida no puede ser anterior a la de entrada');
      return;
    }

    setEnviando(true);

    try {
      await api.post('/viajes', formData);

      alert('Viaje registrado correctamente');

      // Limpiar formulario
      setFormData({ ...datosIniciales });

    } catch (error) {
      console.error('Error al registrar viaje:');

      if (error.response?.status === 401) {
        alert('Tu sesión ha caducado. Inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        alert('No tienes permisos para registrar viajes.');
      } else if (error.response?.data?.error === 'Correo existente') {
        alert('Ya existe un usuario con ese correo.');
      } else {
        alert(
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Error al registrar el viaje'
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <div className="titulo">
        <h1>Formulario de Reservas de Viajes</h1>
      </div>

      <div className="formularioV">
        <form onSubmit={manejarEnvioP}>

          <div className="subtitulo">
            <h2>Datos Cliente</h2>
          </div>

          <label>Nombre Cliente:</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={manejarPresupuesto}
            placeholder="Intro. nombre y apellidos"
            required
          />
          <br /><br />

          <label>DNI Cliente:</label>
          <input
            type="text"
            name="dni"
            value={formData.dni}
            onChange={manejarPresupuesto}
            placeholder="Intro. DNI"
            required
          />
          <br /><br />

          <label>Correo Cliente:</label>
          <input
            type="email"
            name="correo"
            value={formData.correo}
            onChange={manejarPresupuesto}
            placeholder="Intro. email"
            required
          />
          <br /><br />

          <label>Teléfono Cliente:</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={manejarPresupuesto}
            placeholder="Intro. telefono"
            required
          />
          <br /><br />

          <label>País Cliente:</label>
          <input
            type="text"
            name="paisC"
            value={formData.paisC}
            onChange={manejarPresupuesto}
            placeholder="Intro. país"
            required
          />
          <br /><br />

          <label>Ciudad Cliente:</label>
          <input
            type="text"
            name="ciudadC"
            value={formData.ciudadC}
            onChange={manejarPresupuesto}
            placeholder="Intro. ciudad"
            required
          />
          <br /><br />

          <div className="subtitulo">
            <h2>Datos Hotel</h2>
          </div>

          <label>Nombre hotel:</label>
          <input
            type="text"
            name="nombreH"
            value={formData.nombreH}
            onChange={manejarPresupuesto}
            placeholder="Intro. nombre hotel"
            required
          />
          <br /><br />

          <label>País hotel:</label>
          <input
            type="text"
            name="paisH"
            value={formData.paisH}
            onChange={manejarPresupuesto}
            placeholder="Intro. país"
            required
          />
          <br /><br />

          <label>Ciudad hotel:</label>
          <input
            type="text"
            name="ciudadH"
            value={formData.ciudadH}
            onChange={manejarPresupuesto}
            placeholder="Intro. ciudad"
            required
          />
          <br /><br />

          <label>Dirección hotel:</label>
          <input
            type="text"
            name="calle"
            value={formData.calle}
            onChange={manejarPresupuesto}
            placeholder="Intro. calle y número"
            required
          />
          <br /><br />

          <label>Número de habitaciones:</label>
          <input
            type="number"
            name="habitaciones"
            value={formData.habitaciones}
            onChange={manejarPresupuesto}
            placeholder="Intro. numero habitaciones alquiladas"
            min="1"
            step="1"
            required
          />
          <br /><br />

          <div className="subtitulo">
            <h2>Datos Vuelo</h2>
          </div>

          <label>Compañía aerolínea:</label>
          <input
            type="text"
            name="compañia"
            value={formData.compañia}
            onChange={manejarPresupuesto}
            placeholder="Intro. aerolinea"
            required
          />
          <br /><br />

          <label>Nota:</label>
          <input
            type="text"
            name="notaVuelo"
            value={formData.notaVuelo}
            onChange={manejarPresupuesto}
            placeholder="Intro. aclaración"
          />
          <br /><br />

          <div className="subtitulo">
            <h2>Datos Reserva</h2>
          </div>

          <label>Fecha Entrada:</label>
          <input
            type="date"
            name="entrada"
            value={formData.entrada}
            onChange={manejarPresupuesto}
            required
          />
          <br /><br />

          <label>Fecha Salida:</label>
          <input
            type="date"
            name="salida"
            value={formData.salida}
            onChange={manejarPresupuesto}
            min={formData.entrada || undefined}
            required
          />
          <br /><br />

          <label>Precio Viaje:</label>
          <input
            type="number"
            name="precio"
            value={formData.precio}
            onChange={manejarPresupuesto}
            placeholder="Intro. precio total viaje"
            min="0.01"
            step="0.01"
            required
          />
          <br /><br />

          <label>Nota:</label>
          <textarea
            name="notaReserva"
            value={formData.notaReserva}
            onChange={manejarPresupuesto}
            placeholder="Intro. aclaración"
          />
          <br /><br />

          <button type="submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrar Viaje'}
          </button>
          <br /><br />

        </form>
      </div>
    </div>
  );
};

export default Viajes;
