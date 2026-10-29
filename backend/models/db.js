
import mysql from 'mysql2';
import { configuracionDB } from './configuracionDB.js';

export const con = mysql.createConnection(configuracionDB());
// Pool independiente: una transacción de recuperación nunca comparte la
// conexión de las operaciones administrativas existentes.
export const poolRecuperacion = mysql.createPool({ ...configuracionDB(), connectionLimit: 4, queueLimit: 50 });
