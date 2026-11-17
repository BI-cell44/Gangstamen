// (17 nov.) online race (arg 4) or king of the hill (arg 3) with two pages: run the server of the 'server' branch first,
// GAME_HTML=gangstamen-ultra.html PORT=8099 node server.js, then node tools/tests/test_online_race.js 4
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const three = fs.readFileSync(__dirname + '/three.min.js');
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const mk = async (name) => {
    const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
    const errs = []; page.on('pageerror', e => errs.push(name + ' pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(name + ' ' + m.text().slice(0, 200)); });
    await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: three, contentType: 'application/javascript' }));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.addInitScript(() => { window.__noIntro = true; });
    await page.goto('http://localhost:8099/', { waitUntil: 'load', timeout: 600000 });
    await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 600000 });
    await page.evaluate(() => __gm.hd.setQuality(0));
    page.errs = errs; return page;
  };
  const A = await mk('A'), B = await mk('B');
  const kind = +(process.argv[2] || 4);
  await A.evaluate(k => { const s = __gm.settings; s.netGmode = k; s.raceLaps = 2; s.goalHill = 30; s.limit = 10; document.querySelector('[data-go="vOnline"]').click(); document.getElementById('nick').value = 'Alice'; document.getElementById('create').click(); }, kind);
  await A.waitForTimeout(4000);
  await B.evaluate(() => { document.querySelector('[data-go="vOnline"]').click(); document.getElementById('nick').value = 'Bob'; });
  await B.waitForSelector('#games button', { timeout: 60000 });
  console.log('B sees:', await B.textContent('#games'));
  await B.evaluate(() => document.querySelector('#games button').click());
  await B.waitForTimeout(6000);
  const info = p => p.evaluate(() => { const g = __gm.gx.gmState, L = __gm.locals()[0]; return { host: __gm.Net.isHost, gmode: __gm.gx.gmode, goal: __gm.Match.goal, laps: g && g.laps, clock: document.getElementById('clock').textContent, pos: [L.car.x | 0, L.car.z | 0, +L.car.h.toFixed(2)], tgt: __gm.gx.modeTarget(L), remotes: [...__gm.Net.remotes.values()].map(R => [R.nick, R.kills]) }; });
  console.log('A', JSON.stringify(await info(A))); console.log('B', JSON.stringify(await info(B)));
  if (kind === 4) {
    await B.evaluate(() => { const L = __gm.locals()[0]; for (let i = 0; i < 40; i++) __gm.step(0.1); });
    for (let k = 0; k < 16; k++) {
      await B.evaluate(() => { const L = __gm.locals()[0], t = __gm.gx.modeTarget(L); if (t) { L.car.place(t.x, t.z, 0); for (let i = 0; i < 3; i++) __gm.step(0.05); } });
    }
    console.log('B after', JSON.stringify(await B.evaluate(() => [__gm.locals()[0].cp, document.querySelector('#objective .oText').textContent])));
    await A.waitForTimeout(8000);
    const end = p => p.evaluate(() => [__gm.Match.over, document.getElementById('resTitle').textContent, document.getElementById('resSub').textContent, document.querySelector('#objective .oText').textContent]);
    console.log('A end', JSON.stringify(await end(A))); console.log('B end', JSON.stringify(await end(B)));
  }
  await A.screenshot({ path: 'onl_A.png' }); await B.screenshot({ path: 'onl_B.png' });
  console.log([...new Set([...A.errs, ...B.errs])].slice(0, 10).join('\n') || 'no errors');
  await browser.close();
})();
