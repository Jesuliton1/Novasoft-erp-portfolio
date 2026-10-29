import process from 'node:process';

export const configurarCorreo = (env = process.env, peticion = async () => { throw new Error('EXTERNAL_MAIL_DISABLED_IN_PORTFOLIO'); }) => {
  let origen;
  try {
    const url = new URL(env.PUBLIC_APP_URL);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        (url.protocol !== 'https:' && !(env.NODE_ENV !== 'production' &&
          url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error();
    origen = url.origin;
  } catch { origen = null; }
  const configurado = env.PASSWORD_RESET_ENABLED === 'true' && Boolean(origen &&
    env.RESEND_API_KEY && env.RESET_EMAIL_FROM && !/[\r\n]/.test(env.RESET_EMAIL_FROM));
  return {
    configurado,
    async enviar(correo, token) {
      if (!configurado) throw new Error('MAIL_NOT_CONFIGURED');
      const enlace = `${origen}/restablecer#token=${token}`;
      const response = await peticion('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.RESET_EMAIL_FROM, to: [correo],
          subject: 'Novasoft — Recuperación de contraseña',
          text: `Para establecer una nueva contraseña abre este enlace:\n${enlace}\n\nCaduca en 15 minutos y sólo puede utilizarse una vez. Si no lo solicitaste, ignora este mensaje.`
        })
      });
      if (!response.ok) throw new Error('MAIL_DELIVERY_NOT_ACCEPTED');
    }
  };
};
