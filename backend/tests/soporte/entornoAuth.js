import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { crearMysqlMemoria } from './mysqlMemoria.js';
import { crearLogin } from '../../controllers/login.js';
import { crearRegistroPublico } from '../../controllers/registroPublico.js';
import { crearRecuperacion } from '../../services/recuperacion.js';
import { configurarCorreo } from '../../services/correoRecuperacion.js';
import { crearVerificadorToken, permitirRoles } from '../../security/autenticacion.js';
import { rutasRecuperacion } from '../../routes/recuperacion.js';

export const claveAnterior = 'Clave anterior ficticia 123';
export const crearEntornoAuth = async () => {
  const hash = await bcrypt.hash(claveAnterior, 4);
  const memoria = crearMysqlMemoria([
    { idUsuario: 1, nombre: 'administrador_ficticio', correo: 'admin@example.test', contraseña: hash, idClase: 1 },
    { idUsuario: 2, nombre: 'demo_local', correo: 'demo@example.test', contraseña: hash, idClase: 6 },
    { idUsuario: 3, nombre: 'cliente_prueba', correo: 'cliente@example.test', contraseña: hash, idClase: 4 }
  ]);
  const mensajes = [], errores = [];
  const transporte = { fallar: false };
  // Transporte de pruebas explícito: no realiza peticiones a Resend.
  const correo = configurarCorreo({ PASSWORD_RESET_ENABLED: 'true',
    RESEND_API_KEY: 'clave-ficticia-solo-pruebas', RESET_EMAIL_FROM: 'Novasoft <prueba@example.test>',
    PUBLIC_APP_URL: 'http://127.0.0.1:5176', NODE_ENV: 'test'
  }, async (url, opciones) => {
    if (url !== 'https://api.resend.com/emails') throw new Error('Destino inesperado');
    if (!transporte.fallar) mensajes.push(JSON.parse(opciones.body));
    return { ok: !transporte.fallar };
  });
  const recuperacion = crearRecuperacion({ pool: memoria.pool, correo, informarError: m => errores.push(m) });
  const app = express();
  app.use(cors({ origin: ['http://127.0.0.1:5176', 'http://localhost:5176'] }));
  app.use(express.json({ limit: '100kb' }));
  const secreto = () => 'secreto-ficticio-de-integracion';
  app.post('/login', crearLogin(memoria.callbackDB, secreto));
  app.post('/register', crearRegistroPublico(memoria.callbackDB));
  app.use('/auth/password-reset', rutasRecuperacion(recuperacion));
  app.use(crearVerificadorToken(memoria.callbackDB, secreto));
  app.get('/perfil', (req, res) => res.json(req.usuario));
  app.get('/administracion', permitirRoles(1), (req, res) => res.json({ autorizado: true }));
  app.get('/trabajadores', permitirRoles(1, 2, 3), (req, res) => res.json({ autorizado: true }));
  return { app, memoria, mensajes, errores, transporte, recuperacion };
};
