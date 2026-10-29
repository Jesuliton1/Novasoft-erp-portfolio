// Doble de mysql2: estado ficticio, restricciones y bloqueo transaccional.
// No importa dotenv ni los modelos de producción, no crea conexiones de red.
export const crearMysqlMemoria = (usuarios = []) => {
  const state = { usuarios: structuredClone(usuarios), tokens: [], ahora: Date.now(), unique: true };
  let cola = Promise.resolve();
  let fallarConsumo = false;
  const ejecutar = (data, sql, values = []) => {
    sql = sql.replace(/\s+/g, ' ').trim();
    if (sql.includes('information_schema')) return [[...(state.unique ? [{ INDEX_NAME: 'nombre_unico' }] : [])]];
    if (sql.startsWith('INSERT INTO usuario')) {
      if (data.usuarios.some(u => u.nombre === values[0] || u.correo === values[3])) {
        throw Object.assign(new Error('duplicado ficticio'), { code: 'ER_DUP_ENTRY' });
      }
      data.usuarios.push({ idUsuario: data.usuarios.length + 1, nombre: values[0], dni: values[1],
        contraseña: values[2], correo: values[3], telefono: values[4], ciudad: values[5], pais: values[6], idClase: values[7] });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT') && sql.includes('FROM usuario')) {
      const key = sql.includes('WHERE correo') ? 'correo' : sql.includes('WHERE nombre') ? 'nombre' : 'idUsuario';
      return [structuredClone(data.usuarios.filter(u => u[key] === values[0]))];
    }
    if (sql.startsWith('INSERT INTO password_reset_tokens')) {
      data.tokens = data.tokens.filter(t => t.userId !== values[0]);
      data.tokens.push({ userId: values[0], tokenHash: values[1], expiresAt: state.ahora + 900000, requestedAt: state.ahora, usedAt: null });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT') && sql.includes('password_reset_tokens')) {
      let rows = data.tokens.filter(t => {
        if (sql.includes('requestedAt >')) return t.userId === values[0] && t.requestedAt > state.ahora - 60000;
        return (sql.includes('WHERE userId =') ? t.userId === values[0] && t.tokenHash === values[1] : t.tokenHash === values[0]) &&
          t.usedAt === null && t.expiresAt > state.ahora;
      });
      if (sql.includes('JOIN usuario')) rows = rows.map(t => data.usuarios.find(u => u.idUsuario === t.userId)).filter(Boolean);
      return [structuredClone(rows)];
    }
    if (sql.startsWith('UPDATE usuario')) {
      const user = data.usuarios.find(u => u.idUsuario === values[1]);
      if (user) user.contraseña = values[0];
      return [{ affectedRows: user ? 1 : 0 }];
    }
    if (sql.startsWith('UPDATE password_reset_tokens')) {
      if (fallarConsumo) { fallarConsumo = false; throw new Error('fallo ficticio'); }
      const rows = data.tokens.filter(t => values.length === 1 ? t.tokenHash === values[0]
        : t.userId === values[0] && t.tokenHash === values[1] && t.usedAt === null);
      rows.forEach(t => { t.usedAt = state.ahora; });
      return [{ affectedRows: rows.length }];
    }
    throw new Error(`Consulta no prevista en el doble: ${sql.split(' ').slice(0, 4).join(' ')}`);
  };
  const pool = {
    async execute(sql, values) { return ejecutar(state, sql, values); },
    async getConnection() {
      let working, liberar;
      return {
        async beginTransaction() {
          const anterior = cola;
          cola = new Promise(resolve => { liberar = resolve; });
          await anterior;
          working = structuredClone(state);
        },
        async execute(sql, values) { return ejecutar(working || state, sql, values); },
        async commit() {
          state.usuarios = working.usuarios; state.tokens = working.tokens;
          working = null; liberar?.(); liberar = null;
        },
        async rollback() { working = null; liberar?.(); liberar = null; },
        release() { liberar?.(); }
      };
    }
  };
  const callbackDB = { execute(sql, values, callback) {
    pool.execute(sql, values).then(([rows]) => callback(null, rows)).catch(error => callback(error));
  } };
  return { pool, callbackDB, state, fallarConsumo: () => { fallarConsumo = true; } };
};
