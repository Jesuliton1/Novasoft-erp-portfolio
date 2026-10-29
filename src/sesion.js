// Estado de presentación local. Nunca es un JWT ni se envía a la API.
const CLAVE_DEMO_LOCAL = 'novasoft.demoLocal';

export const esDemoLocal = () => sessionStorage.getItem(CLAVE_DEMO_LOCAL) === 'true';
export const activarDemoLocal = () => sessionStorage.setItem(CLAVE_DEMO_LOCAL, 'true');
export const salirDemoLocal = () => sessionStorage.removeItem(CLAVE_DEMO_LOCAL);

export const obtenerRol = () => {
  if (esDemoLocal()) return 6;
  const token = sessionStorage.getItem('token');
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const datos = JSON.parse(atob(base64));
    if (!datos.exp || datos.exp * 1000 <= Date.now()) return null;
    const rol = Number(datos.rol);
    return Number.isInteger(rol) ? rol : null;
  } catch { return null; }
};
