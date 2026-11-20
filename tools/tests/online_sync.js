// online: the host's tram and ferry seen by the guest, the ferry waits for a guest on its ramp, and the game survives a
// restart of the relay server (both reconnect, no ghost player, same host). Needs the Node server on port 8099.
// run from /home/claude/t; Node server on port 8099 started as « node server.js » from its folder (the test restarts it)
const fs = require('fs'); const { chromium } = require('playwright'); const { execSync, spawn } = require('child_process');
let fails = 0, log_; const ok = (c, msg, extra) => { if (!c) fails++; console.log(c ? 'OK  ' : 'FAIL', msg, extra !== undefined ? JSON.stringify(extra) : ''); };
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
  await A.waitForTimeout(4000);
  // tram and ferry
  const st = p => p.evaluate(() => ({ tr: __gm.trams.map(T => [Math.round(T.x), Math.round(T.sleep)]), fb: (f => [Math.round(f.t), f.side, Math.round(f.wait)])(__gm.gx.Boats.ferry) }));
  let a = await st(A), c = await st(B); console.log('A', JSON.stringify(a), 'B', JSON.stringify(c));
  ok(a.tr.every((t, i) => Math.abs(t[0] - c.tr[i][0]) < 12 && (t[1] > 0) === (c.tr[i][1] > 0)), 'tram : même position chez l’hôte et chez l’invité', [a.tr, c.tr]);
  ok(a.fb[1] === c.fb[1] && Math.abs(a.fb[0] - c.fb[0]) < 8, 'bac : même position chez l’hôte et chez l’invité', [a.fb, c.fb]);
  // bonuses: the same ones on both sides; B takes one, the host removes it and puts it back elsewhere, B sees it there
  const pks = p => p.evaluate(() => __gm.gx.pus().map(pu => pu.on ? [Math.round(pu.x), Math.round(pu.z)] : 0));
  let [pa, pb] = await Promise.all([pks(A), pks(B)]);
  ok(pa.some(Boolean) && JSON.stringify(pa) === JSON.stringify(pb), 'bonus : les mêmes chez l’hôte et chez l’invité', [pa, pb]);
  const took = await B.evaluate(() => { const c = __gm.locals()[0].car, pus = __gm.gx.pus(), pu = pus.find(p => p.on); c.hp = 100; c.shield = 30; c.place(pu.x, pu.z, 0); c.vx = c.vz = 0; for (let k = 0; k < 3; k++) __gm.step(0.05); return [pus.indexOf(pu), pu.on]; });
  ok(took[1] === false, 'bonus : B le prend', took);
  let gone = false; for (let i = 0; i < 15 && !gone; i++) { await A.waitForTimeout(1000); gone = await A.evaluate(i => !__gm.gx.pus()[i].on, took[0]); }
  ok(gone, 'bonus : l’hôte retire celui que B a pris');
  await A.evaluate(i => { __gm.gx.pus()[i].t = 0.01; for (let k = 0; k < 4; k++) __gm.step(0.05); }, took[0]);
  let back = false; for (let i = 0; i < 20 && !back; i++) { await A.waitForTimeout(1000); [pa, pb] = await Promise.all([pks(A), pks(B)]); back = pa[took[0]] && JSON.stringify(pa) === JSON.stringify(pb); }
  ok(back, 'bonus : il revient ailleurs, au même endroit pour les deux', [pa[took[0]], pb[took[0]]]);
  // the ferry waits for a guest on its ramp: put the ferry at the Gare Maritime about to leave, B on the ramp
  await A.evaluate(() => { const f = __gm.gx.Boats.ferry; f.side = 0; f.t = 0; f.wait = 1.5; __gm.locals()[0].car.place(0, 0, 0); });
  await B.evaluate(() => { const L = __gm.gx.Boats.LAND[0], c = __gm.locals()[0].car; c.place(L.bx + L.ax * L.len * 0.5, L.bz + L.az * L.len * 0.5, Math.atan2(L.ax, L.az)); c.vx = c.vz = 0; c.hp = 100; c.shield = 30; });
  await A.waitForTimeout(8000);
  const w = await A.evaluate(() => { const f = __gm.gx.Boats.ferry; return [f.side, Math.round(f.wait * 10) / 10, Math.round(f.t)]; });
  ok(w[0] === 0 && w[1] > 0 && w[2] < 2, 'bac : l’hôte attend l’invité qui est sur la rampe', w);
  // relay server restart
  const before = await Promise.all([A, B].map(p => p.evaluate(() => ({ me: __gm.Net.me, host: __gm.Net.isHost }))));
  execSync("pkill -f '^node server.js$' ; true");
  await A.waitForTimeout(3000);
  const srv = spawn('node', ['server.js'], { cwd: '/home/claude/srv', env: { ...process.env, PORT: '8099', GAME_HTML: '/tmp/ultra_test.html' }, detached: true, stdio: 'ignore' }); srv.unref();
  let after; for (let i = 0; i < 40; i++) { await A.waitForTimeout(1500); after = await Promise.all([A, B].map(p => p.evaluate(() => ({ me: __gm.Net.me, host: __gm.Net.isHost, hp: __gm.Net.hostPeer, n: __gm.Net.remotes.size, conn: __gm.Net.connected, R: [...__gm.Net.remotes.values()].map(R => R.nick) })))); if (after[0].conn && after[1].conn && after[0].me !== before[0].me && after[1].me !== before[1].me && after[0].n === 1 && after[1].n === 1 && after[1].hp === after[0].me) break; }
  console.log('before', JSON.stringify(before), 'after', JSON.stringify(after));
  ok(after[0].conn && after[1].conn && after[0].me !== before[0].me && after[1].me !== before[1].me, 'serveur relancé : les deux se reconnectent (nouveaux identifiants)');
  ok(after[0].n === 1 && after[1].n === 1, 'serveur relancé : chacun voit l’autre, sans joueur fantôme', after.map(x => x.R));
  ok(after[0].host && !after[1].host && after[1].hp === after[0].me, 'serveur relancé : A reste l’hôte, B le sait', after);
  // the game still works after it: B moves, A sees it
  await B.evaluate(() => { const c = __gm.locals()[0].car; c.place(c.x + 25, c.z, c.h); c.vx = c.vz = 0; });
  let seen = false; for (let i = 0; i < 20 && !seen; i++) { await A.waitForTimeout(1000); const [ra, cb] = await Promise.all([A.evaluate(() => [...__gm.Net.remotes.values()].map(R => [R.car.x, R.car.z])[0]), B.evaluate(() => [__gm.locals()[0].car.x, __gm.locals()[0].car.z])]); seen = ra && Math.hypot(ra[0] - cb[0], ra[1] - cb[1]) < 4; }
  ok(seen, 'serveur relancé : A voit de nouveau B bouger');
  ok(![...A.errs, ...B.errs].length, 'aucune erreur de page', [...A.errs, ...B.errs].slice(0, 5));
  console.log(fails ? fails + ' ÉCHEC(S)' : 'tout est bon'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
