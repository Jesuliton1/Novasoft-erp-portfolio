import process from 'node:process';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

import { con } from './models/db.js';
import router from './routes/rutas.js';

const app = express();

const PORT = process.env.PORT || 5000;

// Uso exclusivamente local: no confiar en cabeceras de proxy del cliente.
app.set('trust proxy', false);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

// Origenes permitidos
const origenesPermitidos = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: origenesPermitidos,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));

// Limitar intentos de inicio de sesion
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    message: 'Demasiados intentos. Prueba de nuevo en 15 minutos.'
  }
});

// Aplicar el limite antes de las rutas
app.use('/login', limitarLogin);

// Comprobar que el servidor responde
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend ERP funcionando'
  });
});

// Conexion a MySQL
con.connect((err) => {
  if (err) {
    console.error('Error de conexion a MySQL:', err.code);
  } else {
    console.log('Conectado correctamente a MySQL');
  }
});

// Rutas del ERP
app.use('/', router);

// Arrancar el servidor
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor ejecutandose en puerto ${PORT}`);
});
