const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const three = fs.readFileSync(process.argv[2]);
  const html = fs.readFileSync(process.argv[3], 'utf8'); const out = process.argv[4];
  const shots = (process.argv[5] || 'title,game,car,front,night,boom').split(',');
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 400)); });
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + html + '</body></html>', { waitUntil: 'load', timeout: 120000 });
  try { await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 120000 }); } catch (e) { console.log('BOOT FAIL\n' + errs.join('\n')); return browser.close(); }
  const snap = async n => { await page.waitForTimeout(1200); await page.screenshot({ path: out + '_' + n + '.png' }); };
  await page.evaluate(q => __gm.hd.setQuality(q), +(process.argv[6] || 1));
  if (shots.includes('title')) await snap('title');
  console.log('pre-start errs:', [...new Set(errs)].slice(0, 8).join(' | '));
  await page.evaluate(() => document.getElementById('start').click()); await page.waitForTimeout(4000);
  const hide = () => page.evaluate(() => { document.querySelectorAll('.hud, #logo, #scan').forEach(e => e.style.visibility = 'hidden'); });
  if (shots.includes('game')) await snap('game');
  await hide();
  if (shots.includes('car')) { await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd; window.__cam = [-f[0] * 5.5 - f[1] * 3.2, 1.9, -f[1] * 5.5 + f[0] * 3.2]; }); await snap('car'); }
  if (shots.includes('front')) { await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd; window.__cam = [f[0] * 5 + f[1] * 3.4, 1.5, f[1] * 5 - f[0] * 3.4]; }); await snap('front'); }
  if (shots.includes('side')) { await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd; window.__cam = [-f[1] * 6, 1.2, f[0] * 6]; }); await snap('side'); }
  if (shots.includes('bot')) { await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd, r = __gm.rivals()[1]; r.place(c.x + f[0] * 7, c.z + f[1] * 7, c.h + 2.2); r.ai.mode = 'cruise'; window.__cam = [-f[0] * 2 - f[1] * 5, 2.4, -f[1] * 2 + f[0] * 5]; }); await snap('bot'); }
  if (shots.includes('night')) { await page.keyboard.press('KeyN'); await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd; window.__cam = [-f[0] * 7 - f[1] * 2.5, 2.4, -f[1] * 7 + f[0] * 2.5]; }); await snap('night'); await page.evaluate(() => { window.__cam = null; }); await snap('night2'); await page.keyboard.press('KeyN'); }
  if (shots.includes('boom')) {
    await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd, r = __gm.rivals()[0]; r.place(c.x + f[0] * 16, c.z + f[1] * 16, c.h + 1); window.__cam = null; });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const r = __gm.rivals()[0]; r.hp = 1; });
    await page.keyboard.down('Space'); await page.waitForTimeout(900); await page.keyboard.up('Space');
    await page.screenshot({ path: out + '_boom.png' }); await page.waitForTimeout(1500); await page.screenshot({ path: out + '_boom2.png' });
  }
  if (shots.includes('fx')) {
    await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd; window.__cam = [-f[0] * 9 - f[1] * 4, 3, -f[1] * 9 + f[0] * 4]; __gm.hd.explode(c.x + f[0] * 9, c.z + f[1] * 9); });
    for (let k = 0; k < 4; k++) { await page.waitForTimeout(k ? 900 : 250); await page.screenshot({ path: out + '_fx' + k + '.png' }); }
  }
  if (shots.includes('drift')) {
    await page.evaluate(() => { window.__cam = null; });
    await page.keyboard.down('KeyW'); await page.waitForTimeout(9000);
    await page.keyboard.down('KeyA'); await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(2500);
    await page.screenshot({ path: out + '_drift.png' });
    await page.keyboard.up('KeyA'); await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
  }
  if (shots.includes('dmg')) {
    await page.evaluate(() => { const c = __gm.locals()[0].car, f = c.fwd; c.hp = 15; window.__cam = [f[0] * 6 + f[1] * 3, 1.8, f[1] * 6 - f[0] * 3]; });
    await page.waitForTimeout(5000); await page.screenshot({ path: out + '_dmg.png' });
  }
  if (shots.includes('shops')) { // place Jean Macé and the town hall end of the boulevard, where the real shops are
    for (const [n, x, z, h, cam] of [['macé', 62, 268, 0, [-9, 4.5, 10]], ['macé2', 52, 300, 1.6, [10, 4, 9]], ['mairie', 181, -455, 0, [-12, 5, 6]], ['street', -120, 80, 0.5, [0, 3.2, 9]]]) {
      await page.evaluate(([x, z, h, cam]) => { const c = __gm.locals()[0].car; c.place(x, z, h); window.__cam = cam; }, [x, z, h, cam]);
      await page.waitForTimeout(2500); await page.screenshot({ path: out + '_' + n + '.png' });
    }
  }
  if (shots.includes('mairie')) {
    for (const [n, x, z, h, cam] of [['front', 142, -442, 1.4, [26, 6, 3]], ['close', 138, -440, 1.4, [10, 2.2, 4]], ['side', 138, -464, 0.6, [20, 9, -16]]]) {
      await page.evaluate(([x, z, h, cam]) => { const c = __gm.locals()[0].car; c.place(x, z, h); window.__cam = cam; }, [x, z, h, cam]);
      await page.waitForTimeout(2500); await page.screenshot({ path: out + '_m' + n + '.png' });
    }
    await page.keyboard.press('KeyN'); await page.evaluate(() => { const c = __gm.locals()[0].car; c.place(142, -442, 1.4); window.__cam = [26, 6, 3]; }); await page.waitForTimeout(3000); await page.screenshot({ path: out + '_mnight.png' }); await page.keyboard.press('KeyN');
  }
  console.log([...new Set(errs)].slice(0, 12).join('\n') || 'no errors');
  await browser.close();
})();
