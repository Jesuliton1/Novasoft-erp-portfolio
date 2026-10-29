import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solicitarJsonAutenticacion } from '../src/componente/login/apiAutenticacion.js';

const url = 'https://api.example.test/register';
test('API apagada: muestra un error controlado sin detalles de red ni credenciales', async () => {
  await assert.rejects(solicitarJsonAutenticacion(url, { contraseña: 'ficticia' }, {
    peticion: async () => { throw new TypeError('Failed to fetch'); }
  }), /servicio de autenticación no está disponible/);
});
test('respuesta HTML de proxy: no propaga un error de JSON', async () => {
  await assert.rejects(solicitarJsonAutenticacion(url, {}, {
    peticion: async () => ({ ok: false, json: async () => { throw new SyntaxError(); } })
  }), /servicio de autenticación no está disponible/);
});
test('registro pendiente y recuperación desactivada conservan el mensaje seguro del backend', async () => {
  for (const campo of ['message', 'error']) {
    await assert.rejects(solicitarJsonAutenticacion(url, {}, {
      peticion: async () => ({ ok: false, json: async () => ({ [campo]: 'Configuración pendiente.' }) })
    }), /Configuración pendiente/);
  }
});
test('timeout libera la petición y devuelve un error controlado', async () => {
  await assert.rejects(solicitarJsonAutenticacion(url, {}, { timeoutMs: 10,
    peticion: (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')), { once: true });
    })
  }), /servicio de autenticación no está disponible/);
});
test('una cancelación del componente no se convierte en un error de disponibilidad', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(solicitarJsonAutenticacion(url, {}, { signal: controller.signal,
    peticion: async (url, { signal }) => { signal.throwIfAborted(); }
  }), { name: 'AbortError' });
});
test('éxito: mantiene el cuerpo JSON, no-store y token ausente de la URL', async () => {
  let opciones;
  const result = await solicitarJsonAutenticacion(url, { token: 'token-ficticio' }, {
    peticion: async (destino, options) => {
      assert.equal(destino.includes('token-ficticio'), false);
      opciones = options;
      return { ok: true, json: async () => ({ valido: true }) };
    }
  });
  assert.deepEqual(result, { valido: true });
  assert.equal(opciones.cache, 'no-store');
  assert.equal(opciones.referrerPolicy, 'no-referrer');
});
