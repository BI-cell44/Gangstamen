const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const three = fs.readFileSync(process.argv[2]);
  const html = fs.readFileSync(process.argv[3], 'utf8'); const out = process.argv[4];
  const times = (process.argv[5] || '1.5,4,7,9.5,12,14.5,17,20,22,24.5,26.5,27.6,28.3,28.75,29.3,31,33').split(',').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + html + '</body></html>', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 });
  if (await page.evaluate(() => !!__gm.hd)) await page.evaluate(() => __gm.hd.setQuality(1));
  await page.waitForTimeout(1500);
  console.log('state', await page.evaluate(() => [__gm.Intro.state, document.getElementById('title').hidden]));
  await page.screenshot({ path: out + '-splash.png' });
  await page.evaluate(() => { window.__introT = 0.01; });
  await page.keyboard.press('KeyA');
  await page.waitForTimeout(1500);
  console.log('state', await page.evaluate(() => __gm.Intro.state));
  for (const t of times) {
    await page.evaluate(t => { window.__trHold = t > 25 && t < 28.7; window.__introT = t; }, t);
    await page.waitForTimeout(t > 28.6 && t < 29 ? 900 : 2600);
    await page.screenshot({ path: out + '-' + String(t).replace('.', '_') + '.png' });
  }
  await page.evaluate(() => { window.__introT = 40; });
  await page.waitForTimeout(2500);
  console.log('end', await page.evaluate(() => [__gm.Intro.state, document.getElementById('title').hidden, document.getElementById('intro').hidden, __gm.rivals().length, __gm.rivals()[0].mesh.visible]));
  await page.screenshot({ path: out + '-menu.png' });
  await page.evaluate(() => { __gm.start(); }); await page.waitForTimeout(2500);
  console.log('game', await page.evaluate(() => [__gm.Intro.state, __gm.locals().length]));
  console.log([...new Set(errs)].join('\n') || 'no errors');
  await browser.close();
})();
