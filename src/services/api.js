
import axios from 'axios';

// URL del backend
const API_URL = import.meta.env.VITE_API_URL || '';

// Conexion comun para el ERP
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000
});

// Enviar automaticamente el token JWT
api.interceptors.request.use((config) => {
  if (!API_URL || sessionStorage.getItem('novasoft.demoLocal') === 'true') {
    return Promise.reject(new Error('API deshabilitada para esta demostración.'));
  }
  const token = sessionStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Gestionar errores de autenticacion
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (
      error.response?.status === 401 &&
      sessionStorage.getItem('token')
    ) {
      sessionStorage.removeItem('token');
      console.warn('Sesion caducada. Inicia sesion nuevamente.');
    }

    return Promise.reject(error);
  }
);

export default api;
