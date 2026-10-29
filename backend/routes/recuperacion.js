import express from 'express';
import { rateLimit } from 'express-rate-limit';

export const rutasRecuperacion = (servicio) => {
  const router = express.Router();
  const limitar = (limit) => rateLimit({ windowMs: 15 * 60 * 1000, limit,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Demasiados intentos. Prueba de nuevo en 15 minutos.' }
  });
  router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.post('/request', limitar(5), servicio.solicitar);
  router.post('/validate', limitar(30), servicio.validar);
  router.post('/confirm', limitar(10), servicio.confirmar);
  return router;
};
