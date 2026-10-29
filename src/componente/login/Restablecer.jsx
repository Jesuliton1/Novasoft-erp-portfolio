import { useEffect, useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { enviarAutenticacion } from './apiAutenticacion.js';
import './estilos.css';

export default function Restablecer() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [estado, setEstado] = useState('comprobando');
  const [mensaje, setMensaje] = useState('Comprobando enlace…');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Quitar el fragmento del historial antes de consultar la API.
    window.history.replaceState(null, '', window.location.pathname);
    const meta = document.createElement('meta');
    meta.name = 'referrer'; meta.content = 'no-referrer'; document.head.append(meta);
    const controller = new AbortController();
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setEstado('invalido'); setMensaje('El enlace no es válido o ha caducado.');
    } else {
      enviarAutenticacion('/auth/password-reset/validate', { token }, controller.signal)
        .then(() => { setEstado('valido'); setMensaje(''); })
        .catch(error => {
          if (!controller.signal.aborted) { setEstado('invalido'); setMensaje(error.message); }
        });
    }
    return () => { controller.abort(); meta.remove(); };
  }, [token]);
  const confirmar = async ({ contraseña }) => {
    setLoading(true); setMensaje('');
    try {
      const data = await enviarAutenticacion('/auth/password-reset/confirm', { token, contraseña });
      sessionStorage.removeItem('token');
      setEstado('completado'); setMensaje(data.message);
    } catch (error) { setEstado('invalido'); setMensaje(error.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="fondo">
      <div className="contenedorR">
        <Form className="formulario" onFinish={confirmar}>
          <h1>Nueva contraseña</h1>
          {mensaje && <Alert role="status" message={mensaje} type={estado === 'invalido' ? 'error' : 'info'} />}
          {estado === 'valido' && <>
            <Form.Item name="contraseña" label="Contraseña" rules={[
              { required: true, min: 12, message: 'Ingrese al menos 12 caracteres' },
              { validator: (_, value) => !value || new TextEncoder().encode(value).length <= 72
                ? Promise.resolve() : Promise.reject(new Error('La contraseña admite como máximo 72 bytes.')) }
            ]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="confirmar" label="Conf. Contraseña" dependencies={['contraseña']} rules={[
              { required: true, message: 'Confirme su contraseña' },
              ({ getFieldValue }) => ({ validator: (_, value) => value === getFieldValue('contraseña')
                ? Promise.resolve() : Promise.reject(new Error('Las contraseñas no coinciden')) })
            ]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item><Button block type="primary" htmlType="submit" loading={loading}>Aceptar</Button></Form.Item>
          </>}
          <Link to="/">Inicia sesión aquí</Link>
        </Form>
      </div>
    </div>
  );
}
