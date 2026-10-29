import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { crearEntornoAuth, claveAnterior } from './soporte/entornoAuth.js';
import { crearRecuperacion } from '../services/recuperacion.js';
import { configurarCorreo } from '../services/correoRecuperacion.js';

const nueva = 'Nueva contraseña ficticia 456';
const hash = value => createHash('sha256').update(value).digest('hex');
const tokenCorreo = env => /#token=([a-f0-9]{64})/.exec(env.mensajes.at(-1).text)[1];
const resFake = () => ({ code: 200, set() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const iniciar = async (t) => {
  const env = await crearEntornoAuth();
  const server = env.app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await env.recuperacion.esperarPendientes();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (ruta, body, token) => {
    const response = await fetch(base + ruta, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { code: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
  };
  const solicitar = async (correo = 'cliente@example.test') => {
    const result = await request('/auth/password-reset/request', { correo });
    await env.recuperacion.esperarPendientes();
    return result;
  };
  const login = (password = claveAnterior, usuario = 'cliente_prueba') => request('/login', { usuario, password });
  return { ...env, request, solicitar, login };
};

test('HTTP: registro, bcrypt, login Cliente y denegación administrativa', async t => {
  const env = await iniciar(t);
  const datos = { nombre: 'nuevo', dni: 'FICTICIO', correo: 'nuevo@example.test', telefono: '000',
    ciudad: 'Prueba', pais: 'Prueba', contraseña: nueva };
  assert.equal((await env.request('/register', { ...datos, idClase: 1 })).code, 400);
  const alta = await env.request('/register', datos);
  assert.equal(alta.code, 201);
  assert.deepEqual(Object.keys(alta.body), ['message']);
  const user = env.memoria.state.usuarios.at(-1);
  assert.equal(user.idClase, 4);
  assert.equal(await bcrypt.compare(nueva, user.contraseña), true);
  const login = await env.login(nueva, 'nuevo');
  assert.equal(login.code, 200);
  assert.equal(login.body.usuario.contraseña, undefined);
  assert.equal(JSON.stringify(login.body).includes(nueva), false);
  assert.equal((await env.request('/perfil', undefined, login.body.token)).body.rol, 4);
  assert.equal((await env.request('/administracion', undefined, login.body.token)).code, 403);
  assert.equal((await env.request('/trabajadores', undefined, login.body.token)).code, 403);
  assert.equal((await env.request('/register', datos)).code, 409);
  assert.equal((await env.request('/register', { ...datos, nombre: 'otro' })).code, 409);
  assert.equal(env.memoria.state.usuarios.length, 4);
  assert.equal(env.memoria.state.usuarios.at(-1).contraseña, user.contraseña);
});

test('HTTP: existente e inexistente tienen idéntica respuesta genérica; sólo se guarda SHA-256', async t => {
  const env = await iniciar(t);
  const anterior = env.memoria.state.usuarios[2].contraseña;
  const existe = await env.solicitar();
  const noExiste = await env.solicitar('inexistente@example.test');
  assert.equal(existe.code, 202);
  assert.deepEqual(existe, noExiste);
  assert.equal(existe.cache, 'no-store');
  assert.equal(env.mensajes.length, 1);
  const token = tokenCorreo(env), guardado = env.memoria.state.tokens[0];
  assert.equal(guardado.tokenHash, hash(token));
  assert.equal(guardado.expiresAt - guardado.requestedAt, 15 * 60 * 1000);
  assert.equal(JSON.stringify(env.memoria.state).includes(token), false);
  assert.equal(env.memoria.state.usuarios[2].contraseña, anterior);
});

test('HTTP: recuperación completa, consumo único, nuevo login y revocación del JWT anterior', async t => {
  const env = await iniciar(t);
  const sesion = (await env.login()).body.token;
  assert.equal((await env.request('/perfil', undefined, sesion)).code, 200);
  await env.solicitar();
  const token = tokenCorreo(env);
  assert.equal((await env.request('/auth/password-reset/validate', { token })).code, 200);
  const cambio = await env.request('/auth/password-reset/confirm', { token, contraseña: nueva });
  assert.equal(cambio.code, 200);
  assert.deepEqual(Object.keys(cambio.body), ['message']);
  assert.equal((await env.request('/perfil', undefined, sesion)).code, 401);
  assert.equal((await env.login()).code, 401);
  const nuevaSesion = await env.login(nueva);
  assert.equal(nuevaSesion.code, 200);
  assert.equal((await env.request('/perfil', undefined, nuevaSesion.body.token)).code, 200);
  assert.equal((await env.request('/auth/password-reset/confirm', { token, contraseña: claveAnterior })).code, 400);
  assert.equal((await env.request('/auth/password-reset/validate', { token })).code, 400);
});

test('HTTP: tokens incorrectos/caducados y contraseñas inválidas no cambian la cuenta', async t => {
  const env = await iniciar(t);
  await env.solicitar();
  const token = tokenCorreo(env), anterior = env.memoria.state.usuarios[2].contraseña;
  for (const contraseña of ['corta', '🔒'.repeat(20), null]) {
    assert.equal((await env.request('/auth/password-reset/confirm', { token, contraseña })).code, 400);
  }
  for (const incorrecto of ['x', 'a'.repeat(64), '']) {
    assert.equal((await env.request('/auth/password-reset/confirm', { token: incorrecto, contraseña: nueva })).code, 400);
  }
  env.memoria.state.ahora += 900000;
  assert.equal((await env.request('/auth/password-reset/validate', { token })).code, 400);
  assert.equal((await env.request('/auth/password-reset/confirm', { token, contraseña: nueva })).code, 400);
  assert.equal(env.memoria.state.usuarios[2].contraseña, anterior);
});

test('dos restablecimientos simultáneos: exactamente uno consume el token', async t => {
  const env = await iniciar(t);
  await env.solicitar();
  const token = tokenCorreo(env);
  const resultados = await Promise.all([
    env.request('/auth/password-reset/confirm', { token, contraseña: nueva }),
    env.request('/auth/password-reset/confirm', { token, contraseña: claveAnterior })
  ]);
  assert.deepEqual(resultados.map(r => r.code).sort(), [200, 400]);
});

test('rollback: un fallo al consumir el token revierte también la contraseña', async t => {
  const env = await iniciar(t);
  await env.solicitar();
  const token = tokenCorreo(env), anterior = env.memoria.state.usuarios[2].contraseña;
  env.memoria.fallarConsumo();
  assert.equal((await env.request('/auth/password-reset/confirm', { token, contraseña: nueva })).code, 503);
  assert.equal(env.memoria.state.usuarios[2].contraseña, anterior);
  assert.equal(env.memoria.state.tokens[0].usedAt, null);
  assert.equal((await env.request('/auth/password-reset/confirm', { token, contraseña: nueva })).code, 200);
});

test('cuentas protegidas: sin emisión ni cambios incluso con token introducido en el doble', async t => {
  const env = await iniciar(t);
  const anterior = structuredClone(env.memoria.state.usuarios);
  for (const user of anterior.slice(0, 2)) {
    assert.equal((await env.solicitar(user.correo)).code, 202);
    const token = String(user.idUsuario).repeat(64);
    env.memoria.state.tokens.push({ userId: user.idUsuario, tokenHash: hash(token),
      requestedAt: env.memoria.state.ahora, expiresAt: env.memoria.state.ahora + 900000, usedAt: null });
    assert.equal((await env.request('/auth/password-reset/validate', { token })).code, 400);
    assert.equal((await env.request('/auth/password-reset/confirm', { token, contraseña: nueva })).code, 400);
    const login = await env.login(claveAnterior, user.nombre);
    assert.equal(login.code, 200);
    assert.equal((await env.request('/administracion', undefined, login.body.token)).code, user.idClase === 1 ? 200 : 403);
  }
  assert.equal(env.mensajes.length, 0);
  assert.deepEqual(env.memoria.state.usuarios, anterior);
});

test('correo no configurado: 503; rechazo del proveedor: token inutilizado y log sin datos privados', async t => {
  const env = await iniciar(t);
  const desactivado = crearRecuperacion({ pool: env.memoria.pool, correo: configurarCorreo({}) });
  const res = resFake();
  desactivado.solicitar({ body: { correo: 'cliente@example.test' } }, res);
  assert.equal(res.code, 503);
  assert.equal(env.memoria.state.tokens.length, 0);
  env.transporte.fallar = true;
  assert.equal((await env.solicitar()).code, 202);
  assert.equal(env.mensajes.length, 0);
  assert.notEqual(env.memoria.state.tokens[0].usedAt, null);
  assert.deepEqual(env.errores, ['No se pudo completar una solicitud de recuperación.']);
});

test('limitación por cuenta en BD y nueva solicitud invalida el enlace anterior', async t => {
  const env = await iniciar(t);
  await env.solicitar();
  const antiguo = tokenCorreo(env);
  await env.solicitar();
  assert.equal(env.mensajes.length, 1);
  env.memoria.state.ahora += 61000;
  await env.solicitar();
  const nuevo = tokenCorreo(env);
  assert.notEqual(antiguo, nuevo);
  assert.equal((await env.request('/auth/password-reset/validate', { token: antiguo })).code, 400);
  assert.equal((await env.request('/auth/password-reset/validate', { token: nuevo })).code, 200);
});

test('HTTP: límites de intentos por IP en solicitud y confirmación', async t => {
  const env = await iniciar(t);
  for (let i = 0; i < 5; i++) assert.equal((await env.solicitar('ausente@example.test')).code, 202);
  assert.equal((await env.solicitar('ausente@example.test')).code, 429);
  for (let i = 0; i < 10; i++) {
    assert.equal((await env.request('/auth/password-reset/confirm', { token: 'x', contraseña: nueva })).code, 400);
  }
  assert.equal((await env.request('/auth/password-reset/confirm', { token: 'x', contraseña: nueva })).code, 429);
});

test('configuración de correo rechaza orígenes inseguros o manipulados', () => {
  for (const PUBLIC_APP_URL of ['http://example.com', 'https://example.com/?redirect=otro', 'https://usuario:clave@example.com', 'https://example.com/ruta']) {
    assert.equal(configurarCorreo({ PASSWORD_RESET_ENABLED: 'true', RESEND_API_KEY: 'ficticia',
      RESET_EMAIL_FROM: 'prueba@example.test', PUBLIC_APP_URL, NODE_ENV: 'production' }).configurado, false);
  }
});
