import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configuracionDB } from '../models/configuracionDB.js';

test('backend deshabilitado por defecto y rechazo de bases remotas antes de conectar', () => {
  assert.throws(() => configuracionDB({}), /BACKEND_LOCAL_DISABLED/);
  assert.throws(() => configuracionDB({ NOVASOFT_LOCAL_BACKEND: 'true', DB_HOST: 'database.example.test' }), /LOCAL_DATABASE_REQUIRED/);
});
test('configuración local requiere secreto propio y rechaza el ejemplo', () => {
  const env = { NOVASOFT_LOCAL_BACKEND: 'true', DB_HOST: '127.0.0.1', DB_USER: 'usuario_ficticio',
    DB_PASSWORD: 'password_ficticio', DB_NAME: 'novasoft_pruebas', JWT_SECRET: 'secreto_ficticio_cambiar_solo_entorno_local' };
  assert.throws(() => configuracionDB(env), /LOCAL_CONFIGURATION_REQUIRED/);
  const config = configuracionDB({ ...env, JWT_SECRET: 'clave-para-test-aislado-de-configuracion-12345' });
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3306);
});
