// Prueba de la build estática: sólo loopback; no inicia Express ni MySQL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const { preview } = await import('vite');
  const server = await preview({ preview: { host: '127.0.0.1', port: 5189, strictPort: true } });
  let browser;
  const salida = path.resolve('artifacts/portfolio-qa/publica');
  fs.mkdirSync(salida, { recursive: true });
  const externos = [], errores = [], resultados = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-background-networking'] });
    for (const width of [360, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      await context.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.origin === 'http://127.0.0.1:5189') return route.continue();
        externos.push(u.origin); return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', e => errores.push(e.message));
      await page.goto('http://127.0.0.1:5189/');
      const boton = page.getByRole('button', { name: 'Entrar en modo Demo', exact: true });
      await boton.waitFor();
      if (width === 390) await page.screenshot({ path: path.join(salida, 'login-390.png'), fullPage: true });
      await boton.click();
      await page.getByText('Bienvenido a Novasoft Demo', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => sessionStorage.getItem('token')), null);
      for (const modulo of ['', '/trabajadores', '/regviajes', '/compras', '/facturas', '/lista', '/soporteYayuda']) {
        await page.goto('http://127.0.0.1:5189/principal' + modulo);
        await page.locator('.content-box').waitFor();
        await page.waitForTimeout(300);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (width === 1440 && ['', '/trabajadores', '/compras'].includes(modulo)) await page.screenshot({ path: path.join(salida, (modulo.slice(1) || 'inicio') + '-1440.png'), fullPage: true });
        if (modulo === '/compras') {
          await page.locator('input[type="number"]').first().fill('3');
          await page.getByText('Total: 450,00 €', { exact: true }).waitFor();
        }
        if (modulo === '/trabajadores') assert.equal(await page.getByRole('button', { name: 'Añadir Trabajador' }).isDisabled(), true);
        if (modulo === '/facturas') {
          const descarga = page.waitForEvent('download');
          await page.getByRole('button', { name: 'Descargar PDF de demostración' }).click();
          const download = await descarga;
          assert.equal(download.suggestedFilename(), 'Novasoft_Reserva_Demo.pdf');
          const pdf = fs.readFileSync(await download.path());
          assert.ok(pdf.subarray(0, 5).toString() === '%PDF-');
          assert.ok(pdf.toString('latin1').includes('Cliente Ejemplo'));
        }
        resultados.push({ width, modulo: modulo || 'inicio' });
      }
      await page.evaluate(() => sessionStorage.clear());
      await page.goto('http://127.0.0.1:5189/principal/trabajadores');
      await page.waitForURL('http://127.0.0.1:5189/');
      await context.close();
    }
    assert.deepEqual(errores, []); assert.deepEqual(externos, []);
    const resultado = { vistas: resultados.length, calculadora: true, pdfFicticio: true, altaDemoBloqueada: true, redireccionSinSesion: true, errores, solicitudesExternas: externos };
    fs.writeFileSync(path.join(salida, 'resultados.json'), JSON.stringify(resultado, null, 2));
    console.log(JSON.stringify(resultado));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.httpServer.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
