// Se ejecuta el middleware real con MySQL inyectado y simulado.
// Ninguna conexión ni credencial de producción interviene en estas pruebas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { crearVerificadorToken, permitirRoles } from '../security/autenticacion.js';
import { marcaCredencial } from '../security/sesiones.js';

const secret = 'clave-ficticia-exclusiva-de-pruebas';
const cargar = async (rol = 6) => {
  let consultas = 0;
  const db = { execute(sql, values, callback) {
    consultas++;
    callback(null, [{ idUsuario: 1, idClase: rol, contraseña: 'hash-ficticio' }]);
  } };
  return { verificarToken: crearVerificadorToken(db, () => secret), permitirRoles, consultas: () => consultas };
};
const respuesta = () => ({ statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});

test('sin token, firma falsa o token caducado: 401 sin consultar MySQL', async () => {
  const middleware = await cargar();
  for (const authorization of [undefined, 'Bearer inventado',
    `Bearer ${jwt.sign({ id: 1, rol: 1 }, 'otra-clave')}`,
    `Bearer ${jwt.sign({ id: 1, rol: 1 }, secret, { expiresIn: -1 })}`]) {
    const res = respuesta();
    middleware.verificarToken({ headers: { authorization } }, res, () => assert.fail('Acceso indebido'));
    assert.equal(res.statusCode, 401);
  }
  assert.equal(middleware.consultas(), 0);
});

test('prevalece el rol actual en BD sobre el rol contenido en el JWT', async () => {
  const middleware = await cargar(6);
  const cv = marcaCredencial({ idUsuario: 1, contraseña: 'hash-ficticio' }, secret);
  const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 1, rol: 1, cv }, secret)}` } };
  let autorizado = false;
  middleware.verificarToken(req, respuesta(), () => { autorizado = true; });
  assert.equal(autorizado, true);
  assert.equal(req.usuario.rol, 6);
});

test('Demo y Cliente no acceden a ningún grupo de permisos del ERP real', async () => {
  const middleware = await cargar();
  for (const rol of [4, 5, 6]) {
    for (const permitidos of [[1], [1, 2], [1, 3], [1, 2, 3]]) {
      const res = respuesta();
      middleware.permitirRoles(...permitidos)({ usuario: { rol } }, res, () => assert.fail('Escalada de privilegios'));
      assert.equal(res.statusCode, 403);
    }
  }
});

test('Administrador conserva permisos y las operaciones de RRHH excluyen otros roles', async () => {
  const middleware = await cargar();
  for (const rol of [1, 2, 3, 6]) {
    let permitido = false;
    const res = respuesta();
    middleware.permitirRoles(1)({ usuario: { rol } }, res, () => { permitido = true; });
    assert.equal(permitido, rol === 1);
  }
});
