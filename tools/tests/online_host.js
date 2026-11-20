// online: the host leaves during the game; the guest becomes the host, runs the Rapaces and keeps the game open.
// Run from /home/claude/t; Node server on port 8099.
const fs = require('fs'); const { chromium } = require('playwright');
let fails = 0; const ok = (c, msg, extra) => { if (!c) fails++; console.log(c ? 'OK  ' : 'FAIL', msg, extra !== undefined ? JSON.stringify(extra) : ''); };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const mk = async n => {
    const p = await b.newPage({ viewport: { width: 800, height: 500 } }); p.errs = []; p.on('pageerror', e => p.errs.push(n + ': ' + e.message));
    await p.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: fs.readFileSync('three.min.js'), contentType: 'application/javascript' }));
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.addInitScript(() => { window.__noIntro = true; });
    await p.goto('http://localhost:8099/', { waitUntil: 'load', timeout: 900000 });
    await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 900000 });
    await p.evaluate(() => __gm.hd && __gm.hd.setQuality(0)); return p;
  };
  const [A, B] = await Promise.all([mk('A'), mk('B')]);
  await A.evaluate(() => { const s = __gm.settings; s.netGmode = 0; s.netTeams = false; s.goal = 0; s.limit = 0; document.getElementById('nick').value = 'Alice'; document.getElementById('create').click(); });
  await A.waitForTimeout(3000);
  await B.evaluate(() => { document.querySelector('[data-go="vOnline"]').click(); document.getElementById('nick').value = 'Bob'; });
  await B.waitForFunction(() => document.querySelector('#games button'), null, { timeout: 60000 });
  await B.evaluate(() => document.querySelector('#games button').click());
  for (let i = 0; i < 60; i++) { const n = await Promise.all([A, B].map(p => p.evaluate(() => __gm.Net.remotes.size))); if (n[0] && n[1]) break; await A.waitForTimeout(1000); }
  ok(await B.evaluate(() => !__gm.Net.isHost), 'B est invité');
  await A.close();
  let st; for (let i = 0; i < 40; i++) { await B.waitForTimeout(1000); st = await B.evaluate(() => ({ host: __gm.Net.isHost, n: __gm.Net.remotes.size, over: __gm.Match.over })); if (st.host && st.n === 0) break; }
  ok(st.host && st.n === 0 && !st.over, 'A parti : B devient l’hôte, la partie continue', st);
  const r0 = await B.evaluate(() => __gm.rivals().map(r => [r.x, r.z]));
  await B.evaluate(() => { for (let k = 0; k < 40; k++) __gm.step(0.05); });
  const r1 = await B.evaluate(() => __gm.rivals().map(r => [r.x, r.z]));
  ok(r0.some((p, i) => Math.hypot(p[0] - r1[i][0], p[1] - r1[i][1]) > 1), 'B fait rouler les Rapaces');
  // a newcomer sees B's game in the lobby
  const C = await mk('C');
  await C.evaluate(() => document.querySelector('[data-go="vOnline"]').click());
  let lob = ''; for (let i = 0; i < 30 && !/Bob/.test(lob); i++) { await C.waitForTimeout(1000); lob = await C.evaluate(() => document.getElementById('games').textContent); }
  ok(/Bob/.test(lob), 'un nouveau venu voit la partie, tenue par Bob', lob);
  ok(![...B.errs, ...C.errs].length, 'aucune erreur de page', [...B.errs, ...C.errs].slice(0, 5));
  console.log(fails ? fails + ' ÉCHEC(S)' : 'tout est bon'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
