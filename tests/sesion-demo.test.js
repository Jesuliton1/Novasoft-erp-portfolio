import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { activarDemoLocal, esDemoLocal, obtenerRol, salirDemoLocal } from '../src/sesion.js';

const jwtInterfaz = (rol, exp = Date.now() / 1000 + 3600) =>
  `qa.${Buffer.from(JSON.stringify({ rol, exp })).toString('base64url')}.solo-interfaz`;

beforeEach(() => {
  const datos = new Map();
  globalThis.sessionStorage = {
    getItem: key => datos.get(key) ?? null,
    setItem: (key, value) => datos.set(key, value),
    removeItem: key => datos.delete(key)
  };
});

test('la demo local funciona sin JWT y sólo habilita las pantallas de rol 6', () => {
  assert.equal(obtenerRol(), null);
  activarDemoLocal();
  assert.equal(esDemoLocal(), true);
  assert.equal(obtenerRol(), 6);
  assert.equal(sessionStorage.getItem('token'), null);
  salirDemoLocal();
  assert.equal(obtenerRol(), null);
});

test('entrar y salir de demo no modifica ni reemplaza un JWT existente', () => {
  const token = jwtInterfaz(1);
  sessionStorage.setItem('token', token);
  assert.equal(obtenerRol(), 1);
  activarDemoLocal();
  assert.equal(obtenerRol(), 6);
  assert.equal(sessionStorage.getItem('token'), token);
  salirDemoLocal();
  assert.equal(obtenerRol(), 1);
  assert.equal(sessionStorage.getItem('token'), token);
});

test('sin demo local se conserva la lectura de roles Cliente, Demo y personal', () => {
  for (const rol of [1, 2, 3, 4, 5, 6]) {
    sessionStorage.setItem('token', jwtInterfaz(rol));
    assert.equal(obtenerRol(), rol);
    assert.equal(esDemoLocal(), false);
  }
});

test('un JWT inválido o caducado no habilita ERP; la demo local sigue siendo independiente', () => {
  for (const token of ['inventado', jwtInterfaz(1, 1), jwtInterfaz(1.5)]) {
    sessionStorage.setItem('token', token);
    assert.equal(obtenerRol(), null);
    activarDemoLocal();
    assert.equal(obtenerRol(), 6);
    salirDemoLocal();
    assert.equal(obtenerRol(), null);
  }
});
