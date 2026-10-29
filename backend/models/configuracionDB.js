import 'dotenv/config';
import process from 'node:process';

// Esta copia sólo permite una BD local expresamente habilitada.
// La demo y las pruebas con dobles no importan este módulo.
export const configuracionDB = (env = process.env) => {
  if (env.NOVASOFT_LOCAL_BACKEND !== 'true') throw new Error('BACKEND_LOCAL_DISABLED');
  if (!['127.0.0.1', 'localhost', '::1'].includes(env.DB_HOST)) throw new Error('LOCAL_DATABASE_REQUIRED');
  if (!env.DB_USER || !env.DB_PASSWORD || !env.DB_NAME || !env.JWT_SECRET ||
      env.JWT_SECRET.length < 32 || /fictici|cambiar|example/i.test(env.JWT_SECRET)) {
    throw new Error('LOCAL_CONFIGURATION_REQUIRED');
  }
  return { host: env.DB_HOST, user: env.DB_USER, password: env.DB_PASSWORD,
    database: env.DB_NAME, port: Number(env.DB_PORT || 3306), connectTimeout: 10000 };
};
