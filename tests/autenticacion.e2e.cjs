// Navegador + Express reales; MySQL y entrega de correo son dobles de pruebas.
// No importa los modelos de producción ni conecta con Aiven o Resend.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

(async () => {
  const { crearEntornoAuth } = await import('../backend/tests/soporte/entornoAuth.js');
  const { createServer } = await import('vite');
  const env = await crearEntornoAuth();
  const api = env.app.listen(0, '127.0.0.1');
  await new Promise(resolve => api.once('listening', resolve));
  const base = `http://127.0.0.1:${api.address().port}`;
  const vite = await createServer({
    // Cubrir también la configuración pública con barra final.
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify(`${base}/`) },
    server: { host: '127.0.0.1', port: 5176, strictPort: true }
  });
  let browser;
  const salida = path.resolve('artifacts/portfolio-qa/autenticacion');
  mkdirSync(salida, { recursive: true });
  const errores = [], externos = [], consola = [], peticionesApi = [];
  try {
    await vite.listen();
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === base) peticionesApi.push(url.pathname);
      if (url.origin === base || url.origin === 'http://127.0.0.1:5176') return route.continue();
      externos.push(url.origin); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errores.push(error.message));
    page.on('console', msg => consola.push(msg.text()));
    const avisos = [];
    page.on('dialog', dialog => { avisos.push(dialog.message()); return dialog.accept(); });
    const anchoCorrecto = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const clave = 'Contraseña browser ficticia 123';
    const nueva = 'Nueva contraseña browser 456';
    await page.goto('http://127.0.0.1:5176/');
    const botonDemo = page.getByRole('button', { name: 'Entrar en modo Demo', exact: true });
    assert.equal(await botonDemo.getAttribute('type'), 'button');
    for (const width of [360, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await anchoCorrecto();
      await page.screenshot({ path: path.join(salida, `${width}-login-boton-demo.png`), animations: 'disabled' });
    }
    await botonDemo.click();
    await page.getByText('Bienvenido a Novasoft Demo', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('token')), null);
    assert.deepEqual(peticionesApi, []);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:5176/registro');
    for (const [label, value] of Object.entries({ Nombre: 'browser_cliente', DNI: 'FICTICIO',
      Contraseña: clave, 'Conf. Contraseña': clave, 'E-mail': 'browser@example.test',
      Teléfono: '000000000', Ciudad: 'Prueba', País: 'Prueba' })) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await page.waitForURL('http://127.0.0.1:5176/');
    const login = async password => {
      await page.getByPlaceholder('Nombre de usuario').fill('browser_cliente');
      await page.getByPlaceholder('Contraseña', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
      await page.waitForURL('http://127.0.0.1:5176/principal');
    };
    await login(clave);
    const anterior = await page.evaluate(() => sessionStorage.getItem('token'));
    const perfil = token => fetch(`${base}/perfil`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await (await perfil(anterior)).json()).rol, 4);
    // Entrar en demo no sustituye el JWT; un login posterior recupera el modo real.
    await page.goto('http://127.0.0.1:5176/demo');
    await page.getByText('Bienvenido a Novasoft Demo', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('token')), anterior);
    await page.goto('http://127.0.0.1:5176/');
    await login(clave);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('novasoft.demoLocal')), null);
    assert.equal(await page.getByText('Bienvenido a Novasoft Demo', { exact: true }).count(), 0);
    await page.goto('http://127.0.0.1:5176/');
    await page.getByText('¿Has olvidado tu contraseña?', { exact: true }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByLabel('E-mail', { exact: true }).waitFor();
    await anchoCorrecto();
    await page.screenshot({ path: path.join(salida, '390-solicitud.png'), animations: 'disabled' });
    await dialogo.getByLabel('E-mail', { exact: true }).fill('browser@example.test');
    await dialogo.getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.getByText('Si la cuenta admite recuperación, recibirás instrucciones por correo.', { exact: true }).waitFor();
    await env.recuperacion.esperarPendientes();
    assert.equal(env.mensajes.length, 1);
    const enlace = /http:\/\/127\.0\.0\.1:5176\/restablecer#token=([a-f0-9]{64})/.exec(env.mensajes[0].text);
    assert.ok(enlace);
    await page.goto(enlace[0]);
    await page.getByLabel('Contraseña', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    for (const width of [360, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await anchoCorrecto();
      await page.screenshot({ path: path.join(salida, `${width}-nueva-clave.png`), animations: 'disabled' });
    }
    await page.getByLabel('Contraseña', { exact: true }).fill(nueva);
    await page.getByLabel('Conf. Contraseña', { exact: true }).fill(nueva);
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.getByText('Contraseña actualizada. Inicia sesión de nuevo.', { exact: true }).waitFor();
    assert.equal((await perfil(anterior)).status, 401);
    await page.getByRole('link', { name: 'Inicia sesión aquí', exact: true }).click();
    await login(nueva);
    const actual = await page.evaluate(() => sessionStorage.getItem('token'));
    assert.equal((await (await perfil(actual)).json()).rol, 4);
    await page.goto('http://127.0.0.1:5176/principal/trabajadores');
    await page.waitForURL('http://127.0.0.1:5176/principal');
    await page.goto(enlace[0]);
    await page.getByText('El enlace no es válido o ha caducado.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Contraseña', { exact: true }).count(), 0);
    // API apagada o respuesta de proxy: errores de interfaz controlados.
    const temporal = 'El servicio de autenticación no está disponible temporalmente. Inténtalo más tarde.';
    await context.route(`${base}/auth/password-reset/request`, route => route.fulfill({
      status: 502, contentType: 'text/html', body: '<html>Servicio no disponible</html>'
    }));
    await page.goto('http://127.0.0.1:5176/');
    await page.getByText('¿Has olvidado tu contraseña?', { exact: true }).click();
    await page.getByRole('dialog').getByLabel('E-mail', { exact: true }).fill('browser@example.test');
    await page.getByRole('dialog').getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.getByText(temporal, { exact: true }).waitFor();
    await context.route(`${base}/register`, route => route.abort());
    await page.goto('http://127.0.0.1:5176/registro');
    for (const [label, value] of Object.entries({ Nombre: 'sin_red', DNI: 'FICTICIO', Contraseña: clave,
      'Conf. Contraseña': clave, 'E-mail': 'sinred@example.test', Teléfono: '000', Ciudad: 'Prueba', País: 'Prueba' })) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('button.ant-btn-loading'));
    assert.equal(avisos.at(-1), `Error: ${temporal}`);
    assert.equal(consola.some(line => [clave, nueva, enlace[1], anterior, actual].some(secret => line.includes(secret))), false);
    assert.deepEqual(errores, []); assert.deepEqual(externos, []);
    const resultado = { registroYLogin: true, rolCliente: true, solicitudYRestablecimiento: true,
      revocacionSesionAnterior: true, tokenReutilizadoDenegado: true, sinSecretosEnConsola: true,
      botonDemoSinFormularioNiApi: true, apiApagadaControlada: true,
      anchos: [360, 390, 430, 768, 1440], errores, solicitudesExternas: externos,
      dependencias: 'MySQL y entrega de correo simulados; no es una prueba de producción' };
    writeFileSync(path.join(salida, 'resultados.json'), JSON.stringify(resultado, null, 2));
    console.log(JSON.stringify(resultado));
  } finally {
    await env.recuperacion.esperarPendientes();
    if (browser) await browser.close();
    await vite.close();
    api.closeAllConnections(); await new Promise(resolve => api.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
