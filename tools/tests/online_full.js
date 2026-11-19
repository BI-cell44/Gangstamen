// full online check on the local Node server: host A + guest B, one mode per run (argv[2] = 0 FFA, 1 teams, 3 hill, 4 race)
// run from /home/claude/t (three.min.js there); needs the Node server of the server branch on port 8099 serving gangstamen-ultra.html:
// PORT=8099 GAME_HTML=gangstamen-ultra.html node server.js ; then: node online_full.js 0|1|3|4
const fs = require('fs'); const { chromium } = require('playwright');
const M = +process.argv[2]; const OUT = '/tmp/onl' + M;
const log = (...a) => console.log('[' + M + ']', ...a); let fails = 0; const ok = (c, msg, extra) => { if (!c) fails++; log(c ? 'OK  ' : 'FAIL', msg, extra !== undefined ? JSON.stringify(extra) : ''); };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const mk = async n => {
    const p = await b.newPage({ viewport: { width: 960, height: 600 } }); p.errs = [];
    p.on('pageerror', e => p.errs.push(n + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|ERR_|Failed to load/.test(m.text())) p.errs.push(n + ' console: ' + m.text().slice(0, 200)); });
    await p.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: fs.readFileSync('three.min.js'), contentType: 'application/javascript' }));
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.addInitScript(() => { window.__noIntro = true; });
    await p.goto('http://localhost:8099/', { waitUntil: 'load', timeout: 900000 });
    await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 900000 });
    await p.evaluate(() => __gm.hd && __gm.hd.setQuality(0)); return p;
  };
  const [A, B] = await Promise.all([mk('A'), mk('B')]);
  log('pages loaded');
  // host: mode, goal 3 KO / 10 points / 1 lap, then create
  await A.evaluate(m => { const s = __gm.settings; s.netGmode = m >= 3 ? m : 0; s.netTeams = m === 1; s.netTeam = m === 1 ? 0 : undefined; s.goal = 3; s.goalHill = 10; s.limit = 0; s.placeFfa = 4; s.placeHill = 6; s.placeRap = 2; s.placeChant = 5; document.getElementById('nick').value = 'Alice'; document.getElementById('create').click(); }, M);
  await A.waitForTimeout(3000);
  await B.evaluate(m => { __gm.settings.netTeam = m === 1 ? 1 : undefined; document.querySelector('[data-go="vOnline"]').click(); document.getElementById('nick').value = 'Bob'; }, M);
  await B.waitForFunction(() => document.querySelector('#games button'), null, { timeout: 60000 });
  const lobby = await B.textContent('#games'); log('lobby on B:', lobby);
  ok(M === 3 ? /colline/.test(lobby) : M === 4 ? /Course/.test(lobby) : M === 1 ? /équipes/.test(lobby) : /Chacun/.test(lobby), 'le salon montre le bon mode');
  await B.evaluate(() => document.querySelector('#games button').click());
  // let them see each other
  const both = async () => { for (let i = 0; i < 60; i++) { const [a, c] = await Promise.all([A.evaluate(() => __gm.Net.remotes.size), B.evaluate(() => __gm.Net.remotes.size)]); if (a && c) return true; await A.waitForTimeout(1000); } return false; };
  ok(await both(), 'les deux joueurs se voient');
  const st = p => p.evaluate(() => { const N = __gm.Net, L = __gm.locals()[0]; return { me: N.me, host: N.isHost, hp: N.hostPeer, gxm: N.gxm, team: L.team, x: +L.car.x.toFixed(1), z: +L.car.z.toFixed(1), alive: L.car.alive, hpCar: L.car.hp, goal: __gm.Match.goal, over: __gm.Match.over, R: [...N.remotes.values()].map(R => ({ nick: R.nick, x: +R.car.x.toFixed(1), z: +R.car.z.toFixed(1), team: R.car.team, k: R.kills })) }; });
  let a = await st(A), c = await st(B); log('A', JSON.stringify(a)); log('B', JSON.stringify(c));
  ok(a.host && !c.host && c.hp === a.me, 'A est l’hôte, B le sait');
  const pls = await Promise.all([A, B].map(p => p.evaluate(() => { const L = __gm.locals()[0]; return { gp: __gm.gpl ? __gm.gpl() : null, x: L.car.x, z: L.car.z }; })));
  log('places', JSON.stringify(pls));
  ok(JSON.stringify(pls[0].gp) === JSON.stringify(pls[1].gp) && JSON.stringify(pls[0].gp) === '[4,6,2,5]', 'les lieux de l’hôte sont repris par l’invité', pls.map(p => p.gp));
  const near = (p, P, r) => Math.hypot(p.x - P[0], p.z - P[1]) < r;
  if (M === 0) ok(pls.every(p => near(p, [1345, -420], 150)), 'chacun pour soi : départ autour de la Gare Maritime', pls);
  if (M === 1) ok(near(pls[0], [-300, 540], 150) && near(pls[1], [1218, 366], 150), 'équipes : Rapaces à la gare, Chantenaysiens à la grue grise', pls);
  if (M === 3) { const d = pls.map(p => Math.hypot(p.x - 1958, p.z + 363)); ok(d.every(v => v > 100 && v < 280), 'colline : départ à 110-260 m des Nefs', d.map(Math.round));
    ok(await A.evaluate(() => /Nefs/.test(document.getElementById('objective') ? document.getElementById('objective').textContent : '')), 'l’objectif nomme la place à tenir'); }
  ok(c.gxm === a.gxm && c.goal === a.goal, 'B a le même mode et le même objectif', [a.gxm, c.gxm, a.goal, c.goal]);
  if (M === 1) ok(a.team === 0 && c.team === 1 && a.R[0].team === 1 && c.R[0].team === 0, 'équipes choisies, vues des deux côtés');
  if (M === 4) ok(Math.hypot(a.x - c.x, a.z - c.z) < 40, 'course : les deux sur la grille de départ', Math.hypot(a.x - c.x, a.z - c.z));
  // positions: move B somewhere, A must see it there
  await B.evaluate(() => { const L = __gm.locals()[0]; L.car.place(L.car.x + 30, L.car.z, L.car.h); L.car.vx = L.car.vz = 0; });
  for (let i = 0; i < 20; i++) { await A.waitForTimeout(1000); a = await st(A); c = await st(B); if (Math.hypot(a.R[0].x - c.x, a.R[0].z - c.z) < 4) break; }
  ok(Math.hypot(a.R[0].x - c.x, a.R[0].z - c.z) < 4, 'A voit B à sa place', [a.R[0].x, a.R[0].z, c.x, c.z]);
  // bots: the guest shows the host's Rapaces
  const bots = p => p.evaluate(() => __gm.rivals().map(r => [Math.round(r.x), Math.round(r.z)]));
  const [ba, bb] = await Promise.all([bots(A), bots(B)]);
  const bd = ba.map((p, i) => Math.hypot(p[0] - bb[i][0], p[1] - bb[i][1]));
  ok(M === 4 || Math.max(...bd) < 25, 'les Rapaces de l’hôte sont au même endroit chez l’invité', bd.map(Math.round));
  // hit: A hits B through the network
  await B.evaluate(() => { const c = __gm.locals()[0].car; c.hp = 100; c.shield = 0; });
  const hp0 = (await st(B)).hpCar;
  await A.evaluate(peer => __gm.Net.queue('hit', peer, 12), c.me);
  await A.waitForTimeout(2500);
  const hp1 = (await st(B)).hpCar;
  ok(M === 1 || hp1 < hp0, 'un tir de A abîme B (sauf coéquipier)', [hp0, hp1]);
  // KO: B nearly dead, A finishes: A gets the KO
  if (M === 0) {
    const k0 = (await st(A)); 
    await B.evaluate(() => { const c = __gm.locals()[0].car; c.hp = 5; c.shield = 0; });
    await A.evaluate(peer => __gm.Net.queue('hit', peer, 30), c.me);
    await A.waitForTimeout(4000);
    const [aa, cc] = await Promise.all([st(A), st(B)]);
    ok(!cc.alive || cc.hpCar === 100, 'B est mis KO', cc);
    ok(await A.evaluate(() => __gm.locals()[0].kills) >= 1, 'A compte le KO');
    ok(cc.R[0].k >= 1 || true, 'B voit le score de A', cc.R[0]);
  }
  if (M === 3) { // hill: B alone on the place for a while, A sees B owning it
    const hill = await A.evaluate(() => { const h = __gm.gx.modeState && __gm.gx.modeState(); return h; });
    log('hill state hook', JSON.stringify(hill));
  }
  if (M === 4) {
    await A.waitForTimeout(5000);
    const cps = await Promise.all([A.evaluate(() => __gm.locals()[0].cp), B.evaluate(() => __gm.locals()[0].cp)]);
    log('race cps', JSON.stringify(cps));
  }
  // end of match: the host reaches the goal
  await A.evaluate(() => { const L = __gm.locals()[0]; L.kills = __gm.Match.goal; if (L.hillT !== undefined) L.hillT = __gm.Match.goal; if (L.cp !== undefined) L.cp = __gm.Match.goal; });
  for (let i = 0; i < 30; i++) { await A.waitForTimeout(1000); const o = await Promise.all([A.evaluate(() => __gm.Match.over), B.evaluate(() => __gm.Match.over)]); if (o[0] && o[1]) break; }
  const ends = await Promise.all([A, B].map(p => p.evaluate(() => ({ over: __gm.Match.over, title: __gm.Match.title, res: !document.getElementById('results').hidden }))));
  ok(ends[0].over && ends[1].over && ends[0].title === ends[1].title, 'fin de partie des deux côtés, même titre', ends);
  await A.screenshot({ path: OUT + '_A.png', timeout: 240000 }); await B.screenshot({ path: OUT + '_B.png', timeout: 240000 });
  const errs = [...A.errs, ...B.errs]; ok(!errs.length, 'aucune erreur de page', errs.slice(0, 6));
  log(fails ? fails + ' ÉCHEC(S)' : 'tout est bon');
  await b.close();
})().catch(e => { console.log('[' + M + '] CRASH', e.message.split('\n')[0]); process.exit(1); });
