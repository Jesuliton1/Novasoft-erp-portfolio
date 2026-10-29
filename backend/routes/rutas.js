
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { con, poolRecuperacion } from '../models/db.js';
import { crearRegistroPublico } from '../controllers/registroPublico.js';
import { crearRecuperacion } from '../services/recuperacion.js';
import { configurarCorreo } from '../services/correoRecuperacion.js';
import { rutasRecuperacion } from './recuperacion.js';

import { login } from '../controllers/cntrlAutenti.js';

import {
  obtenerReservas,
  registrarFactura,
  obtenerFacturas
} from '../controllers/cntrlFacturas.js';

import cntrlCompras, {
  obtenerCompras
} from '../controllers/cntrlCompras.js';

import registrarViaje from '../controllers/cntrlViajes.js';

import {
  obtenerTrabajadores,
  eliminarTrabajador,
  registrarUsuario
} from '../controllers/cntrlUsuarios.js';

import {
  verificarToken,
  permitirRoles
} from '../middlewares/authMiddleware.js';

const router = express.Router();
router.use('/auth/password-reset', rutasRecuperacion(crearRecuperacion({
  pool: poolRecuperacion.promise(), correo: configurarCorreo({}),
  informarError: () => console.error('No se pudo completar una solicitud de recuperación.')
})));

// INICIO DE SESION
router.post('/login', login);
router.post('/register', rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Prueba de nuevo en una hora.' }
}), crearRegistroPublico(con));

// Todas las rutas siguientes requieren autenticacion
router.use(verificarToken);

// RECURSOS HUMANOS

// Consultar trabajadores
router.get(
  '/trabajadores',
  permitirRoles(1, 2, 3),
  obtenerTrabajadores
);

// Registrar trabajadores: solo administradores
router.post(
  '/trabajadores',
  permitirRoles(1),
  registrarUsuario
);

// Eliminar trabajadores: solo administradores
router.delete(
  '/usuarios/trabajadores/:id',
  permitirRoles(1),
  eliminarTrabajador
);

// RESERVAS

// Consultar reservas: personal autorizado
router.get(
  '/reservas',
  permitirRoles(1, 2, 3),
  obtenerReservas
);

// VIAJES

// Registrar viajes: administradores y agentes
router.post(
  '/viajes',
  permitirRoles(1, 3),
  registrarViaje
);

// COMPRAS

// Consultar compras: administradores y contables
router.get(
  '/compras',
  permitirRoles(1, 2),
  obtenerCompras
);

// Registrar compras: administradores y contables
router.post(
  '/compras',
  permitirRoles(1, 2),
  cntrlCompras
);

// FACTURAS

// Consultar facturas: administradores y contables
router.get(
  '/facturas',
  permitirRoles(1, 2),
  obtenerFacturas
);

// Registrar facturas: administradores y contables
router.post(
  '/facturas',
  permitirRoles(1, 2),
  registrarFactura
);

export default router;
