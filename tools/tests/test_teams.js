const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const three = fs.readFileSync(process.argv[2]);
  const html = fs.readFileSync(process.argv[3], 'utf8');
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + html + '</body></html>', { waitUntil: 'load', timeout: 120000 });
  try { await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 90000 }); } catch (e) { console.log('BOOT FAIL', errs.join('\n')); await browser.close(); return; }
  await page.click('[data-go="vSplit"]'); await page.click('#nSeg [data-n="4"]'); await page.click('#mSeg [data-m="1"]');
  await page.click('#slots .teambtn >> nth=2'); // J3 -> Chantenaysiens? toggles
  await page.screenshot({ path: process.argv[4] + '_menu.png' });
  await page.click('#splitGo');
  await page.waitForTimeout(1500);
  const st = await page.evaluate(() => { const g = window.__gm; return { locals: g.locals().map(L => ({ t: L.team, x: L.car.x | 0, z: L.car.z | 0, col: L.colour })), bots: g.rivals().map(r => ({ t: r.team, x: r.x | 0, z: r.z | 0 })) }; });
  console.log(JSON.stringify(st));
  // friendly fire test: put J2 right in front of J1 (same team?) and shoot
  const ff = await page.evaluate(() => {
    const L = __gm.locals(); const a = L[0].car;
    const mate = L.find(x => x !== L[0] && x.team === L[0].team), foe = L.find(x => x.team !== L[0].team);
    const res = {};
    for (const [k, o] of [['mate', mate], ['foe', foe]]) { if (!o) continue; o.car.hp = 100; o.car.place(a.x + a.fwd[0] * 10, a.z + a.fwd[1] * 10, a.h); }
    return { mate: !!mate, foe: !!foe };
  });
  await page.keyboard.down('Space'); await page.waitForTimeout(150); await page.keyboard.up('Space');
  await page.waitForTimeout(300); console.log('ff', JSON.stringify(ff), JSON.stringify(await page.evaluate(() => __gm.locals().map(L => L.car.hp))));
  const ff2 = await page.evaluate(() => { const L = __gm.locals(); const a = L[1].car, m = L[2].car; m.hp = 100; m.place(a.x + a.fwd[0] * 10, a.z + a.fwd[1] * 10, a.h); L[0].car.place(L[0].spawn[0], L[0].spawn[1], L[0].spawn[2]); return [L[1].team, L[2].team]; });
  await page.keyboard.down('Enter'); await page.keyboard.down('ShiftRight'); await page.keyboard.down('Slash'); await page.keyboard.down('Period'); await page.waitForTimeout(400); await page.keyboard.up('Slash'); await page.keyboard.up('Period'); await page.keyboard.up('Enter'); await page.keyboard.up('ShiftRight');
  console.log('ff2 teams', ff2, JSON.stringify(await page.evaluate(() => __gm.locals().map(L => L.car.hp))));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(4000); await page.keyboard.up('KeyW');
  await page.screenshot({ path: process.argv[4] + '_game.png' });
  await page.keyboard.down('Tab'); await page.waitForTimeout(700); await page.screenshot({ path: process.argv[4] + '_board.png' }); await page.keyboard.up('Tab');
  console.log(errs.slice(0, 10).join('\n'));
  await browser.close();
})();
