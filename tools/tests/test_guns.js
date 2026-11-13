const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const three = fs.readFileSync(process.argv[2]);
  const html = fs.readFileSync(process.argv[3], 'utf8'); const out = process.argv[4];
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + html + '</body></html>', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
  if (await page.evaluate(() => !!(__gm.hd))) await page.evaluate(() => __gm.hd.setQuality(1));
  await page.evaluate(() => document.getElementById('start').click()); await page.waitForTimeout(4000);
  await page.evaluate(() => { document.querySelectorAll('.hud, #logo, #scan').forEach(e => e.style.visibility = 'hidden'); const c = __gm.locals()[0].car, f = c.fwd; window.__cam = [f[0] * 3.2 - f[1] * 3.6, 1.7, f[1] * 3.2 + f[0] * 3.6]; });
  await page.waitForTimeout(1200);
  // where do the shots start, relative to the car?
  const rel = await page.evaluate(() => {
    const c = __gm.locals()[0].car, [fx, fz] = c.fwd, rx = -fz, rz = fx, out = [];
    for (let k = 0; k < 2; k++) { const [x, y, z] = __gm.muzzleOf(c); const dx = x - c.x, dz = z - c.z; out.push({ fwd: +(dx * fx + dz * fz).toFixed(2), side: +(dx * rx + dz * rz).toFixed(2), up: +(y - c.mesh.position.y).toFixed(2) }); }
    return out;
  });
  console.log('muzzles relative to car', JSON.stringify(rel));
  for (const [k, cam] of [['side', [3.2, -3.6, 1.7]], ['chase', null]]) {
    await page.evaluate(cam => { window.__trHold = false; const c = __gm.locals()[0].car, f = c.fwd; window.__cam = cam ? [f[0] * cam[0] + f[1] * cam[1], cam[2], f[1] * cam[0] - f[0] * cam[1]] : null; }, cam);
    await page.waitForTimeout(3000);
    await page.evaluate(() => { const g = __gm, c = g.locals()[0].car; g.shoot(c, [], 0, 95, 0.02, false); g.shoot(c, [], 0, 95, 0.02, false); window.__trHold = true; });
    await page.waitForTimeout(3000); await page.screenshot({ path: out + '_' + k + '.png' });
  }
  console.log([...new Set(errs)].join('\n') || 'no errors');
  await browser.close();
})();
