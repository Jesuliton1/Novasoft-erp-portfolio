import { con } from '../models/db.js';
import { crearLogin } from './login.js';

export const login = crearLogin(con);
