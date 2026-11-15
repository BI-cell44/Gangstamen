#!/usr/bin/env node
// Gangstamen test runner: node tools/run-tests.js <built html> [--record docs/perf.json] [--label text]
// Loads the build in headless Chrome (software rendering), runs the functional checks that apply to that build
// (classic, HD or Ultra) and measures the scene. Exit code 1 if a check fails.
// Needs: npm i playwright three@0.128.0 in the working directory (or NODE_PATH), three.min.js next to this script or
// in the working directory, and Chrome at /usr/bin/google-chrome (the Playwright Chromium download is blocked here).
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--') && /\.html$/.test(a));
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
if (!file) { console.error('usage: node tools/run-tests.js <gangstamen*.html> [--record docs/perf.json] [--label text]'); process.exit(2); }
const threePath = [path.join(__dirname, 'three.min.js'), path.join(process.cwd(), 'three.min.js'), path.join(process.cwd(), 'node_modules/three/build/three.min.js')].find(p => fs.existsSync(p));
if (!threePath) { console.error('three.min.js (r128) not found'); process.exit(2); }

const results = []; let page;
async function check(name, fn) {
  const t0 = Date.now();
  try { const info = await fn(); results.push({ name, ok: true, info, s: (Date.now() - t0) / 1000 }); console.log('  ok   ' + name + (info ? '  ' + JSON.stringify(info) : '')); }
  catch (e) { results.push({ name, ok: false, err: String(e.message || e).slice(0, 300) }); console.log('  FAIL ' + name + '  ' + String(e.message || e).slice(0, 300)); }
}
const ev = (fn, arg) => page.evaluate(fn, arg);
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
async function skipDialogue() { for (let i = 0; i < 20 && await ev(() => !!(__gm.gx && __gm.gx.blocking)); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); } }

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-accelerated-2d-canvas', '--autoplay-policy=no-user-gesture-required'] });
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await page.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: fs.readFileSync(threePath), contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.addInitScript(() => { window.__noIntro = true; });
  const t0 = Date.now();
  await page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + fs.readFileSync(file, 'utf8') + '</body></html>', { waitUntil: 'load', timeout: 600000 });
  await page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 600000 });
  const loadS = (Date.now() - t0) / 1000;
  const kind = await ev(() => document.title.replace('Gangstamen', '').trim() || 'classique');
  const HD = await ev(() => !!window.__gm.hd);
  console.log(path.basename(file) + ' · ' + kind + ' · chargé en ' + loadS.toFixed(0) + ' s');
  if (HD) await ev(() => { __gm.hd.setQuality(0); __gm.settings.voices = false; });

  await check('réglages par défaut complets', async () => {
    const r = await ev(() => { const s = __gm.settings; return { team: Array.isArray(s.team), goal: s.goal, limit: s.limit, tod: s.tod, traffic: s.traffic, dist: s.dist }; });
    expect(r.team && r.goal === 20 && r.limit === 10 && r.tod && r.traffic === 2 && r.dist === 2, JSON.stringify(r)); return r;
  });
  await check('partie solo', async () => {
    await ev(() => __gm.start('solo')); await page.waitForTimeout(1500);
    const r = await ev(() => { for (let i = 0; i < 90; i++) __gm.step(1 / 30); const L = __gm.locals()[0]; return { alive: L.car.alive, rivals: __gm.rivals().length, x: Math.round(L.car.x), z: Math.round(L.car.z) }; });
    expect(r.alive && r.rivals > 0, 'pas de joueur vivant ou pas de rivaux'); return r;
  });
  // measurements (whole frame: every render pass)
  let perf = null;
  await check('mesures', async () => {
    perf = await ev(async () => {
      const R = __gm.renderer, S = __gm.scene; 
      let meshes = 0; const geos = new Set(), mats = new Set(); S.traverse(o => { if (o.isMesh) { meshes++; geos.add(o.geometry); mats.add(o.material); } });
      __gm.PerfHud.show(true); await new Promise(r => setTimeout(r, 2500));
      const one = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r({ calls: R.info.render.calls, tris: R.info.render.triangles }))));
      const f = await one(); __gm.PerfHud.show(false);
      let t = performance.now(); for (let i = 0; i < 60; i++) __gm.step(1 / 60); const sim = (performance.now() - t) / 60;
      return { drawCalls: f.calls, trianglesK: Math.round(f.tris / 1000), meshes, geometries: geos.size, materials: mats.size, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, simMs: +sim.toFixed(2) };
    });
    perf.loadS = Math.round(loadS); return perf;
  });
  await check('son v2 : moteur, pneus, chocs, voitures autour, lieux', async () => {
    const r = await ev(async () => {
      const wait = ms => new Promise(f => setTimeout(f, ms)), S = __gm.sfx, L = __gm.locals()[0], c = L.car;
      S.init(); if (S.ctx.state !== 'running') await S.ctx.resume(); __gm.settings.voices = false;
      // virtual gearbox (arcade): the gear climbs with the speed, the revs stay between idle and the red line
      const o = { speed: 0, vx: 0, vz: 0, air: 0 }, gears = [], rpms = [];
      for (let v = 0; v <= 42; v += 0.5) { o.speed = v; for (let i = 0; i < 20; i++) __gm.engineState(o, 1); gears.push(o._es.gear); rpms.push(o._es.rpm); }
      const res = { rapports: Math.max(...gears), rpmMin: Math.round(Math.min(...rpms)), rpmMax: Math.round(Math.max(...rpms)) };
      // the player's engine plays; sliding sideways makes the tyres squeal
      // (the game loop keeps running between our awaits: set the state and read the levels in the same task)
      c.place(500, 500, 0); c.hp = 100;
      for (let i = 0; i < 10; i++) { c.vx = 0; c.vz = -15; L._inp = { t: 1, s: 0 }; __gm.Soundscape.tick(1 / 30, L); }
      res.moteur = +S._lv.eng.toFixed(3);
      c.vx = 9; c.vz = -12; L._inp = { t: 1, s: 0 }; __gm.Soundscape.tick(1 / 30, L); res.pneus = +S._lv.tyre.toFixed(3);
      c.vx = 0; c.vz = 0; L._inp = { t: 0, s: 0 }; __gm.Soundscape.tick(1 / 30, L);
      // a rival coming closer: heard among the cars around, pitched up (Doppler)
      const rv = __gm.rivals()[0]; rv.alive = true; rv.place(500, 470, 0); rv.vx = 0; rv.vz = 25; L.cam.position.set(500, 4, 505); __gm.Soundscape.tick(1 / 30, L);
      res.autour = S._lv.others;
      // places: the Loire below the Sainte-Anne stairs, a crash, the bells, dialogue ducking
      L.cam.position.set(960, 4, 160); __gm.Soundscape.tick(0.3, L); res.loire = +__gm.Soundscape._place.water.toFixed(2);
      L.cam.position.set(300, 40, -200); __gm.Soundscape.tick(0.3, L); res.loireLoin = +__gm.Soundscape._place.water.toFixed(2);
      // (the audio clock and the timers drift too much in software rendering to measure the output itself: count the events)
      const i0 = S._lv.impacts; S.impact(15); S.impact(1); res.choc = S._lv.impacts - i0;
      L.cam.position.set(__gm.Soundscape.stAnne()[0], 30, __gm.Soundscape.stAnne()[1] + 50); const b0 = S._lv.bells; __gm.Soundscape.ring(); __gm.Soundscape.tick(1 / 30, L); res.cloches = S._lv.bells - b0;
      const d = document.getElementById('dlg'); if (d) { d.hidden = false; __gm.Soundscape.tick(1 / 30, L); res.attenue = S.ducked; d.hidden = true; __gm.Soundscape.tick(1 / 30, L); res.retour = !S.ducked; }
      return res;
    });
    expect(r.rapports >= 5 && r.rpmMin >= 850 && r.rpmMax <= 7000, 'boîte virtuelle ' + JSON.stringify(r));
    expect(r.moteur > 0.03 && r.pneus > 0.05 && r.autour >= 1 && r.choc === 1 && r.cloches >= 1, JSON.stringify(r));
    expect(r.loire > 0.4 && r.loireLoin < r.loire, 'Loire ' + JSON.stringify(r));
    if (r.attenue !== undefined) expect(r.attenue && r.retour, 'atténuation sous les dialogues');
    return r;
  });
  await check('caméras : 6 vues, mur derrière, regard arrière, mode photo', async () => {
    const r = await ev(async () => {
      const L = __gm.locals()[0], c = L.car, cam = L.cam, dt = 1 / 30, out = {};
      const w = __gm.tramWall(600); c.place(600, w + 4, Math.PI); // facing south: the tram wall is 4 m behind c.vx = 0; c.vz = 0; c.hp = 100;
      for (let m = 0; m < __gm.CAM_MODES.length; m++) { L.camMode = m; L.camCut = true; for (let i = 0; i < 40; i++) __gm.updateCamera(L, dt);
        const d = Math.hypot(cam.position.x - c.x, cam.position.z - c.z); if (!isFinite(d)) return { nan: m }; out[__gm.CAM_MODES[m]] = +d.toFixed(1); }
      // chase camera with the tram wall 4 m behind the car: it stays on the car's side of the wall
      L.camMode = 0; L.camCut = true; for (let i = 0; i < 40; i++) __gm.updateCamera(L, dt); out.murOk = cam.position.z > w; out.dMur = +Math.hypot(cam.position.x - c.x, cam.position.z - c.z).toFixed(1);
      // look back: the camera goes in front of the car
      L.lookBack = true; for (let i = 0; i < 5; i++) __gm.updateCamera(L, dt); out.arriere = +(cam.position.z - c.z).toFixed(1); L.lookBack = false;
      // photo mode: the game pauses, the camera flies, a picture can be taken
      __gm.PhotoMode.toggle(true); const p0 = cam.position.clone();
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      for (let i = 0; i < 30; i++) { __gm.PhotoMode.tick(dt); __gm.updateCamera(L, dt); }
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      out.pause = __gm.paused; out.vol = +cam.position.distanceTo(p0).toFixed(1);
      __gm.PhotoMode.shot(); const img = document.querySelector('#phOut img'); out.photoKo = img ? Math.round(img.src.length / 1024) : 0;
      if (__gm.hd) { __gm.PhotoMode._P.dof = 0.8; __gm.PhotoMode.shot(); out.flou = !!document.querySelector('#phOut img'); }
      __gm.PhotoMode.toggle(false); out.reprise = !__gm.paused;
      return out;
    });
    expect(!r.nan && r.murOk && r.dMur < 5 && r.arriere > 2 && r.pause && r.vol > 3 && r.photoKo > 5 && r.reprise, JSON.stringify(r));
    expect(r['Capot'] < 2 && r['Pare-chocs'] < 3 && r['Poursuite'] > 2.5, 'distances ' + JSON.stringify(r)); return r;
  });
  await check('sauvegarde v2 : migration, emplacements, export et import', async () => {
    const r = await ev(() => {
      const P = __gm.Profile, s = __gm.settings, out = {};
      out.schema = P.data.v === 2 && P.data.slots.length === 3;
      s.bank = 1234; s.camp = { done: ['retour'] }; __gm.saveSettingsHook(); out.capture = P.cur.respect === 1234 && P.cur.camp.done.length === 1;
      const code = P.exportCode(); out.code = code.slice(0, 6);
      P.use(1); out.slot2Vide = s.bank === 0 && s.camp.done.length === 0;
      out.importErr = P.importCode(code.slice(0, -4) + 'AAAA', 2) !== null; out.importOk = P.importCode(code, 2) === null && P.data.slots[2].respect === 1234;
      P.use(0); out.retour = s.bank === 1234; try { out.stocke = !!localStorage.getItem('gangstamen.save.v2'); } catch (e) { out.stocke = 'pas de stockage ici'; }
      P.reset(1); P.reset(2); s.bank = 0; s.camp = { done: [] }; __gm.saveSettingsHook();
      return out;
    });
    expect(r.schema && r.capture && r.code === 'GSTM2-' && r.slot2Vide && r.importErr && r.importOk && r.retour && r.stocke, JSON.stringify(r)); return r;
  });
  await check('bords de carte : murs visibles, ville au-delà, rien de jouable dehors', async () => {
    const r = await ev(() => {
      const W = __gm.W, G = __gm.G, E = __gm.EDGE, out = { murs: __gm.edges.walls, maisons: W.buildings.filter(b => b.x).length, rues: W.roads.filter(r => r.x).length };
      let far = 0; for (let i = 0; i < G.x.length; i++) if (G.adj[i].length && (G.x[i] < E.x0 - 30 || G.x[i] > E.x1 + 30 || G.z[i] > E.z1 + 30)) far++;
      out.noeudsDehors = far; return out;
    });
    expect(r.murs > 300 && r.maisons > 800 && r.rues > 10 && r.noeudsDehors === 0, JSON.stringify(r)); return r;
  });
  await check('Loire : voiliers et bac sur l’eau, le bac traverse', async () => {
    const r = await ev(() => {
      const B = __gm.gx.Boats, g = __gm.groundH, s0 = B.list.map(b => [b.x, b.z]); let dry = 0, sides = new Set(), minD = 1e9;
      const fy = B.list.find(b => b.kind === 'ferry');
      for (let i = 0; i < 240; i++) { B.step(0.5); sides.add(fy.side); for (const b of B.list) { if (b.x > -400 && b.x < 1800 && b.z < 760 && g(b.x, b.z) > 0.45) dry++; if (b !== fy) minD = Math.min(minD, Math.hypot(b.x - fy.x, b.z - fy.z)); } }
      return { bateaux: B.list.length, voiliers: B.list.filter(b => b.kind === 'sail').length, auSec: dry, rives: sides.size, ecartBac: Math.round(minD), avance: Math.round(Math.min(...B.list.filter(b => b.kind === 'sail').map((b, i) => Math.hypot(b.x - s0[i][0], b.z - s0[i][1])))), modeles: Object.keys(__gm.W.models || {}).join(',') };
    });
    expect(r.voiliers >= 3 && r.bateaux === r.voiliers + 1 && r.auSec === 0 && r.rives === 2 && r.ecartBac > 18 && r.avance > 50, JSON.stringify(r)); return r;
  });
  await check('piétons animés : personnages à squelette, marche, course', async () => {
    const r = await ev(() => {
      const g = __gm.gx, P = g.People, c = __gm.locals()[0].car, ps = g.peds().slice(0, 6);
      ps.forEach((p, i) => { p.on = true; p._pin = [c.x - 4 + i * 1.5, c.z + 30, 0]; p.state = i === 5 ? 'panic' : 'walk'; p.run = 4.5; p.timer = 99; p.idleIn = 99; });
      __gm.step(0.05); const o = ps[0]._sk, q0 = o ? o.bones.map(b => b.quaternion.toArray()) : [];
      if (o) { P.dt = 0.2; P.draw(ps[0]); o.mesh.updateMatrixWorld(true); }
      const moved = o ? o.bones.filter((b, i) => b.quaternion.toArray().some((v, k) => Math.abs(v - q0[i][k]) > 0.01)).length : 0;
      const out = { actifs: P.on, corps: P.all.length, clips: [...new Set(P.all.map(a => a.clip))].sort().join(','), osBouges: moved, nan: o ? o.bones.filter(b => b.matrixWorld.elements.some(isNaN)).length : -1, visible: !!(o && o.mesh.visible), taille: o ? +(o.c.h * o.mesh.scale.x).toFixed(2) : 0 };
      ps.forEach(p => { delete p._pin; p.state = 'walk'; }); return out;
    });
    expect(r.actifs && r.corps >= 6 && r.osBouges > 8 && r.nan === 0 && r.visible && /run/.test(r.clips) && /walk|slow|phone/.test(r.clips) && r.taille > 0.9 && r.taille < 2.1, JSON.stringify(r)); return r;
  });
  await check('trottoirs : réseau, passages piétons, presque personne sur la chaussée hors passage', async () => {
    const r = await ev(() => {
      const g = __gm.gx, WN = g.walks(), ps = g.peds(), c = __gm.locals()[0].car; let onRoad = 0, crossing = 0, waited = 0, n = 0, moved = 0, jumps = 0;
      for (const p of ps) { p.on = true; const a = WN.spawn[(n * 97) % WN.spawn.length], e = WN.e[a][0]; Object.assign(p, { a, b: e[0], ek: e[1], f: 0.2, ox: 0, oz: 0, state: 'walk', timer: 0, idleIn: 999 }); n++; }
      const p0 = ps.map(p => [WN.x[p.a], WN.z[p.a]]), seen = new Set();
      for (let i = 0; i < 900; i++) { __gm.step(1 / 15); for (const p of ps) { if (!p.on) continue; if (p.ek === 1 && p.state === 'walk') { crossing++; seen.add(p); } if (p.state === 'wait') waited++; else if (p.ek !== 1 && p.state === 'walk' && __gm.roadEdge(p.x, p.z)[0] < -0.5) onRoad++; if (p._lx !== undefined && Math.hypot(p.x - p._lx, p.z - p._lz) > 3) jumps++; p._lx = p.x; p._lz = p.z; } }
      ps.forEach((p, i) => { if (Math.hypot(p.x - p0[i][0], p.z - p0[i][1]) > 20) moved++; delete p._lx; delete p._lz; });
      return Object.assign({ pietons: ps.length, loin: moved, traversees: seen.size, attentes: waited > 0, surChaussee: onRoad, sauts: jumps }, WN.stats);
    });
    expect(r.nodes > 3000 && r.crossings > 150 && r.biggest > r.nodes * 0.5 && r.loin > r.pietons * 0.5 && r.traversees >= 3 && r.attentes && r.surChaussee < r.pietons * 900 * 0.02, JSON.stringify(r)); return r;
  });
  await check('mur du tram (nord)', async () => {
    const r = await ev(() => { const c = __gm.locals()[0].car, x = 600, w = __gm.tramWall(x); c.place(x, w + 8, Math.PI); c.hp = 100; for (let i = 0; i < 60; i++) { c.vx = 0; c.vz = -8; __gm.step(1 / 30); } return +(c.z - w).toFixed(2); });
    expect(r > 0, 'la voiture a franchi les voies (' + r + ')'); return { marge: r };
  });
  await check('bord ouest', async () => {
    const r = await ev(() => { const c = __gm.locals()[0].car; c.place(__gm.EDGE.x0 + 25, -155, -Math.PI / 2); c.hp = 100; for (let i = 0; i < 60; i++) { c.vx = -8; c.vz = 0; __gm.step(1 / 30); } return +(c.x - __gm.EDGE.x0).toFixed(1); });
    expect(r > 0, 'la voiture est sortie (' + r + ')'); return { marge: r };
  });
  await check('tram en service et choc', async () => {
    const r = await ev(() => { const T = __gm.trams[0], c = __gm.locals()[0].car; T.sleep = 0; T.wait = 0; T.x = 400; T.v = 10; T.left = 616; if (T.hit) T.hit.clear();
      c.place(430, __gm.tramS(430) + 0.5, 0); c.vx = c.vz = 0; c.hp = 100; c.shield = 0; const x0 = T.x;
      for (let i = 0; i < 120; i++) { c.vx = 0; c.vz = 0; __gm.step(1 / 30); } return { avance: Math.round(T.x - x0), pv: Math.round(c.hp), horsVoie: +(c.z - __gm.tramS(c.x)).toFixed(1) }; });
    expect(r.avance > 5 && r.pv < 100 && r.pv > 40 && r.horsVoie >= 2.4, JSON.stringify(r)); return r;
  });
  if (HD) {
    await check('qualité automatique : baisse sous 25 im/s, case respectée', async () => {
      const r = await ev(() => { const h = __gm.hd; h.setQuality(2); __gm.settings.autoQ = true; let t = performance.now() + 1000; const run = ms => { for (let k = 0; k < ms / 100; k++) { t += 100; h.perf(t); } };
        run(600); run(6000); const after = h.quality; __gm.settings.autoQ = false; h.setQuality(2); run(12000); const off = h.quality; __gm.settings.autoQ = true; h.setQuality(0); return { after, off }; });
      expect(r.after === 1 && r.off === 2, JSON.stringify(r)); return r;
    });
    await check('piétons et clients fuient au coup de feu', async () => {
      const r = await ev(() => { const peds = __gm.gx.peds().filter(p => p.on && p.state !== 'down'); if (!peds.length) return { peds: 0 };
        const p = peds[0], L = __gm.locals()[0]; L.car.place(p.x + 8, p.z + 8, 0); L.car.vx = L.car.vz = 0;
        __gm.shoot(L.car, [], 1, 95, 0.05, false); const s1 = p.state, x0 = p.x, z0 = p.z;
        for (let i = 0; i < 20; i++) __gm.step(1 / 30); return { peds: peds.length, state: s1, moved: +Math.hypot(p.x - x0, p.z - z0).toFixed(2), later: p.state }; });
      expect(r.peds > 0 && r.state === 'panic' && r.moved > 0, JSON.stringify(r)); return r;
    });
    await check('radio : les 4 stations au même niveau audible (au-dessus de 220 Hz)', async () => {
      const r = await ev(() => __gm.sfx.stationLevels(8, 220)), base = r[0].rms;
      const bad = r.filter(s => s.rms < base * 0.8 || s.rms > base * 1.3);
      expect(!bad.length, JSON.stringify(r)); return r.map(s => s.rms);
    });
    await check('saut : la voiture passe au-dessus d’un arbre', async () => {
      const r = await ev(() => { const T = __gm.W.trees, c = __gm.locals()[0].car; let tx = null, tz = null;
        for (let i = 0; i < T.length && tx === null; i += 2) { const s = __gm.cellOf(T[i], T[i + 1]); if (s && s.some(q => q.length === 5) && s.every(q => q.length === 5)) { tx = T[i]; tz = T[i + 1]; } }
        const res = {}; for (const air of [0, 4]) { c.place(tx - 12, tz, -Math.PI / 2); c.hp = 100; c.shield = 0; __gm.step(1 / 60); if (air) { c.yb += air; c.yv = 3; }
          for (let i = 0; i < 70; i++) { if (i < 30) { c.vx = 20; c.vz = 0; } __gm.step(1 / 60); } res['h' + air] = Math.round(c.x - tx); } return res; });
      expect(r.h0 < 0 && r.h4 > 3, JSON.stringify(r)); return r;
    });
    await check('physique réaliste : accélération, freinage, virage, frein à main', async () => {
      const r = await ev(() => { const c = __gm.locals()[0].car, dt = 1 / 60, keep = [c.x, c.z, c.h, c.style];
        const run = (setup, inp, T) => { c.phys = null; c.vx = c.vz = 0; c.h = 0; c.x = 500; c.z = 500; c.air = 0; c.steer = 0; c.nitro = 0; c._grip = 1; c.maxV = 44; c.accK = 1; setup && setup(); let maxB = 0, t100 = 0;
          for (let i = 0; i < T / dt; i++) { __gm.planarReal(c, inp(i * dt), dt); c.x += c.vx * dt; c.z += c.vz * dt; const [fx, fz] = c.fwd, u = c.vx * fx + c.vz * fz, v = c.vx * fz - c.vz * fx; maxB = Math.max(maxB, Math.abs(Math.atan2(v, Math.abs(u) + 0.1))); if (!t100 && c.speed > 27.78) t100 = i * dt; if (!isFinite(c.vx)) return { nan: 1 }; }
          return { t100, maxB: maxB * 57.3, kmh: c.speed * 3.6, yaw: c.h * 57.3 }; };
        const out = {};
        for (const s of Object.keys(__gm.VEHICLES)) { c.style = s;
          const a = run(null, () => ({ t: 1, s: 0, hb: false }), 12), b = run(() => { c.vz = -30; }, () => ({ t: 0, s: 0.6, hb: false }), 5), h = run(() => { c.vz = -20; }, t => ({ t: 0, s: 1, hb: t < 0.8 }), 1.6);
          // reverse with the wheel turned, and hard braking in a turn held into reverse: the car must not slide away sideways
          const sideMax = (setup, inp, T) => { c.phys = null; c.vx = c.vz = 0; c.h = 0; c.steer = 0; setup && setup(); let mv = 0; for (let i = 0; i < T / dt; i++) { __gm.planarReal(c, inp(i * dt), dt); const [fx, fz] = c.fwd; mv = Math.max(mv, Math.abs(c.vx * fz - c.vz * fx)); } return mv; };
          const rv = Math.max(sideMax(null, t => ({ t: -1, s: t > 1 ? 0.5 : 0, hb: false }), 4), sideMax(() => { c.vz = 8; c.vx = 0.3; }, () => ({ t: -1, s: 0, hb: false }), 3));
          const bk = sideMax(() => { c.vz = -30; }, () => ({ t: -1, s: 0.6, hb: false }), 3);
          out[s] = [+a.t100.toFixed(1), Math.round(b.maxB), Math.round(Math.abs(h.yaw)), +rv.toFixed(1), +bk.toFixed(1)]; }
        c._grip = undefined; c.phys = null; c.style = keep[3]; c.place(keep[0], keep[1], keep[2]); return out; });
      const bad = Object.entries(r).filter(([k, [t100, beta, hb, rv, bk]]) => !(t100 > 1.5 && t100 < (k === 'van' ? 6.5 : 4.5) && beta < 20 && hb > 60 && rv < 4 && bk < 7)); // the van is slow on purpose (cycle 13)
      expect(!bad.length, 'hors limites : ' + JSON.stringify(bad)); return r;
    });
    await check('circulation v2 : feux, sens unique, police contre Rapaces, bus', async () => {
      const r = await ev(() => {
        const X = __gm.gx, T = X.traffic, out = {}; for (let i = 0; i < 3; i++) __gm.step(1 / 30);
        out.feux = T.lights.length; out.stops = T.stops.length; out.lignes = T.busLines.length;
        // a car 30 m before a junction: must stop on red, may go on green
        const j = T.lights[0], c = X.makeNpc('civ'), h = j.ax; c.place(j.x + Math.sin(h) * 30, j.z + Math.cos(h) * 30, h); c.nav = { stopDone: -1, hold: 0 };
        let red = -1, green = -1; for (let t = 0; t < 39; t += 0.5) { T.t = t - j.ph; const st = X.lightState(j, h); const s = X.roadRules(c, 8).stopAt; if (st === 'r' && red < 0) red = s; if (st === 'g' && green < 0) green = s; }
        out.rouge = Math.round(red); out.vert = green > 1e8 ? 'libre' : Math.round(green); __gm.scene.remove(c.mesh);
        // one-way streets: the legal direction only
        const G = __gm.G; let ow = 0, bad = 0;
        for (let a = 0; a < G.x.length; a++) { if (!__gm.nodeOk(a)) continue; for (const b of G.adj[a]) if (!G.out[a].includes(b)) ow++;
          for (const p of G.adj[a]) { if (!G.out[a].some(n => n !== p && __gm.nodeOk(n))) continue; for (let k = 0; k < 6; k++) { const n = X.nextNode(p, a); if (!G.out[a].includes(n)) bad++; } } }
        out.sensUniques = ow; out.contreSens = bad;
        // a police patrol that sees a Rapace goes after it, and the Rapace fights back
        const rv = __gm.rivals().find(o => o.alive) || __gm.rivals()[0]; rv.alive = true; rv.gone = false; rv.proxy = false;
        let na = -1, nb = -1; for (let a = 0; a < G.x.length && na < 0; a++) { if (!__gm.nodeOk(a)) continue; for (const b of G.adj[a]) { const d = Math.hypot(G.x[b] - G.x[a], G.z[b] - G.z[a]); if (d > 25 && d < 45 && __gm.nodeOk(b) && Math.hypot(G.x[a] - 400, G.z[a] - 300) < 300) { na = a; nb = b; break; } } }
        rv.place(G.x[nb], G.z[nb], 0); rv.hp = 100;
        const pc = __gm.locals()[0].car; pc.place(G.x[na] + 160, G.z[na] + 160, 0);
        for (let k = 0; k < 10 && !X.npcs().some(o => o.npc === 'cop' && !o.chase); k++) X.spawnPatrol();
        const cop = X.npcs().filter(o => o.npc === 'cop' && !o.chase).pop();
        if (cop) { cop.place(G.x[na], G.z[na], Math.atan2(-(G.x[nb] - G.x[na]), -(G.z[nb] - G.z[na]))); for (let i = 0; i < 40; i++) __gm.step(1 / 30); out.proie = cop.prey === rv || (cop.prey && cop.prey.ai !== undefined); out.riposte = X.copsOn(rv).length; }
        return out;
      });
      expect(r.feux >= 5 && r.rouge >= 15 && r.rouge <= 22 && r.vert === 'libre', 'feux ' + JSON.stringify(r));
      expect(r.sensUniques > 50 && r.contreSens === 0, 'sens unique ' + JSON.stringify(r));
      expect(r.proie && r.riposte >= 1 && r.lignes > 5, JSON.stringify(r));
      return r;
    });
    await check('ambiance : clôtures cassables, lumières des lampadaires, nuit', async () => {
      const r = await ev(() => {
        const X = __gm.gx, F = X.Fences, c = __gm.locals()[0].car, out = { panneaux: F.count };
        // a wood fence breaks when the car goes through at speed; a garden wall holds a slow car
        const pn = F.panels.find(p => p.kind === 0 && !p.broken), nx = -pn.sa, nz = pn.ca;
        c.place(pn.x + nx * 8, pn.z + nz * 8, 0); c.hp = 100; for (let i = 0; i < 40; i++) { c.vx = -nx * 14; c.vz = -nz * 14; __gm.step(1 / 30); } out.casse = pn.broken;
        const pw = F.panels.find(p => p.kind === 4 && !p.broken), wx = -pw.sa, wz = pw.ca;
        c.place(pw.x + wx * 5, pw.z + wz * 5, 0); for (let i = 0; i < 40; i++) { c.vx = -wx * 2; c.vz = -wz * 2; __gm.step(1 / 30); } out.murTient = !pw.broken && ((c.x - pw.x) * wx + (c.z - pw.z) * wz) > 0.5;
        // the pools of light follow the ground: every vertex just above the surface
        let pool = null; __gm.scene.traverse(o => { if (o.isMesh && o.renderOrder === 3 && o.userData.noTile) pool = o; });
        const a = pool.geometry.attributes.position.array; let worst = 0; for (let i = 0; i < a.length; i += 3 * 37) { const d = a[i + 1] - __gm.surfaceH(a[i], a[i + 2]); worst = Math.max(worst, Math.abs(d - 0.37)); }
        out.ecartSol = +worst.toFixed(3);
        // night: the cars around light the road
        __gm.hd.setTod('night'); __gm.hd.amb.t = 3; c.place(300, 300, 0); for (let i = 0; i < 30; i++) __gm.step(1 / 30);
        out.phares = X.npcs().filter(o => o._hl && o._hl.visible).length;
        // the pools lie on the ground (they used to be a tilted rectangle cutting into the road)
        let worstHl = 0; for (const o of X.npcs()) if (o._hl && o._hl.visible) { const a = o._hl.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 3) worstHl = Math.max(worstHl, Math.abs(a[i + 1] - __gm.surfaceH(a[i], a[i + 2]) - 0.09)); }
        out.pharesSol = +worstHl.toFixed(3); __gm.hd.setTod('day'); __gm.hd.amb.t = 0;
        // a wood fence breaks under gunfire; bullets stop on it
        const pf = F.panels.find(p => p.kind === 0 && !p.broken); c.place(pf.x - pf.sa * 12, pf.z + pf.ca * 12, Math.atan2(-pf.sa, pf.ca)); c.hp = 100;
        for (let i = 0; i < 6 && !pf.broken; i++) __gm.shoot(c, [], 3, 40, 0, false); out.tir = pf.broken;
        out.commissariat = X.policeHQ.built;
        return out;
      });
      expect(r.panneaux > 3000 && r.casse && r.murTient && r.ecartSol < 0.01 && r.pharesSol < 0.01 && r.tir && r.commissariat, JSON.stringify(r)); return r;
    });
    await check('détail visuel : eau à sa place, bouclier visible, niveaux de détail', async () => {
      const r = await ev(async () => {
        const out = {};
        // water outlines lie at their lowest point (the Misery pond used to hang as a floor 17 m up)
        let maxUp = 0; const wm = __gm.scene.getObjectByName('eaux');
        if (wm) { const p = wm.geometry.attributes.position; for (let i = 0; i < p.count; i++) maxUp = Math.max(maxUp, p.getY(i) - __gm.groundH(p.getX(i), p.getZ(i))); }
        out.eauAuDessus = +maxUp.toFixed(2);
        // shield: the field shader writes the logarithmic depth like everything else
        const c = __gm.locals()[0].car; c.shield = 5; __gm.step(1 / 30); out.bouclierLogDepth = !!(c.bubble && /logdepthbuf_vertex/.test(c.bubble.material.vertexShader)); c.shield = 0; __gm.step(1 / 30);
        // level of detail: far tiles of small objects hidden
        const L = __gm.locals()[0]; L.cam.position.set(-300, 200, -700); __gm.Tiles.lod(1, [L.cam]); out.tuilesCachees = __gm.Tiles.info.hidden;
        return out;
      });
      expect(r.eauAuDessus < 1.5 && r.bouclierLogDepth && r.tuilesCachees > 0, JSON.stringify(r)); return r;
    });
    await check('courses et défis : départ, points de passage, record, défis', async () => {
      await skipDialogue();
      const r = await ev(() => {
        const X = __gm.gx, A = X.acts(), L = __gm.locals()[0], c = L.car, out = { activites: A.length };
        L.ammo = { rockets: 2 }; __gm.step(1 / 30); out.armes = /2/.test(document.getElementById('ammo').textContent); // the weapon line still updates (a function of the activities once replaced it)
        const race = A.find(a => a.id === 'r_lib'); out.longueur = Math.round(race.len); out.points = race.cps.length;
        const txt = () => document.querySelector('#objective .oText').textContent, ttl = () => document.querySelector('#objective .oTitle').textContent;
        c.place(race.start[0] + 20, race.start[1], 0); c.hp = 100; __gm.step(1 / 30); out.indice = /Arrête-toi dans la balise/.test(txt()) && /Course/.test(ttl());
        c.place(race.start[0], race.start[1], 0); __gm.step(1 / 30); __gm.step(1 / 30); out.depart = !!X.actRun();
        for (let i = 0; i < 90; i++) __gm.step(1 / 30); out.consigne = /Suis les balises bleues/.test(txt()) && /Départ dans/.test(txt()) && X.actRun().count > 0; // still readable after 3 s
        for (let i = 0; i < 130; i++) __gm.step(1 / 30); out.enCourse = /flèche/.test(txt()); // briefing over
        for (let k = 1; k < race.cps.length; k++) { const [x, z] = race.cps[k]; for (let i = 0; i < 12; i++) { c.place(x, z, c.h); c.hp = 100; __gm.step(1 / 30); } }
        out.fini = !X.actRun(); out.record = __gm.Profile.cur.records.race_r_lib; out.fantome = (__gm.Profile.cur.records.ghost_r_lib || []).length;
        for (let i = 0; i < 90; i++) __gm.step(1 / 30); out.resultat = /Sprint/.test(ttl()) && !document.getElementById('objective').hidden; // the result is still shown 3 s later
        for (let i = 0; i < 140; i++) __gm.step(1 / 30);
        const smash = A.find(a => a.id === 'd_smash'); c.place(smash.start[0], smash.start[1], 0); __gm.step(1 / 30); __gm.step(1 / 30); out.defi = X.actRun() && X.actRun().a.id;
        c.shield = 0; __gm.damage(c, 1000); __gm.step(1 / 30); out.abandon = !X.actRun(); for (let i = 0; i < 200 && !c.alive; i++) __gm.step(1 / 30); c.hp = 100; c.place(61, 276, 0);
        return out;
      });
      expect(r.activites === 8 && r.longueur > 250 && r.depart && r.fini && r.record > 0 && r.fantome > 3 && r.defi === 'd_smash' && r.abandon && r.indice && r.consigne && r.enCourse && r.resultat && r.armes, JSON.stringify(r)); return r;
    });
    await check('monde ouvert : cartes postales et déblocages', async () => {
      const r = await ev(() => {
        const X = __gm.gx, P = __gm.Profile, c = __gm.locals()[0].car, out = { lieux: X.spots.length, sportAvant: X.unlocked('sport') };
        P.cur.found.length = 0;
        for (const s of X.spots.slice(0, 5)) { c.place(s.x, s.z, 0); c.hp = 100; for (let i = 0; i < 20; i++) __gm.step(1 / 30); }
        out.trouves = P.cur.found.length; out.sportApres = X.unlocked('sport'); out.policeVerrou = !X.unlocked('police');
        out.cartes = X.postcards().filter(p => p.text).length;
        P.cur.found.length = 0; c.place(61, 276, 0); return out;
      });
      expect(r.lieux >= 8 && r.trouves === 5 && r.sportApres && r.cartes === 5, JSON.stringify(r)); return r;
    });
    await check('garages réels', async () => {
      const r = await ev(() => __gm.gx.garages.map(g => g.name)); expect(r.length >= 3, 'garages : ' + r.join(', '));
      // (cycle 12) the workshops: the forecourt no longer opens the menu, the inside does
      const w = await ev(() => __gm.gx.garages.map(g => !!g.shop));
      const front = await ev(() => { const g = __gm.gx.garages[1], L = __gm.locals()[0]; L.car.place(g.x, g.z, 0); L.car.vx = L.car.vz = 0; for (let i = 0; i < 8; i++) __gm.step(1 / 30); return !document.getElementById('garage').hidden; });
      await ev(() => { const g = __gm.gx.garages[1], L = __gm.locals()[0], s = g.shop; L.respect = 5000; if (s) L.car.place(s.ox + s.nx * 6, s.oz + s.nz * 6, Math.atan2(-s.nx, -s.nz)); else L.car.place(g.x + 1, g.z + 1, 0); L.car.vx = L.car.vz = 0; for (let i = 0; i < 8; i++) __gm.step(1 / 30); });
      await page.waitForTimeout(500);
      const t = await ev(() => { const e = document.getElementById('garage'); return !e.hidden && e.querySelector('h2').textContent; });
      // (cycle 12) settings and cars bought in the garage
      const shop = await ev(() => {
        const L = __gm.locals()[0], click = txt => { const b = [...document.querySelectorAll('#garage .gItem')].find(x => x.textContent.startsWith(txt)); if (b) b.click(); return !!b; };
        const style0 = L.car.style; click('Pneus sport'); const grip = (L.car.tune || {}).grip;
        const other = style0 === 'twingo' ? 'R5' : 'Twingo'; click('Acheter la ' + other); const style1 = L.car.style, grip1 = (L.car.tune || {}).grip || 0;
        click('Prendre la '); const back = L.car.style;
        return { grip, style1, grip1, back, owned: (__gm.settings.owned || []).length, reste: L.respect };
      });
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      expect(shop.grip === 1 && shop.style1 !== shop.back && shop.grip1 === 0 && shop.owned >= 2, 'achats au garage ' + JSON.stringify(shop));
      expect(t === r[1] && (!w[1] || !front), 'menu du garage : ' + t + ' · devant : ' + front + ' · ateliers ' + JSON.stringify(w)); return { garages: r, ateliers: w };
    });
    await check('changement d’arme', async () => {
      const r = await ev(() => { const L = __gm.locals()[0]; L.ammo = { rockets: 2, mines: 3, nitro: 1 }; L.weapon = 'rockets'; const s = []; for (let i = 0; i < 3; i++) { __gm.gx.cycleWeapon(L); s.push(L.weapon); } return s; });
      expect(r.join() === 'mines,nitro,rockets', r.join()); return r;
    });
    await check('message de KO (police, accident)', async () => {
      const r = await ev(() => { const L = __gm.locals()[0], c = L.car, get = () => (document.body.innerText.match(/(Tu t’es planté[^\n]*|Démoli par[^\n]*)/) || [''])[0];
        c.alive = true; c.hp = 100; c.shield = 0; c.lastBot = null; __gm.damage(c, 500); const a = get();
        const cop = { npc: 'cop', local: false, alive: true, x: c.x, z: c.z }; c.alive = true; c.hp = 100; __gm.damage(c, 500, cop); const b = get();
        c.alive = true; c.hp = 100; for (let i = 0; i < 5; i++) __gm.step(1 / 30); return [a, b]; });
      expect(/planté/.test(r[0]) && /police/.test(r[1]), JSON.stringify(r)); return r;
    });
    await check('les 7 missions démarrent', async () => {
      await ev(() => { __gm.settings.camp = { done: ['retour', 'jeanmace', 'gare', 'vautour', 'police', 'quais'] }; });
      const out = [];
      for (let i = 0; i < 7; i++) {
        await ev(i => __gm.gx.startMission(i), i); await page.waitForTimeout(400); await skipDialogue();
        out.push(await ev(() => { const m = __gm.gx.mission; for (let k = 0; k < 30; k++) __gm.step(1 / 30); return m.id + (m.live ? '' : '?') + (__gm.locals()[0].car.alive ? '' : '!'); }));
      }
      await ev(() => __gm.gx.cleanupMission()); expect(out.every(s => !/[!?]$/.test(s)), out.join()); return out;
    });
    await check('mort en mission : reprise de zéro', async () => {
      await ev(() => __gm.gx.startMission(4)); await page.waitForTimeout(400); await skipDialogue();
      const r = await ev(() => { const m = __gm.gx.mission, L = __gm.locals()[0]; const resp0 = L.respect; L.respect += 300;
        L.car.shield = 0; __gm.damage(L.car, 500); for (let k = 0; k < 70; k++) __gm.step(1 / 30); return { live: m.live, respect: L.respect === resp0 }; });
      let txt = '';
      for (let k = 0; k < 20 && !txt; k++) { await page.waitForTimeout(500); txt = await ev(() => { const e = document.getElementById('mres'); return e && !e.hidden ? e.innerText : ''; }); }
      await ev(() => __gm.gx.cleanupMission());
      expect(!r.live && r.respect && /depuis le début/.test(txt), JSON.stringify(r) + ' ' + txt.slice(0, 80)); return r;
    });
  }
  await check('aucune erreur de page', async () => { expect(!errs.length, errs.slice(0, 5).join(' | ')); });

  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log((failed ? failed + ' échec(s)' : 'tout est bon') + ' sur ' + results.length + ' vérifications');
  const rec = opt('record');
  if (rec && perf) {
    let all = []; try { all = JSON.parse(fs.readFileSync(rec, 'utf8')); } catch (e) { }
    all.push({ date: new Date().toISOString().slice(0, 16), label: opt('label') || '', build: path.basename(file), ...perf, failed });
    fs.writeFileSync(rec, JSON.stringify(all, null, 1) + '\n');
  }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
