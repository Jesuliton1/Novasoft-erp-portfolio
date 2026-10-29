import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { correoValido, contraseñaValida } from '../security/validacion.js';

const generico = { message: 'Si la cuenta admite recuperación, recibirás instrucciones por correo.' };
const invalido = { message: 'El enlace no es válido o ha caducado.' };
const protegido = (user) => ['administrador_ficticio', 'demo_local'].includes(user.nombre?.trim().toLowerCase());
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const tokenValido = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

// pool: mysql2/promise. Cada transacción usa una conexión exclusiva.
export const crearRecuperacion = ({ pool, correo, informarError = () => {} }) => {
  const pendientes = new Set();
  const disponible = (res) => {
    res.set?.('Cache-Control', 'no-store');
    if (correo.configurado) return true;
    res.status(503).json({ message: 'La recuperación no está configurada todavía.' });
    return false;
  };
  const emitir = async (email) => {
    const db = await pool.getConnection();
    let token, digest;
    try {
      await db.beginTransaction();
      const [usuarios] = await db.execute('SELECT idUsuario, nombre, correo FROM usuario WHERE correo = ? FOR UPDATE', [email]);
      if (usuarios.length !== 1 || protegido(usuarios[0])) { await db.rollback(); return; }
      const user = usuarios[0];
      const [recientes] = await db.execute(`SELECT userId FROM password_reset_tokens
        WHERE userId = ? AND requestedAt > DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 60 SECOND)`, [user.idUsuario]);
      if (recientes.length) { await db.rollback(); return; }
      token = randomBytes(32).toString('hex');
      digest = hashToken(token);
      await db.execute(`INSERT INTO password_reset_tokens (userId, tokenHash, expiresAt, requestedAt, usedAt)
        VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE), UTC_TIMESTAMP(3), NULL)
        ON DUPLICATE KEY UPDATE tokenHash = VALUES(tokenHash), expiresAt = VALUES(expiresAt),
          requestedAt = VALUES(requestedAt), usedAt = NULL`, [user.idUsuario, digest]);
      await db.commit();
      await correo.enviar(user.correo, token);
    } catch {
      try { await db.rollback(); } catch { /* No detalles privados. */ }
      if (digest) {
        try { await db.execute('UPDATE password_reset_tokens SET usedAt = UTC_TIMESTAMP(3) WHERE tokenHash = ?', [digest]); }
        catch { /* Caduca igualmente. */ }
      }
      informarError('No se pudo completar una solicitud de recuperación.');
    } finally { db.release(); }
  };
  const solicitar = (req, res) => {
    if (!disponible(res)) return;
    if (pendientes.size >= 50) return res.status(503).json({ message: 'La recuperación no está disponible temporalmente.' });
    const email = typeof req.body?.correo === 'string' ? req.body.correo.trim() : '';
    if (!correoValido(email)) return res.status(400).json({ message: 'Introduce un correo válido.' });
    // 202 antes de consultar la cuenta: ni el contenido ni el tiempo dependen
    // de su existencia. Aceptar una tarea no confirma la entrega de un correo.
    const tarea = Promise.resolve().then(() => emitir(email)).catch(() => {
      informarError('No se pudo completar una solicitud de recuperación.');
    });
    pendientes.add(tarea);
    tarea.finally(() => pendientes.delete(tarea));
    return res.status(202).json(generico);
  };
  const validar = async (req, res) => {
    if (!disponible(res)) return;
    if (!tokenValido(req.body?.token)) return res.status(400).json(invalido);
    try {
      const [rows] = await pool.execute(`SELECT u.nombre FROM password_reset_tokens t
        JOIN usuario u ON u.idUsuario = t.userId
        WHERE t.tokenHash = ? AND t.usedAt IS NULL AND t.expiresAt > UTC_TIMESTAMP(3)`, [hashToken(req.body.token)]);
      if (rows.length !== 1 || protegido(rows[0])) return res.status(400).json(invalido);
      return res.json({ valido: true });
    } catch { return res.status(503).json({ message: 'La recuperación no está disponible temporalmente.' }); }
  };
  const confirmar = async (req, res) => {
    if (!disponible(res)) return;
    const { token, contraseña } = req.body || {};
    if (!tokenValido(token)) return res.status(400).json(invalido);
    if (!contraseñaValida(contraseña)) return res.status(400).json({ message: 'La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes.' });
    let db;
    try {
      const digest = hashToken(token);
      const [candidatos] = await pool.execute(`SELECT userId FROM password_reset_tokens
        WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > UTC_TIMESTAMP(3)`, [digest]);
      if (candidatos.length !== 1) return res.status(400).json(invalido);
      const hash = await bcrypt.hash(contraseña, 12);
      db = await pool.getConnection();
      await db.beginTransaction();
      // Mismo orden de bloqueo en solicitud y consumo: usuario, luego token.
      const [users] = await db.execute('SELECT idUsuario, nombre FROM usuario WHERE idUsuario = ? FOR UPDATE', [candidatos[0].userId]);
      if (users.length !== 1 || protegido(users[0])) { await db.rollback(); return res.status(400).json(invalido); }
      const [tokens] = await db.execute(`SELECT userId FROM password_reset_tokens
        WHERE userId = ? AND tokenHash = ? AND usedAt IS NULL
        AND expiresAt > UTC_TIMESTAMP(3) FOR UPDATE`, [users[0].idUsuario, digest]);
      if (tokens.length !== 1) { await db.rollback(); return res.status(400).json(invalido); }
      await db.execute('UPDATE usuario SET contraseña = ? WHERE idUsuario = ?', [hash, users[0].idUsuario]);
      const [result] = await db.execute(`UPDATE password_reset_tokens SET usedAt = UTC_TIMESTAMP(3)
        WHERE userId = ? AND tokenHash = ? AND usedAt IS NULL`, [users[0].idUsuario, digest]);
      if (result.affectedRows !== 1) throw new Error();
      await db.commit();
      return res.json({ message: 'Contraseña actualizada. Inicia sesión de nuevo.' });
    } catch {
      if (db) { try { await db.rollback(); } catch { /* Sin datos privados. */ } }
      return res.status(503).json({ message: 'La recuperación no está disponible temporalmente.' });
    } finally { db?.release(); }
  };
  return { solicitar, validar, confirmar, esperarPendientes: () => Promise.all([...pendientes]) };
};
