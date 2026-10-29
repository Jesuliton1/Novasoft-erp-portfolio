import { con } from '../models/db.js';
import { crearVerificadorToken } from '../security/autenticacion.js';

export const verificarToken = crearVerificadorToken(con);
export { permitirRoles } from '../security/autenticacion.js';
