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
    await check('garages réels', async () => {
      const r = await ev(() => __gm.gx.garages.map(g => g.name)); expect(r.length >= 3, 'garages : ' + r.join(', '));
      await ev(() => { const g = __gm.gx.garages[1], L = __gm.locals()[0]; L.car.place(g.x + 1, g.z + 1, 0); L.car.vx = L.car.vz = 0; for (let i = 0; i < 8; i++) __gm.step(1 / 30); });
      await page.waitForTimeout(500);
      const t = await ev(() => { const e = document.getElementById('garage'); return !e.hidden && e.querySelector('h2').textContent; });
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      expect(t === r[1], 'menu du garage : ' + t); return r;
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
