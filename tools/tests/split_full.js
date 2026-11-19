// split screen: every mode, with the places chosen in the menu
// run from /home/claude/t: node split_full.js gangstamen-ultra.html
const fs = require('fs'); const { chromium } = require('playwright');
let fails = 0; const ok = (c, msg, extra) => { if (!c) fails++; console.log(c ? 'OK  ' : 'FAIL', msg, extra !== undefined ? JSON.stringify(extra) : ''); };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: fs.readFileSync('three.min.js'), contentType: 'application/javascript' }));
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(() => { window.__noIntro = true; });
  await p.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + fs.readFileSync(process.argv[2], 'utf8') + '</body></html>', { waitUntil: 'load', timeout: 900000 });
  await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 900000 });
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => __gm.hd.setQuality(0));
  // the menu rows follow the mode
  const rows = await ev(() => { const out = {}; document.querySelector('[data-go="vSplit"]').click();
    for (const m of [0, 1, 2, 3, 4]) { document.querySelector('#mSeg button[data-m="' + m + '"]').click(); out[m] = [...document.querySelectorAll('#vSplit .placeRows .row, #vSplit .placeRows p')].map(r => r.textContent.replace(/[◀▶]/g, '').trim()); }
    return out; });
  console.log(JSON.stringify(rows));
  ok(rows[0].length === 1 && rows[1].length === 2 && rows[2].length === 2 && rows[3].length === 1 && /grille/.test(rows[4][0]), 'menu : une ligne de lieu par mode');
  // the two bases can never be the same place
  const same = await ev(() => { document.querySelector('#mSeg button[data-m="2"]').click(); const s = __gm.settings; s.placeRap = 1; s.placeChant = 3; __gm.saveSettingsHook(); document.querySelector('#mSeg button[data-m="2"]').click();
    const rows = document.querySelectorAll('#vSplit .placeRows .row'); const nextRap = rows[0].querySelectorAll('button')[1]; nextRap.click(); nextRap.click(); return [s.placeRap, s.placeChant]; });
  ok(same[0] !== same[1] && same[0] === 4, 'bases : la Rapaces saute la base des Chantenaysiens', same);
  const run = async (m, places, sec) => {
    await ev(([m, pl]) => { const s = __gm.settings; s.nPlayers = 2; s.gmode = m; s.teams = m === 1 || m === 2; s.team = [0, 1, 0, 1]; s.goal = 3; s.goalHill = 30; s.goalCtf = 3; s.limit = 0; Object.assign(s, pl); __gm.saveSettingsHook(); __gm.start('split'); }, [m, places]);
    for (let i = 0; i < (sec || 3); i++) await ev(() => __gm.step(0.05));
    return ev(() => ({ gp: __gm.gpl(), cars: __gm.locals().map(L => [Math.round(L.car.x), Math.round(L.car.z), L.team]), obj: document.getElementById('objective') ? document.getElementById('objective').textContent : '' }));
  };
  const near = (c, P, r) => Math.hypot(c[0] - P[0], c[1] - P[1]) < r;
  // 0 chacun pour soi, start at the Gare Maritime
  let r = await run(0, { placeFfa: 4 }); console.log('ffa', JSON.stringify(r));
  ok(r.cars.every(c => near(c, [1345, -420], 60)), 'chacun pour soi : départ à la Gare Maritime', r.cars);
  // shot between the two players
  const hit = await ev(() => { const [A, B] = __gm.locals(); B.car.hp = 100; B.car.shield = 0; __gm.damage(B.car, 20, { by: A.car }); return B.car.hp; });
  ok(hit < 100, 'chacun pour soi : J1 abîme J2', hit);
  // death and comeback near the start place
  const back = await ev(() => { const B = __gm.locals()[1]; B.car.hp = 0; B.car.alive = false; B.deadT = 0.01; for (let i = 0; i < 4; i++) __gm.step(0.05); return [B.car.alive, Math.round(B.car.x), Math.round(B.car.z)]; });
  ok(back[0] && near(back.slice(1), [1345, -420], 160), 'chacun pour soi : retour près du lieu de départ', back);
  // dispersed
  r = await run(0, { placeFfa: -1 }); ok(Math.hypot(r.cars[0][0] - r.cars[1][0], r.cars[0][1] - r.cars[1][1]) > 5, 'chacun pour soi dispersé : départs différents', r.cars);
  // 1 teams: Rapaces at the gare de Chantenay, Chantenaysiens at the Nefs
  r = await run(1, { placeRap: 2, placeChant: 6 }); console.log('teams', JSON.stringify(r));
  ok(near(r.cars[0], [-300, 540], 70) && near(r.cars[1], [1958, -363], 70), 'équipes : chaque bande à sa base', r.cars);
  const ff = await ev(() => { const [A, B] = __gm.locals(); return A.team !== B.team; }); ok(ff, 'équipes : J1 et J2 dans deux bandes');
  // 2 flag: Rapaces' flag at the Mairie (1), Chantenaysiens' at the Gare Maritime (4)
  r = await run(2, { placeRap: 1, placeChant: 4 }); console.log('ctf', JSON.stringify(r));
  const fl = await ev(() => { const st = __gm.gx.modeState ? __gm.gx.modeState() : null; return st; });
  ok(near(r.cars[0], [160, -440], 70) && near(r.cars[1], [1345, -420], 70), 'drapeau : chaque équipe part de sa base', r.cars);
  // capture: J2 (team 1) takes the Rapaces' flag at the Mairie and brings it home
  const cap = await ev(() => { const B = __gm.locals()[1], A = __gm.locals()[0]; A.car.place(A.car.x + 300, A.car.z, 0);
    for (const r of __gm.rivals()) r.place(r.x - 1500, r.z, 0);
    const f0 = __gm.gx.modeInfo().flags; B.car.place(f0[0][0] + 1, f0[0][1] + 1, 0); for (let i = 0; i < 3; i++) __gm.step(0.05);
    const taken = __gm.gx.modeInfo().flags[0][3];
    const f1 = __gm.gx.modeInfo().flags[1]; B.car.place(f1[0] + 1, f1[1] + 1, 0); for (let i = 0; i < 3; i++) __gm.step(0.05);
    return { flags: f0.map(f => [Math.round(f[0]), Math.round(f[1])]), taken, score: __gm.gx.modeInfo().score }; });
  ok(cap.taken && cap.score[1] === 1, 'drapeau : J2 prend le drapeau des Rapaces à la Mairie et marque à la Gare Maritime', cap);
  ok(Math.hypot(cap.flags[0][0] - 160, cap.flags[0][1] + 440) < 40 && Math.hypot(cap.flags[1][0] - 1345, cap.flags[1][1] + 420) < 60, 'drapeau : les drapeaux sont aux bases choisies', cap.flags);
  console.log('cap', JSON.stringify(cap));
  // 3 hill at the Nefs
  r = await run(3, { placeHill: 6 }); console.log('hill', JSON.stringify(r));
  const d = r.cars.map(c => Math.hypot(c[0] - 1958, c[1] + 363));
  ok(d.every(v => v > 100 && v < 280), 'colline : départ à 110-260 m des Nefs', d.map(Math.round));
  ok(/Nefs/.test(r.obj), 'colline : l’objectif nomme la place', r.obj);
  const pts = await ev(() => { const A = __gm.locals()[0]; const st = __gm.locals()[1]; st.car.place(st.car.x + 400, st.car.z, 0);
    for (const r of __gm.rivals()) r.place(r.x - 900, r.z, 0); const h = __gm.gx.modeInfo().hill; A.car.place(h[0], h[1], 0); for (let i = 0; i < 6; i++) __gm.step(0.2); return [A.hillT, A.kills, __gm.rivals().map(r => Math.round(Math.hypot(r.x - A.car.x, r.z - A.car.z)))]; });
  ok(pts[0] > 0, 'colline : J1 seul aux Nefs marque des points', pts);
  // 4 race: grid on the boulevard de la Liberté
  r = await run(4, {}); console.log('race', JSON.stringify(r));
  ok(r.cars.every(c => near(c, [58, 284], 30)), 'course : grille du boulevard de la Liberté', r.cars);
  // back to the solo free driving: no multiplayer places left
  const solo = await ev(() => { __gm.start('solo', 'free'); return __gm.gpl(); }); ok(solo === null, 'conduite libre : pas de lieux de partie', solo);
  await p.screenshot({ path: '/tmp/split_last.png', timeout: 240000 });
  ok(!errs.length, 'aucune erreur de page', errs.slice(0, 5));
  console.log(fails ? fails + ' ÉCHEC(S)' : 'tout est bon'); await b.close();
})().catch(e => { console.log('CRASH', e.message.split('\n')[0]); process.exit(1); });
