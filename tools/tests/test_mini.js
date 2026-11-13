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
  if (await page.evaluate(() => !!__gm.hd)) await page.evaluate(() => __gm.hd.setQuality(0));
  await page.evaluate(() => document.getElementById('start').click()); await page.waitForTimeout(3500);
  // put the six bots at increasing distances around the player
  await page.evaluate(() => { const c = __gm.locals()[0].car; __gm.rivals().forEach((r, i) => { const a = i * 1.05, d = 120 + i * 90; r.place(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, 0); r.ai.mode = 'cruise'; }); });
  await page.waitForTimeout(2500);
  const box = await page.evaluate(() => { const m = document.querySelector('canvas.mini, #mini, .minimap canvas, canvas[id*=mini]'); if (!m) return null; const r = m.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  console.log(JSON.stringify(box));
  if (box) await page.screenshot({ path: out + '.png', clip: { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: box.w + 20, height: box.h + 20 } });
  else await page.screenshot({ path: out + '.png' });
  console.log([...new Set(errs)].join('\n') || 'no errors');
  await browser.close();
})();
