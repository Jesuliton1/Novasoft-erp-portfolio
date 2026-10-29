const NO_DISPONIBLE = 'El servicio de autenticación no está disponible temporalmente. Inténtalo más tarde.';

export const urlApiAutenticacion = () => {
  const base = import.meta.env.VITE_API_URL || '';
  if (!base) throw new Error(NO_DISPONIBLE);
  return base.replace(/\/+$/, '');
};

export const solicitarJsonAutenticacion = async (url, datos, {
  signal, timeoutMs = 20000, peticion = globalThis.fetch
} = {}) => {
  const controller = new AbortController();
  const cancelar = () => controller.abort();
  if (signal?.aborted) cancelar();
  else signal?.addEventListener('abort', cancelar, { once: true });
  const timer = setTimeout(cancelar, timeoutMs);
  try {
    const response = await peticion(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos), signal: controller.signal,
      cache: 'no-store', referrerPolicy: 'no-referrer'
    });
    let body;
    try { body = await response.json(); } catch { throw new Error(NO_DISPONIBLE); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(NO_DISPONIBLE);
    if (!response.ok) throw new Error(body.message || body.error || NO_DISPONIBLE);
    return body;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted || error instanceof TypeError) throw new Error(NO_DISPONIBLE);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancelar);
  }
};

export const enviarAutenticacion = (ruta, datos, signal) =>
  solicitarJsonAutenticacion(`${urlApiAutenticacion()}${ruta}`, datos, { signal });
