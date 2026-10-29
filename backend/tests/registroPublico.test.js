import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { crearRegistroPublico } from '../controllers/registroPublico.js';

const cuenta = {
  nombre: 'Cliente de prueba', dni: 'PRUEBA', correo: 'prueba@example.test',
  telefono: '000000000', ciudad: 'Granada', pais: 'España',
  contraseña: 'Una clave ficticia 123'
};
const respuesta = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test('el registro fija Cliente y almacena bcrypt sin devolver credenciales', async () => {
  let parametros;
  const db = { execute(sql, values, callback) {
    if (sql.includes('information_schema')) return callback(null, [{ INDEX_NAME: 'nombre_unico' }]);
    assert.match(sql, /VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)/);
    parametros = values;
    callback(null);
  } };
  const res = respuesta();
  await crearRegistroPublico(db)({ body: cuenta }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(parametros[7], 4);
  assert.notEqual(parametros[2], cuenta.contraseña);
  assert.equal(await bcrypt.compare(cuenta.contraseña, parametros[2]), true);
  assert.deepEqual(Object.keys(res.body), ['message']);
});

test('rechaza todos los selectores de rol antes de consultar la base de datos', async () => {
  for (const campo of ['idClase', 'rol', 'role', 'clase']) {
    for (const rol of [1, 2, 3, 4, 6]) {
      const res = respuesta();
      await crearRegistroPublico({ execute() { assert.fail('Acceso inesperado a BD'); } })(
        { body: { ...cuenta, [campo]: rol } }, res);
      assert.equal(res.statusCode, 400);
    }
  }
});

test('valida datos y longitud en bytes para evitar truncamiento bcrypt', async () => {
  for (const body of [null, {}, { ...cuenta, correo: 'incorrecto' },
    { ...cuenta, contraseña: 'corta' }, { ...cuenta, contraseña: '🔐'.repeat(20) }]) {
    const res = respuesta();
    await crearRegistroPublico({ execute() { assert.fail('Acceso inesperado a BD'); } })({ body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('los errores de BD no exponen detalles internos', async () => {
  for (const code of ['ER_DUP_ENTRY', 'ER_NO_REFERENCED_ROW_2']) {
    const res = respuesta();
    await crearRegistroPublico({ execute(sql, values, cb) {
      if (sql.includes('information_schema')) return cb(null, [{ INDEX_NAME: 'nombre_unico' }]);
      cb({ code, sql: 'privado' });
    } })(
      { body: cuenta }, res);
    assert.equal(res.statusCode, code === 'ER_DUP_ENTRY' ? 409 : 500);
    assert.deepEqual(res.body, { error: 'No se pudo registrar la cuenta' });
  }
});

test('sin unicidad del nombre bloquea el alta sin escribir', async () => {
  const res = respuesta();
  await crearRegistroPublico({ execute(sql, values, cb) {
    assert.match(sql, /information_schema/);
    cb(null, []);
  } })({ body: cuenta }, res);
  assert.equal(res.statusCode, 503);
});
