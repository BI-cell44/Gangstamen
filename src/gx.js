// >>> GAMEPLAY MODULE (HD build)
// ================= street life and the solo campaign =================
// Civilian traffic (R5, 205, Twingo), pedestrians who get out of the way, the police when the damage piles up.
// Inlined into the template by build.sh, inside the game's closure: it reads and drives the same state as the core.
const gx = !HD ? null : (() => {
  let mission = null, gx_onGarage = null;
  const npcs = [];          // civilian cars and police cars (Car objects with .npc = 'civ' | 'cop')
  const peds = [];
  let active = false, mapDots = [];
  const R = Math.random;
  const near = (c, x, z) => Math.hypot(c.x - x, c.z - z);
  const players = () => locals.map(L => L.car);
  const minPlayerDist = (x, z) => { let d = 1e9; for (const c of players()) d = Math.min(d, near(c, x, z)); return d; };
  const heading = (ax, az, bx, bz) => Math.atan2(-(bx - ax), -(bz - az));
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const CIV_PAINT = [0xc8c8c4, 0xa31d1d, 0x1d3f8a, 0xe8e0c8, 0x2b6b3a, 0xd8a400, 0x6a6a72, 0x8a1d4a, 0x2a2a2e, 0x4fa0c8, 0xe86a1a, 0x9ab84a];
  const CIV_STYLES = ['r5', 'p205', 'twingo', 'r5', 'p205', 'twingo', 'hatch'];
  // limits scale with the number of screens
  const budget = () => { const n = Math.max(1, locals.length); return { civ: [14, 10, 8, 7][n - 1], peds: [36, 26, 20, 16][n - 1] }; };

  // ---------- civilian traffic ----------
  function laneTarget(a, b) { // a point on the right-hand side of the street, towards node b
    const ax = G.x[a], az = G.z[a], bx = G.x[b], bz = G.z[b], L = Math.hypot(bx - ax, bz - az) || 1;
    const ux = (bx - ax) / L, uz = (bz - az) / L, lane = 1.7; // France drives on the right: right of travel is (-uz, ux)
    return [bx - uz * lane, bz + ux * lane];
  }
  function spawnNode(minD, maxD) {
    const ps = players(); if (!ps.length) return -1;
    for (let k = 0; k < 60; k++) {
      const n = (R() * G.x.length) | 0; if (!G.adj[n].length) continue;
      const x = G.x[n], z = G.z[n]; if (Math.abs(x) > HX - 10 || Math.abs(z) > HZ - 10) continue;
      const d = minPlayerDist(x, z); if (d < minD || d > maxD) continue;
      if (npcs.some(o => near(o, x, z) < 14)) continue;
      return n;
    }
    return -1;
  }
  function makeNpc(kind) {
    const style = kind === 'cop' ? 'saloon' : CIV_STYLES[(R() * CIV_STYLES.length) | 0];
    const paint = kind === 'cop' ? 0xeef0f2 : CIV_PAINT[(R() * CIV_PAINT.length) | 0];
    const mesh = makeCar(paint, kind === 'cop' ? 0x1b2f8a : null, false, style, { guns: false, police: kind === 'cop' });
    const c = new Car(mesh, false);
    c.npc = kind; c.team = kind === 'cop' ? -3 : -2; c.hp = kind === 'cop' ? 70 : 40; c.style = style;
    return c;
  }
  function placeOnGraph(c, n) {
    const nb = G.adj[n][(R() * G.adj[n].length) | 0];
    c.place(G.x[n], G.z[n], heading(G.x[n], G.z[n], G.x[nb], G.z[nb]));
    c.ai = null; c.nav = { a: n, b: nb, wait: 0, honk: 0, panic: 0, stuck: 0, back: 0 };
    c.alive = true; c.dead = 0; c.mesh.visible = true;
  }
  function spawnCiv() {
    const n = spawnNode(90, 260); if (n < 0) return;
    const c = makeNpc('civ'); placeOnGraph(c, n); npcs.push(c);
  }
  function removeNpc(c) { const i = npcs.indexOf(c); if (i >= 0) npcs.splice(i, 1); scene.remove(c.mesh); c.mesh.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); }); }
  function blockedAhead(c, range) { // nearest car in a narrow cone ahead
    const [fx, fz] = c.fwd; let best = 1e9;
    for (const o of [...allPlayerCars(), ...rivals, ...npcs]) {
      if (o === c || !o.mesh.visible) continue;
      const dx = o.x - c.x, dz = o.z - c.z, along = dx * fx + dz * fz; if (along < 0 || along > range) continue;
      if (Math.abs(dx * fz - dz * fx) < 2.4 && along < best) best = along;
    }
    return best;
  }
  function civInput(c, dt) {
    const nv = c.nav;
    let [tx, tz] = laneTarget(nv.a, nv.b);
    if (Math.hypot(tx - c.x, tz - c.z) < 6) {
      const opts = G.adj[nv.b].filter(n => n !== nv.a);
      const nx = opts.length ? opts[(R() * opts.length) | 0] : nv.a;
      nv.a = nv.b; nv.b = nx; [tx, tz] = laneTarget(nv.a, nv.b);
    }
    const want = heading(c.x, c.z, tx, tz), diff = wrapA(want - c.h), vf = c.vx * c.fwd[0] + c.vz * c.fwd[1];
    let s = Math.max(-1, Math.min(1, diff * 2)), cruise = nv.panic > 0 ? 15 : 10.5;
    if (Math.abs(diff) > 0.6) cruise = 5;
    const blk = blockedAhead(c, 11 + vf * 0.6);
    let t = vf < cruise ? 0.7 : 0;
    if (blk < 5 + vf * 0.5) { t = vf > 0.8 ? -1 : 0; nv.wait += dt; } else nv.wait = 0;
    if (nv.wait > 2.5 && nv.honk <= 0 && minPlayerDist(c.x, c.z) < 40) { sfx.horn && sfx.horn(); nv.honk = 4 + R() * 3; }
    nv.honk -= dt; nv.panic -= dt;
    if (nv.back > 0) { nv.back -= dt; return { t: -1, s: -s, hb: false }; }
    if (t > 0 && c.speed < 0.8) { nv.stuck += dt; if (nv.stuck > 2.5) { nv.back = 1.2; nv.stuck = 0; } } else nv.stuck = 0;
    return { t, s, hb: false };
  }

  // ---------- police ----------
  const heat = L => L.heat || 0;
  const stars = L => Math.min(5, Math.floor(heat(L)));
  function addHeat(by, amount, why) {
    const L = by && by.local ? by.owner : null; if (!L || mode === 'online' && false) return;
    if (!policeOn()) return;
    const before = stars(L); L.heat = Math.min(5.99, heat(L) + amount); L.calm = 0;
    if (stars(L) > before) { flashFor(L, '★'.repeat(stars(L)) + ' POLICE', stars(L) === 1 ? 'Les flics ont vu ça' : stars(L) >= 4 ? 'Toutes les patrouilles sur vous' : 'Renforts en route'); if (gx.dj) gx.dj('police', stars(L)); }
  }
  function policeOn() { return !(mission && mission.noPolice); }
  function spawnCop(L) {
    const n = spawnNode(110, 220); if (n < 0) return;
    const c = makeNpc('cop'); placeOnGraph(c, n); c.ai = { mode: 'hunt' }; c.chase = L; c.lost = 0; c.fireCd = 1; npcs.push(c);
  }
  function copInput(c, dt) {
    const L = c.chase;
    if (!L || stars(L) < 1 || !L.car.alive) { c.ai = null; c.chase = null; return civInput(c, dt); }
    const T = L.car, d = near(c, T.x, T.z);
    const los = d < 120 && segHit(c.x, c.z, (T.x - c.x) / d, (T.z - c.z) / d, d) >= d - 0.5;
    if (los && d < 90) { c.lost = 0; L.calm = 0; } else c.lost += dt;
    const tx = T.x + T.vx * Math.min(1.2, d / 30), tz = T.z + T.vz * Math.min(1.2, d / 30);
    let gx_ = tx, gz = tz;
    if (!los && d > 25) { // follow the streets towards the player
      const n0 = c.nav.b; let best = n0, bd = Math.hypot(G.x[n0] - T.x, G.z[n0] - T.z);
      if (Math.hypot(G.x[n0] - c.x, G.z[n0] - c.z) < 7) {
        for (const nb of G.adj[n0]) { const dd = Math.hypot(G.x[nb] - T.x, G.z[nb] - T.z); if (dd < bd || best === n0) { bd = dd; best = nb; } }
        c.nav.a = n0; c.nav.b = best;
      }
      gx_ = G.x[c.nav.b]; gz = G.z[c.nav.b];
    }
    const diff = wrapA(heading(c.x, c.z, gx_, gz) - c.h);
    const s = Math.max(-1, Math.min(1, diff * 2.4));
    let t = Math.abs(diff) > 1.3 ? 0.5 : 1;
    const nv = c.nav;
    if (nv.back > 0) { nv.back -= dt; return { t: -1, s: -s, hb: false }; }
    if (c.speed < 1.2) { nv.stuck += dt; if (nv.stuck > 1.4) { nv.back = 1; nv.stuck = 0; } } else nv.stuck = 0;
    c.fireCd -= dt;
    if (stars(L) >= 3 && los && d < 55 && Math.abs(diff) < 0.2 && c.fireCd <= 0) { c.fireCd = 0.22; shoot(c, [T], 1.3, 60, 0.12, true); }
    return { t, s, hb: Math.abs(diff) > 1.1 && c.speed > 12 };
  }

  // ---------- pedestrians ----------
  let walks = null; // sidewalk polylines beside the drivable streets
  function buildWalks() {
    walks = [];
    for (const r of W.roads) {
      if (!r.d || r.b || r.w < 5) continue;
      const p = r.p, n = p.length / 2; if (n < 2) continue;
      for (const side of [-1, 1]) {
        const out = [];
        for (let i = 0; i < n; i++) {
          const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
          let dx = p[2 * i1] - p[2 * i0], dz = p[2 * i1 + 1] - p[2 * i0 + 1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
          const off = r.w / 2 + 1.5, x = p[2 * i] - dz * off * side, z = p[2 * i + 1] + dx * off * side;
          if (Math.abs(x) > HX - 5 || Math.abs(z) > HZ - 5 || groundH(x, z) < WATER_Y + 1) { if (out.length > 3) walks.push(out.slice()); out.length = 0; continue; }
          out.push(x, z);
        }
        if (out.length > 3) walks.push(out);
      }
    }
  }
  const SKIN = [0xe8c3a0, 0xc99a74, 0x8d5a3c, 0x5c3a28, 0xf0d2b8];
  const TOPS = [0xd63a8a, 0x2a8ad6, 0x2ad6a0, 0xf2c81e, 0xe8e2d0, 0x6a2ad6, 0xd65a2a, 0x1a1a1a, 0x3a6a2a, 0xc81e1e];
  const BOTTOMS = [0x2a3a6a, 0x1a1a1a, 0x5a4a3a, 0x3a5a8a, 0x6a6a72];
  const pedGeo = { torso: new THREE.BoxGeometry(0.44, 0.6, 0.26), head: new THREE.SphereGeometry(0.14, 10, 8), leg: new THREE.BoxGeometry(0.15, 0.78, 0.17).translate(0, -0.39, 0), arm: new THREE.BoxGeometry(0.11, 0.6, 0.12).translate(0, -0.3, 0), hair: new THREE.SphereGeometry(0.15, 10, 6, 0, 6.283, 0, 1.6) };
  for (const g of Object.values(pedGeo)) g.userData.shared = true;
  const pedMats = new Map();
  const pmat = col => { let m = pedMats.get(col); if (!m) { m = new THREE.MeshStandardMaterial({ color: hd.lin(col), roughness: 0.85 }); pedMats.set(col, m); } return m; };
  function makePed() {
    const g = new THREE.Group(), pick = a => a[(R() * a.length) | 0];
    const skin = pmat(pick(SKIN)), top = pmat(pick(TOPS)), bot = pmat(pick(BOTTOMS));
    const torso = new THREE.Mesh(pedGeo.torso, top); torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
    const head = new THREE.Mesh(pedGeo.head, skin); head.position.y = 1.58; g.add(head);
    const hair = new THREE.Mesh(pedGeo.hair, pmat(pick([0x1a120a, 0x3a2412, 0x8a6a3a, 0xd8c890, 0x101010]))); hair.position.y = 1.6; g.add(hair);
    const legs = [-0.11, 0.11].map(x => { const m = new THREE.Mesh(pedGeo.leg, bot); m.position.set(x, 0.8, 0); g.add(m); return m; });
    const arms = [-0.29, 0.29].map(x => { const m = new THREE.Mesh(pedGeo.arm, top); m.position.set(x, 1.38, 0); g.add(m); return m; });
    g.traverse(o => { o.userData.hdLinear = true; });
    scene.add(g);
    return { g, legs, arms, w: 0, t: 0, dir: R() < 0.5 ? 1 : -1, speed: 1.1 + R() * 0.6, ox: 0, oz: 0, fvx: 0, fvz: 0, state: 'walk', timer: 0, phase: R() * 6, x: 0, z: 0, h: 0 };
  }
  function placePed(p) {
    const ps = players(); if (!ps.length || !walks.length) return false;
    for (let k = 0; k < 40; k++) {
      const w = (R() * walks.length) | 0, pl = walks[w], i = ((R() * (pl.length / 2 - 1)) | 0);
      const x = pl[2 * i], z = pl[2 * i + 1], d = minPlayerDist(x, z);
      if (d < 40 || d > 170) continue;
      Object.assign(p, { w, t: i + R() * 0.9, ox: 0, oz: 0, state: 'walk', timer: 0 }); p.g.visible = true; p.g.rotation.set(0, 0, 0);
      return true;
    }
    return false;
  }
  function pedStep(p, dt) {
    const pl = walks[p.w], n = pl.length / 2;
    let i = Math.floor(p.t), f = p.t - i; if (i >= n - 1) { i = n - 2; f = 1; }
    const ax = pl[2 * i], az = pl[2 * i + 1], bx = pl[2 * i + 2], bz = pl[2 * i + 3], L = Math.hypot(bx - ax, bz - az) || 1;
    const hx = (bx - ax) / L * p.dir, hz = (bz - az) / L * p.dir;
    let moving = 0;
    if (p.state === 'walk') {
      p.t += p.dir * p.speed * dt / L; moving = p.speed;
      if (p.t <= 0) { p.t = 0; p.dir = 1; } if (p.t >= n - 1) { p.t = n - 1.001; p.dir = -1; }
      const ol = Math.hypot(p.ox, p.oz); if (ol > 0.01) { const k = Math.min(ol, dt * 1.2) / ol; p.ox -= p.ox * k; p.oz -= p.oz * k; }
      p.h = Math.atan2(hx, hz);
    } else if (p.state === 'flee') {
      p.ox += p.fvx * dt; p.oz += p.fvz * dt; moving = 5.5; p.timer -= dt; p.h = Math.atan2(p.fvx, p.fvz);
      if (p.timer <= 0) p.state = 'walk';
    } else if (p.state === 'down') {
      p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; p.g.rotation.x = 0; }
    }
    p.x = ax + (bx - ax) * f + p.ox; p.z = az + (bz - az) * f + p.oz;
    // watch out for cars
    if (p.state !== 'down') for (const c of [...allPlayerCars(), ...rivals, ...npcs]) {
      if (!c.alive || c.speed < 3) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d > 14) continue;
      const vx = c.vx / c.speed, vz = c.vz / c.speed, along = dx * vx + dz * vz, lat = dx * vz - dz * vx;
      if (d < 2.3) { // too late: knocked over, gets back up a bit later
        p.state = 'down'; p.timer = 2.5 + R(); p.ox += vx * 1.5; p.oz += vz * 1.5; sfx.hit();
        if (c.local) { addHeat(c, 0.7); shout(c, true); }
        break;
      }
      if (along > 0 && along < c.speed * 1.4 + 3 && Math.abs(lat) < 3.2 && p.state === 'walk') {
        const sg = lat >= 0 ? 1 : -1; p.state = 'flee'; p.timer = 0.9 + R() * 0.4;
        p.fvx = vz * sg * 6.5; p.fvz = -vx * sg * 6.5;
        if (c.local) shout(c, false);
        break;
      }
    }
    const y = surfaceH(p.x, p.z) + 0.36;
    p.g.position.set(p.x, y, p.z); p.g.rotation.y = p.h;
    if (p.state === 'down') { p.g.rotation.x = -Math.PI / 2; p.g.position.y = y + 0.2; return; }
    p.phase += dt * moving * 3.2;
    const sw = Math.sin(p.phase) * Math.min(0.8, moving * 0.35);
    p.legs[0].rotation.x = sw; p.legs[1].rotation.x = -sw;
    if (p.state === 'flee') { p.arms[0].rotation.x = p.arms[1].rotation.x = Math.PI * 0.85; } else { p.arms[0].rotation.x = -sw * 0.8; p.arms[1].rotation.x = sw * 0.8; }
  }
  let shoutCd = 0;
  const SHOUTS = ['Hé, chauffard !', 'Non mais ça va pas ?', 'Espèce de malade !', 'Attention !', 'Ralentis, toi !', 'Oh là là !'];
  function shout(c, hard) {
    if (shoutCd > 0 || !c.local) return; shoutCd = hard ? 3 : 7;
    if (R() < (hard ? 0.9 : 0.35)) say(SHOUTS[(R() * SHOUTS.length) | 0], { rate: 1.25, pitch: 0.9 + R() * 0.8, vol: 0.7 });
  }

  // ---------- voices (speech synthesis, French when the browser has a voice for it) ----------
  let voice = null;
  function pickVoice() { try { const v = speechSynthesis.getVoices(); voice = v.find(x => /^fr/i.test(x.lang)) || null; } catch (e) { } }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { }
  function say(text, o = {}) {
    if (!settings.voices || !window.speechSynthesis) return;
    try {
      if (o.cancel) speechSynthesis.cancel(); else if (speechSynthesis.speaking && !o.queue) return;
      const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; if (voice) u.voice = voice;
      u.rate = o.rate || 1.05; u.pitch = o.pitch || 1; u.volume = (o.vol ?? 0.9) * Math.max(0.2, settings.fx);
      speechSynthesis.speak(u);
    } catch (e) { }
  }

  // ---------- per frame ----------
  function step(dt) {
    if (!active) return;
    shoutCd -= dt;
    const B = budget();
    // traffic: top up, remove the far ones and the wrecks
    const civs = npcs.filter(c => c.npc === 'civ').length;
    if (civs < B.civ && R() < dt * 4) spawnCiv();
    for (const c of npcs.slice()) {
      const d = minPlayerDist(c.x, c.z);
      if (!c.alive) { c.dead += dt; c.vx *= 0.95; c.vz *= 0.95; c.x += c.vx * dt; c.z += c.vz * dt; if (c.dead > 12 || d > 300) removeNpc(c); continue; }
      if (d > 340 || (c.npc === 'cop' && !c.chase && d > 200)) { removeNpc(c); continue; }
      const inp = c.npc === 'cop' && c.chase ? copInput(c, dt) : civInput(c, dt);
      drive(c, inp, dt);
      if (c.npc === 'cop' && c.mesh.userData.siren) { // blue lights, alternating
        const on = !!c.chase, ph = (performance.now() / 1000 * 3.4) % 1;
        c.mesh.userData.siren[0].emissiveIntensity = on ? (ph < 0.5 ? 14 : 0.3) : 0.3; c.mesh.userData.siren[1].emissiveIntensity = on ? (ph >= 0.5 ? 14 : 0.3) : 0.3;
        if (on && ph < 0.05 && R() < 0.5) hd.flashAt(c.x, c.mesh.position.y + 2.2, c.z, 0.15, 0.3, 1.2, 6, 0.12);
      }
    }
    // police: wanted levels per local player
    let sirenD = 1e9, sirenOn = false;
    for (const L of locals) {
      if (!heat(L)) continue;
      const mine = npcs.filter(c => c.npc === 'cop' && c.chase === L && c.alive);
      const want = [0, 1, 2, 3, 4, 5][stars(L)];
      if (mine.length < want && R() < dt * 0.6) spawnCop(L);
      const seen = mine.some(c => c.lost < 4);
      L.calm = (L.calm || 0) + dt;
      if (!seen || L.calm > 12) L.heat = Math.max(0, heat(L) - dt * (seen ? 0.03 : 0.12));
      if (heat(L) < 1 && L.heat > 0 && L.wasWanted) { L.heat = 0; flashFor(L, 'Semés !', 'La police abandonne'); }
      L.wasWanted = heat(L) >= 1;
      for (const c of mine) { sirenOn = true; sirenD = Math.min(sirenD, near(c, L.car.x, L.car.z)); }
    }
    sfx.siren && sfx.siren(sirenOn ? Math.max(0, 1 - sirenD / 160) : 0);
    // pedestrians
    if (!walks) buildWalks();
    while (peds.length < B.peds) { const p = makePed(); if (!placePed(p)) { scene.remove(p.g); break; } peds.push(p); }
    for (const p of peds) {
      if (!p.g.visible || minPlayerDist(p.x, p.z) > 200) { if (!placePed(p)) p.g.visible = false; continue; }
      pedStep(p, dt);
    }
    updateWanted();
  }
  function updateWanted() {
    const el = $('wanted'); if (!el) return;
    const L = locals[0]; const n = L ? stars(L) : 0;
    el.parentNode.hidden = !n || locals.length > 1;
    const txt = '★'.repeat(n) + '☆'.repeat(5 - n); if (el.textContent !== txt) el.textContent = txt;
  }
  function damageNpc(c, d, by) {
    if (!c.alive) return;
    c.hp -= d;
    if (by && by.local) { addHeat(by, d * (c.npc === 'cop' ? 0.05 : 0.025)); if (c.npc === 'civ') { c.nav.panic = 8; } }
    if (c.npc === 'civ' && by && by.local && !c.chase && c.npc === 'civ' && c.hp > 0 && R() < 0.02) sfx.horn && sfx.horn();
    if (c.hp > 0) return;
    c.alive = false; c.dead = 0; explode(c.x, c.z);
    c.mesh.userData.mBody.color.setHex(0x1a1414);
    if (by && by.local) { addHeat(by, c.npc === 'cop' ? 1.6 : 1.1); if (gx.dj) gx.dj(c.npc === 'cop' ? 'copko' : 'civko'); }
    if (gx.onNpcDown) gx.onNpcDown(c, by);
  }
  function start(kind) {
    for (const c of npcs.slice()) removeNpc(c);
    for (const L of locals) { L.heat = 0; L.calm = 0; }
    active = settings.traffic !== false;
    for (const p of peds) p.g.visible = false;
    if (!active) return;
    for (let i = 0; i < budget().civ; i++) spawnCiv();
  }
  function cars() { return npcs; }
  function minimap(me, add) { // police as blinking blue dots on the minimap
    for (const c of npcs) if (c.alive && c.npc === 'cop' && c.chase) add(c, (performance.now() / 300 | 0) % 2 ? '#3a6aff' : '#ffffff');
  }
  // =====================================================================================
  // shared helpers: markers, routes, dialogue, extra cars driven by the missions
  // =====================================================================================
  const extras = [];             // mission cars that are neither players, Rapaces nor traffic (escort, fugitive)
  let blocking = false;          // a dialogue or the garage menu has the screen: the world waits
  const markers = [];
  const beaconGeo = new THREE.CylinderGeometry(1, 1, 70, 24, 1, true).translate(0, 35, 0);
  const ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  function addMarker(x, z, r, colour, label) {
    const c = new THREE.Color(colour);
    const mb = new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beam = new THREE.Mesh(beaconGeo, mb), ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(3), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    beam.scale.set(r * 0.5, 1, r * 0.5); ring.scale.setScalar(r);
    const y = surfaceH(x, z); beam.position.set(x, y, z); ring.position.set(x, y + 0.45, z);
    beam.renderOrder = ring.renderOrder = 24; beam.userData.hdLinear = ring.userData.hdLinear = true;
    scene.add(beam, ring);
    const m = { x, z, r, colour, label, beam, ring, set(nx, nz) { m.x = nx; m.z = nz; const yy = surfaceH(nx, nz); beam.position.set(nx, yy, nz); ring.position.set(nx, yy + 0.45, nz); } };
    markers.push(m); return m;
  }
  function clearMarkers() { for (const m of markers) scene.remove(m.beam, m.ring); markers.length = 0; }
  function nearestNodeTo(x, z) { let b = 0, bd = 1e18; for (let i = 0; i < G.x.length; i++) { if (!G.adj[i].length) continue; const d = (G.x[i] - x) ** 2 + (G.z[i] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
  function route(ax, az, bx, bz) { // shortest path on the street graph, as a list of [x, z]
    const s0 = nearestNodeTo(ax, az), t = nearestNodeTo(bx, bz), N = G.x.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done_ = new Uint8Array(N);
    dist[s0] = 0;
    for (;;) { // small graph: a plain O(N^2) Dijkstra is fine
      let u = -1, bd = Infinity; for (let i = 0; i < N; i++) if (!done_[i] && dist[i] < bd) { bd = dist[i]; u = i; }
      if (u < 0 || u === t) break; done_[u] = 1;
      for (const v of G.adj[u]) { const d = bd + Math.hypot(G.x[v] - G.x[u], G.z[v] - G.z[u]); if (d < dist[v]) { dist[v] = d; prev[v] = u; } }
    }
    const out = []; for (let v = t; v >= 0; v = prev[v]) out.unshift([G.x[v], G.z[v]]);
    return out.length ? out : [[bx, bz]];
  }
  function followRoute(c, rt, dt, cruise, opts = {}) { // drive input that follows a route; returns true at the end
    c.ri = c.ri || 0;
    while (c.ri < rt.length - 1 && Math.hypot(rt[c.ri][0] - c.x, rt[c.ri][1] - c.z) < 8) c.ri++;
    const [tx, tz] = rt[c.ri];
    const diff = wrapA(heading(c.x, c.z, tx, tz) - c.h), vf = c.vx * c.fwd[0] + c.vz * c.fwd[1];
    const s = Math.max(-1, Math.min(1, diff * 2.3));
    let want = Math.abs(diff) > 0.7 ? Math.min(cruise, 9) : cruise;
    if (opts.wait) want = 0;
    let t = vf < want ? 1 : (vf > want + 3 ? -0.6 : 0);
    if (opts.careful) { const blk = blockedAhead(c, 8 + vf * 0.5); if (blk < 4 + vf * 0.4) t = vf > 0.5 ? -1 : 0; }
    c.nav = c.nav || { stuck: 0, back: 0 };
    if (c.nav.back > 0) { c.nav.back -= dt; return [{ t: -1, s: -s, hb: false }, false]; }
    if (t > 0 && c.speed < 1) { c.nav.stuck += dt; if (c.nav.stuck > 1.6) { c.nav.back = 1; c.nav.stuck = 0; } } else c.nav.stuck = 0;
    return [{ t, s, hb: Math.abs(diff) > 1 && c.speed > 14 }, c.ri >= rt.length - 1 && Math.hypot(tx - c.x, tz - c.z) < 9];
  }
  function extraCar(paint, stripe, style, o = {}) {
    const c = new Car(makeCar(paint, stripe, false, style, { guns: o.guns !== false }), false);
    Object.assign(c, { team: o.team ?? 1, hp: o.hp || 100, maxHp: o.hp || 100, extra: true, friendly: !!o.friendly });
    if (o.bot) c.botIndex = 100 + extras.length;
    extras.push(c); return c;
  }
  function clearExtras() { for (const c of extras) scene.remove(c.mesh); extras.length = 0; }
  function missionRapace(x, z, h, o = {}) { // a Rapace that belongs to the mission: no respawn unless asked
    const r = new Car(makeCar(o.paint || 0x16151b, o.stripe || 0xc8202f, false, o.style || 'hatch'), false);
    r.botIndex = 200 + rivals.length; r.team = 0; r.meshTeam = 0; r.once = !o.respawn; r.place(x, z, h ?? 0);
    r.hp = o.hp || 60; r.alive = true; r.wreck = 0;
    r.ai = { mode: 'cruise', target: nearestNodeTo(x, z), prev: -1, stuck: 0, back: 0, lost: 0, burst: 0, firing: 0, goal: o.goal || null };
    rivals.push(r); return r;
  }
  let savedRivals = null;
  function benchRivals() { // the six street Rapaces sit out the missions
    if (savedRivals) return; savedRivals = rivals; for (const r of savedRivals) { r.mesh.visible = false; r.x = r.z = 4000; }
    rivals = [];
  }
  function restoreRivals() {
    if (!savedRivals) return;
    for (const r of rivals) scene.remove(r.mesh);
    rivals = savedRivals; savedRivals = null;
    for (const r of rivals) { r.mesh.visible = true; spawnRival(r); }
  }

  // ---------- dialogue between the missions ----------
  const CAST = {
    dede: { name: 'Dédé', role: 'garagiste, rue de la Liberté', col: '#d8a400', pitch: 0.75, rate: 1.0 },
    nadia: { name: 'Nadia', role: 'cheffe des Chantenaysiens', col: '#f2c81e', pitch: 1.25, rate: 1.08 },
    duc: { name: 'Le Grand Duc', role: 'patron des Rapaces', col: '#c8202f', pitch: 0.55, rate: 0.92 },
    vautour: { name: 'Le Vautour', role: 'lieutenant des Rapaces', col: '#7a1a24', pitch: 0.85, rate: 1.15 },
    radio: { name: 'Chantenay FM', role: 'Jean-Mi, à l’antenne', col: '#e2337a', pitch: 1.05, rate: 1.12 },
    toi: { name: 'Toi', role: '', col: '#5b2ba6', pitch: 1.0, rate: 1.05 },
  };
  const dlgEl = document.createElement('div'); dlgEl.id = 'dlg'; dlgEl.hidden = true;
  dlgEl.innerHTML = '<div class="dlgBox"><div class="dlgFace"></div><div class="dlgBody"><div class="dlgWho"><b></b><span></span></div><div class="dlgTxt"></div></div></div><div class="dlgHint">Entrée, Espace ou A · suite &nbsp;·&nbsp; Échap · passer</div>';
  document.body.append(dlgEl);
  let dq = null;
  function dialogue(lines, then) {
    if (!lines || !lines.length) { if (then) then(); return; }
    dq = { lines, i: -1, then, shown: 0, t: 0 }; blocking = true; dlgEl.hidden = false; nextLine();
  }
  function nextLine() {
    dq.i++;
    if (dq.i >= dq.lines.length) { const f = dq.then; dq = null; dlgEl.hidden = true; blocking = false; try { speechSynthesis.cancel(); } catch (e) { } if (f) f(); return; }
    const [who, text] = dq.lines[dq.i], c = CAST[who] || CAST.toi;
    dlgEl.querySelector('.dlgFace').textContent = c.name.replace(/^Le /, '').slice(0, 2).toUpperCase();
    dlgEl.querySelector('.dlgFace').style.background = c.col;
    dlgEl.querySelector('.dlgWho b').textContent = c.name; dlgEl.querySelector('.dlgWho span').textContent = c.role;
    dlgEl.querySelector('.dlgTxt').textContent = ''; dq.shown = 0; dq.t = 0; dq.text = text;
    if (who !== 'toi') say(text, { pitch: c.pitch, rate: c.rate, cancel: true });
  }
  function dlgAdvance() { if (!dq) return; if (dq.shown < dq.text.length) { dq.shown = dq.text.length; dlgEl.querySelector('.dlgTxt').textContent = dq.text; } else nextLine(); }
  function dlgSkip() { if (!dq) return; dq.i = dq.lines.length; nextLine(); }
  addEventListener('keydown', e => {
    if (dq) { if (['Enter', 'Space', 'NumpadEnter'].includes(e.code) && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); dlgAdvance(); } else if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); dlgSkip(); } return; }
    if (garageOpen) garageKey(e);
  }, true);
  dlgEl.addEventListener('pointerdown', e => { e.preventDefault(); dlgAdvance(); });

  // ---------- mission HUD ----------
  const objEl = document.createElement('div'); objEl.id = 'objective'; objEl.className = 'hud'; objEl.hidden = true;
  objEl.innerHTML = '<div class="oTitle"></div><div class="oText"></div><div class="oBar" hidden><i></i></div><div class="oDir"><span class="oArrow">▲</span> <span class="oDist"></span></div>';
  document.body.append(objEl);
  function objective(title, text) { objEl.hidden = false; objEl.querySelector('.oTitle').textContent = title; objEl.querySelector('.oText').textContent = text; }
  function objBar(k) { const b = objEl.querySelector('.oBar'); if (k === null) { b.hidden = true; return; } b.hidden = false; b.firstChild.style.width = Math.round(Math.max(0, Math.min(1, k)) * 100) + '%'; }
  function objDir(x, z) { // arrow towards a point, relative to the car's heading
    const d = objEl.querySelector('.oDir'); if (x === null || !locals[0]) { d.hidden = true; return; }
    const c = locals[0].car, dx = x - c.x, dz = z - c.z, dist = Math.hypot(dx, dz);
    const a = Math.atan2(dx, -dz) + c.h; d.hidden = false;
    d.querySelector('.oArrow').style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(0) + 'deg)';
    d.querySelector('.oDist').textContent = dist < 15 ? 'ici' : Math.round(dist) + ' m';
  }

  // =====================================================================================
  // the Garage de Chantenay: repairs, ammunition, upgrades, a new paint job that the police won't recognise
  // =====================================================================================
  const GARAGE = { x: 66, z: 108, name: 'Garage de Chantenay' };
  let garageMesh = null, garageOpen = false, garageCool = 0, garageSel = 0;
  function buildGarage() {
    // nearest point of the boulevard: the forecourt marker sits there, the workshop beside it
    let best = null, bd = 1e9;
    for (const r of W.roads) { if (!r.d) continue; for (let i = 0; i < r.p.length; i += 2) { const d = Math.hypot(r.p[i] - GARAGE.x, r.p[i + 1] - GARAGE.z); if (d < bd) { bd = d; best = [r, i]; } } }
    const [r, i] = best, p = r.p, j = i + 2 < p.length ? i + 2 : i - 2;
    let ux = p[j] - p[i], uz = p[j + 1] - p[i + 1]; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l; if (j < i) { ux = -ux; uz = -uz; }
    const side = (-uz * (GARAGE.x - p[i]) + ux * (GARAGE.z - p[i + 1])) >= 0 ? 1 : -1;
    const nx = -uz * side, nz = ux * side, off = r.w / 2;
    GARAGE.x = p[i] + nx * (off - 1.5); GARAGE.z = p[i + 1] + nz * (off - 1.5);
    const g = new THREE.Group(), y = surfaceH(GARAGE.x, GARAGE.z);
    const [sc, sg] = canvas(512, 96);
    sg.fillStyle = '#1f3f91'; sg.fillRect(0, 0, 512, 96); sg.strokeStyle = '#f3ead8'; sg.lineWidth = 6; sg.strokeRect(6, 6, 500, 84);
    sg.fillStyle = '#f2c81e'; sg.font = 'bold 40px Arial, sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('GARAGE DE CHANTENAY', 256, 38);
    sg.fillStyle = '#f3ead8'; sg.font = 'bold 22px Arial, sans-serif'; sg.fillText('MÉCANIQUE · CARROSSERIE · PEINTURE', 256, 72);
    const st = new THREE.CanvasTexture(sc); st.encoding = THREE.sRGBEncoding;
    const signM = new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.4, roughness: 0.5 });
    const post = new THREE.MeshStandardMaterial({ color: hd.lin(0x2a2a2e), roughness: 0.5, metalness: 0.6 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1, 0.12), [post, post, post, post, signM, signM]); sign.position.set(0, 5.2, 0); g.add(sign);
    for (const sx of [-2.4, 2.4]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), post); pl.position.set(sx, 2.6, 0); pl.castShadow = true; g.add(pl); }
    // a petrol pump and a tyre stack for the look
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 0.5), new THREE.MeshStandardMaterial({ color: hd.lin(0xc8202f), roughness: 0.4 })); pump.position.set(3.6, 0.85, 1.2); pump.castShadow = true; g.add(pump);
    const tyreM = new THREE.MeshStandardMaterial({ color: hd.lin(0x141414), roughness: 0.9 });
    for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.13, 8, 16).rotateX(Math.PI / 2), tyreM); t.position.set(-3.6, 0.14 + k * 0.26, 1.3); g.add(t); }
    g.position.set(GARAGE.x + nx * 2.2, y + 0.3, GARAGE.z + nz * 2.2); g.rotation.y = Math.atan2(nx, nz);
    g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize(g); scene.add(g); garageMesh = g;
    gridAdd([GARAGE.x + nx * 2.2 - 0.1, GARAGE.z + nz * 2.2, GARAGE.x + nx * 2.2 + 0.1, GARAGE.z + nz * 2.2], 0.4);
    const pad = addMarker(GARAGE.x, GARAGE.z, 4.2, 0x3a8aff); pad.garage = true; pad.beam.visible = false; markers.splice(markers.indexOf(pad), 1); GARAGE.pad = pad;
  }
  const UPG = [
    { k: 'repair', name: 'Réparation complète', desc: 'Carrosserie à 100 %', cost: () => 40 },
    { k: 'ammo', name: 'Plein de munitions', desc: '4 roquettes, 3 mines, 2 nitros', cost: () => 120 },
    { k: 'engine', name: 'Moteur gonflé', desc: 'Vitesse et reprise', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'armor', name: 'Blindage', desc: 'Encaisse mieux les coups', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'guns', name: 'Mitrailleuses', desc: 'Cadence et dégâts', max: 3, cost: l => [300, 600, 1000][l] },
    { k: 'paint', name: 'Peinture neuve', desc: 'Nouvelle couleur · la police perd ta trace', cost: () => 150 },
  ];
  const PAINTS = [[0x5b2ba6, 0xf2c14e], [0xb3121f, 0xf3ead8], [0x0f5d8c, 0xf2c14e], [0x1d1d22, 0xd8a43c], [0xf2f2ee, 0x1b2f8a], [0x2b6b3a, 0xf3ead8], [0xe86a1a, 0x161616], [0xd8b23a, 0x161616]];
  const gEl = document.createElement('div'); gEl.id = 'garage'; gEl.hidden = true; document.body.append(gEl);
  const upg = () => settings.upg || (settings.upg = { engine: 0, armor: 0, guns: 0, paint: 0 });
  function applyUpgrades(L) {
    if (!L || (mode !== 'solo')) return;
    const u = upg(), c = L.car;
    c.maxV = 44 * (1 + u.engine * 0.08); c.accK = 1 + u.engine * 0.15; c.armor = 1 - u.armor * 0.15; L.gunK = u.guns;
  }
  function wallet(L) { return L.respect; }
  function openGarage(L) {
    garageOpen = true; blocking = true; garageSel = 0; L.car.vx = L.car.vz = 0; sfx.pick();
    renderGarage(L); gEl.hidden = false;
    say(['Alors, qu’est-ce que je te fais ?', 'Entre, entre. On va arranger ça.', 'Encore toi ? Pose-la sur le pont.'][(R() * 3) | 0], { pitch: 0.75, cancel: true });
  }
  function closeGarage() { garageOpen = false; blocking = false; gEl.hidden = true; garageCool = 6; if (gx_onGarage) gx_onGarage(); }
  function renderGarage(L) {
    const u = upg();
    gEl.innerHTML = '<div class="card"><h2>Garage de Chantenay</h2><p class="gWallet">Respect à dépenser : <b>' + wallet(L) + '</b> · carrosserie ' + Math.round(L.car.hp) + ' %</p><div class="gList"></div><p class="fine">↑ ↓ choisir · Entrée ou A acheter · Échap ou B repartir</p><div class="menu"><button class="big gOut">Repartir</button></div></div>';
    const list = gEl.querySelector('.gList');
    UPG.forEach((o, i) => {
      const lvl = u[o.k] || 0, maxed = o.max && lvl >= o.max, cost = maxed ? 0 : o.cost(lvl);
      const b = document.createElement('button'); b.className = 'mbtn gItem' + (i === garageSel ? ' sel' : '');
      b.innerHTML = '<b></b><span></span><em></em>';
      b.children[0].textContent = o.name + (o.max ? ' ' + '■'.repeat(lvl) + '□'.repeat(o.max - lvl) : '');
      b.children[1].textContent = o.desc; b.children[2].textContent = maxed ? 'au max' : cost + ' resp.';
      b.disabled = maxed || wallet(L) < cost;
      b.addEventListener('click', () => { garageSel = i; buy(L, o); });
      list.append(b);
    });
    gEl.querySelector('.gOut').addEventListener('click', closeGarage);
  }
  function buy(L, o) {
    const u = upg(), lvl = u[o.k] || 0; if (o.max && lvl >= o.max) return;
    const cost = o.cost(lvl); if (wallet(L) < cost) { sfx.hit(); return; }
    L.respect -= cost;
    if (o.k === 'repair') L.car.hp = 100;
    else if (o.k === 'ammo') { L.ammo = { rockets: 4, mines: 3, nitro: 2 }; }
    else if (o.k === 'paint') {
      u.paint = (u.paint + 1) % PAINTS.length; const [a, b] = PAINTS[u.paint];
      const old = L.car.mesh; L.car.mesh = makeCar(a, b, true, 'saloon'); L.car.mesh.position.copy(old.position); L.car.mesh.rotation.copy(old.rotation); scene.remove(old);
      L.colour = '#' + new THREE.Color(a).getHexString(); L.heat = 0; L.calm = 0;
      for (const c of npcs) if (c.chase === L) { c.chase = null; c.ai = null; }
    } else u[o.k] = lvl + 1;
    saveSettings(); applyUpgrades(L); sfx.pick(); hd.shake(L.car.x, L.car.z, 0.25);
    renderGarage(L); saveBank(L);
  }
  function garageKey(e) {
    const L = locals[0]; if (!L) return;
    if (e.code === 'Escape' || e.code === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); closeGarage(); return; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { garageSel = (garageSel + 1) % UPG.length; renderGarage(L); e.preventDefault(); e.stopImmediatePropagation(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { garageSel = (garageSel + UPG.length - 1) % UPG.length; renderGarage(L); e.preventDefault(); e.stopImmediatePropagation(); }
    if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); buy(L, UPG[garageSel]); }
  }
  function garagePad() {
    const P = pads.find(p => p.gp); if (!P) return; const L = locals[0];
    if (P.press[13]) { garageSel = (garageSel + 1) % UPG.length; renderGarage(L); }
    if (P.press[12]) { garageSel = (garageSel + UPG.length - 1) % UPG.length; renderGarage(L); }
    if (P.press[0]) buy(L, UPG[garageSel]);
    if (P.press[1]) closeGarage();
  }
  // in solo and in the campaign, respect is money kept between sessions
  function saveBank(L) { if (mode === 'solo' && L && L.slot === 0) { settings.bank = L.respect; saveSettings(); } }

  // =====================================================================================
  // power-ups on the map: repair, nitro, mines, slow rockets, shield. They come back after a while.
  // =====================================================================================
  const PU_KINDS = ['repair', 'nitro', 'mines', 'rockets', 'shield'];
  const PU_COL = { repair: 0x7be07b, nitro: 0x3ac8ff, mines: 0xff5a3a, rockets: 0xffb03a, shield: 0x8a7aff };
  const PU_NAME = { repair: ['Clé à molette', '+40 carrosserie'], nitro: ['Nitro', '+1 · touche spéciale'], mines: ['Mines', '+3 · touche spéciale'], rockets: ['Lance-roquettes', '+3 roquettes · touche spéciale'], shield: ['Bouclier', '8 secondes'] };
  const pus = [];
  const chrome = new THREE.MeshStandardMaterial({ color: hd.lin(0xd9dde3), roughness: 0.18, metalness: 1 });
  function mkWrench() { // an adjustable spanner: handle, open jaw head, worm screw
    const g = new THREE.Group();
    const sh = new THREE.Shape(); // head outline with the jaw opening, in metres
    sh.moveTo(-0.08, -0.32); sh.lineTo(0.08, -0.32); sh.lineTo(0.09, 0.18); sh.absarc(0.0, 0.3, 0.2, -0.45, 0.5, false); sh.lineTo(0.06, 0.37); sh.lineTo(0.06, 0.25); sh.lineTo(-0.07, 0.25); sh.lineTo(-0.07, 0.42);
    sh.absarc(-0.02, 0.34, 0.16, 2.1, 3.6, false); sh.lineTo(-0.09, 0.15); sh.lineTo(-0.08, -0.32);
    const head = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 12 }).translate(0, 0, -0.035), chrome);
    head.position.y = 0.3; g.add(head);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.75, 0.06), chrome); handle.position.y = -0.25; g.add(handle);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.08), new THREE.MeshStandardMaterial({ color: hd.lin(0xc8202f), roughness: 0.55 })); grip.position.y = -0.4; g.add(grip);
    const hole = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 14), chrome); hole.position.y = -0.56; g.add(hole);
    const worm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: hd.lin(0x9a8a5a), roughness: 0.3, metalness: 1 })); worm.position.set(0, 0.42, 0); g.add(worm);
    g.scale.setScalar(2.1); return g;
  }
  function mkNitro() {
    const g = new THREE.Group(), blue = new THREE.MeshStandardMaterial({ color: hd.lin(0x1a6aff), roughness: 0.25, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.85, 16), blue); g.add(body);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, 6.283, 0, 1.57), blue); top.position.y = 0.425; g.add(top);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 10), chrome); valve.position.y = 0.7; g.add(valve);
    const [c, cg] = canvas(128, 64); cg.fillStyle = '#f3ead8'; cg.fillRect(0, 0, 128, 64); cg.fillStyle = '#c8202f'; cg.font = 'bold 34px Arial'; cg.textAlign = 'center'; cg.fillText('N2O', 64, 45);
    const lt = new THREE.CanvasTexture(c); lt.encoding = THREE.sRGBEncoding;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.3, 16, 1, true), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.5 })); g.add(label);
    g.scale.setScalar(1.3); return g;
  }
  function mkMine() {
    const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({ color: hd.lin(0x3a4030), roughness: 0.6, metalness: 0.5 });
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.18, 18), dark); g.add(d);
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), chrome); const a = k / 6 * 6.283; s.position.set(Math.cos(a) * 0.26, 0.12, Math.sin(a) * 0.26); g.add(s); }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0x300000, emissive: hd.lin(0xff2010), emissiveIntensity: 6 })); led.position.y = 0.11; g.add(led); g.userData.led = led.material;
    g.scale.setScalar(1.25); return g;
  }
  function mkRocket(big) {
    const g = new THREE.Group(), olive = new THREE.MeshStandardMaterial({ color: hd.lin(0x4d5a2a), roughness: 0.55, metalness: 0.3 });
    const red = new THREE.MeshStandardMaterial({ color: hd.lin(0xc8202f), roughness: 0.35, metalness: 0.2 });
    if (big) { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.2, 14, 1, true).rotateX(Math.PI / 2), olive); tube.material.side = THREE.DoubleSide; g.add(tube);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.1), olive); grip.position.set(0, -0.22, 0.1); g.add(grip); }
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: hd.lin(0xe8e2d0), roughness: 0.4 })); body.position.z = big ? -0.3 : 0; g.add(body);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 10).rotateX(-Math.PI / 2), red); tip.position.z = (big ? -0.3 : 0) - 0.49; g.add(tip);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.16), red); f.rotation.z = k * Math.PI / 2; f.position.z = (big ? -0.3 : 0) + 0.32; f.position.x = Math.cos(k * Math.PI / 2) * 0.1; f.position.y = Math.sin(k * Math.PI / 2) * 0.1; g.add(f); }
    g.scale.setScalar(big ? 1.3 : 1); return g;
  }
  function mkShield() {
    const g = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: hd.lin(0x6a5aff), emissive: hd.lin(0x4a3aff), emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55, flatShading: true }));
    g.add(orb);
    const sh = new THREE.Shape(); sh.moveTo(0, 0.28); sh.lineTo(0.22, 0.2); sh.lineTo(0.2, -0.05); sh.quadraticCurveTo(0.12, -0.22, 0, -0.3); sh.quadraticCurveTo(-0.12, -0.22, -0.2, -0.05); sh.lineTo(-0.22, 0.2); sh.lineTo(0, 0.28);
    const crest = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025), chrome); g.add(crest);
    return g;
  }
  const PU_MAKE = { repair: mkWrench, nitro: mkNitro, mines: mkMine, rockets: () => mkRocket(true), shield: mkShield };
  const puGlowTex = (() => { const [c, g] = canvas(64, 64), rg = g.createRadialGradient(32, 32, 4, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(0.5, 'rgba(255,255,255,.25)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  function makePu(kind) {
    const g = new THREE.Group(), item = PU_MAKE[kind](); g.add(item);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: puGlowTex, color: new THREE.Color(PU_COL[kind]).multiplyScalar(1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    g.add(halo); item.traverse(o => { o.castShadow = !!o.geometry; });
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; });
    scene.add(g);
    return { kind, g, item, halo, x: 0, z: 0, on: false, t: 0 };
  }
  function placePu(pu) {
    const [cx, cz] = playersCentre();
    for (let k = 0; k < 40; k++) {
      const n = (R() * G.x.length) | 0; if (!G.adj[n].length) continue;
      const x = G.x[n], z = G.z[n], d = Math.hypot(x - cx, z - cz);
      if (d < 60 || d > 420 || Math.abs(x) > HX - 15 || Math.abs(z) > HZ - 15 || pus.some(o => o !== pu && o.on && Math.hypot(o.x - x, o.z - z) < 60)) continue;
      pu.x = x; pu.z = z; pu.on = true; pu.g.visible = true; return;
    }
  }
  function puStep(dt, now) {
    for (const pu of pus) {
      if (!pu.on) { pu.t -= dt; if (pu.t <= 0) placePu(pu); continue; }
      const y = surfaceH(pu.x, pu.z);
      pu.g.position.set(pu.x, y + 0.4, pu.z); pu.item.position.y = 1.1 + Math.sin(now / 300 + pu.x) * 0.22; pu.item.rotation.y += dt * 1.8;
      pu.halo.material.opacity = 0.7 + Math.sin(now / 200) * 0.3;
      for (const L of locals) {
        const c = L.car; if (!c.alive || Math.hypot(pu.x - c.x, pu.z - c.z) > 3.6) continue;
        grant(L, pu.kind); pu.on = false; pu.g.visible = false; pu.t = 14 + R() * 10; break;
      }
    }
  }
  function grant(L, kind) {
    const a = L.ammo || (L.ammo = { rockets: 0, mines: 0, nitro: 0 }), c = L.car;
    if (kind === 'repair') c.hp = Math.min(100, c.hp + 40);
    else if (kind === 'nitro') a.nitro = Math.min(5, a.nitro + 1);
    else if (kind === 'mines') a.mines = Math.min(9, a.mines + 3);
    else if (kind === 'rockets') a.rockets = Math.min(9, a.rockets + 3);
    else if (kind === 'shield') c.shield = 8;
    if (kind !== 'repair' && kind !== 'shield') L.weapon = kind;
    sfx.pick(); flashFor(L, PU_NAME[kind][0], PU_NAME[kind][1]); rumbleFor(L, 0, 0.3, 80);
  }
  // special weapon: cycles with the next press when the current one is empty
  function special(L) {
    const a = L.ammo || (L.ammo = { rockets: 0, mines: 0, nitro: 0 }), c = L.car; if (!c.alive) return;
    const order = ['rockets', 'mines', 'nitro'];
    if (!L.weapon || !a[L.weapon]) L.weapon = order.find(k => a[k] > 0) || null;
    if (!L.weapon) { flashFor(L, 'Rien en stock', 'Ramasse des bonus ou passe au garage'); return; }
    if (L.specCd > 0) return;
    if (L.weapon === 'rockets') { a.rockets--; L.specCd = 1.3; fireRocket(c, null); }
    else if (L.weapon === 'mines') { a.mines--; L.specCd = 0.6; dropMine(c); }
    else if (L.weapon === 'nitro') { a.nitro--; L.specCd = 0.4; c.nitro = 2.6; sfx.whoosh(); rumbleFor(L, 0.4, 0.6, 400); }
  }
  // rockets: slow, smoky, a big blast where they land
  const rockets = [];
  function fireRocket(from, target) {
    const [fx, fz] = from.fwd, m = mkRocket(false); hd.linearize(m); m.traverse(o => { o.userData.hdLinear = true; }); scene.add(m);
    const [ox, oy, oz] = muzzleOf(from);
    rockets.push({ m, x: ox + fx * 1.5, y: oy + 0.15, z: oz + fz * 1.5, vx: fx * 42 + from.vx, vz: fz * 42 + from.vz, from, target, t: 0 });
    sfx.whoosh(); hd.muzzle(ox, oy, oz, false, fx, fz);
  }
  function blast(x, z, by, dmg, r) {
    explode(x, z);
    for (const c of [...allPlayerCars(), ...rivals, ...npcs, ...extras]) {
      if (!c.alive || c === by && dmg < 0) continue;
      const d = Math.hypot(c.x - x, c.z - z); if (d > r) continue;
      const k = 1 - d / r; c.vx += (c.x - x) / (d || 1) * 14 * k; c.vz += (c.z - z) / (d || 1) * 14 * k; c.yv = (c.yv || 0) + 7 * k;
      if (c.remote) continue;
      if (c === by) damage(c, dmg * k * 0.35, null); else if (c.friendly && by && by.local) continue; else damage(c, dmg * k, by);
    }
    for (const f of furniture) if (!f.broken && Math.hypot(f.x - x, f.z - z) < r) breakFurniture(f, x, z);
  }
  function rocketStep(dt) {
    for (const r of rockets.slice()) {
      r.t += dt;
      if (r.target && r.target.alive) { // homing a little (the Grand Duc's rockets)
        const dx = r.target.x - r.x, dz = r.target.z - r.z, d = Math.hypot(dx, dz) || 1, sp = Math.hypot(r.vx, r.vz);
        r.vx += (dx / d * sp - r.vx) * dt * 0.9; r.vz += (dz / d * sp - r.vz) * dt * 0.9;
      }
      const sp = Math.hypot(r.vx, r.vz), ux = r.vx / sp, uz = r.vz / sp, step_ = sp * dt;
      const wall = segHit(r.x, r.z, ux, uz, step_ + 0.5);
      let hit = wall <= step_ + 0.4 ? [r.x + ux * wall, r.z + uz * wall] : null;
      if (!hit) for (const c of [...allPlayerCars(), ...rivals, ...npcs, ...extras]) {
        if (!c.alive || c === r.from || (c.team >= 0 && c.team === r.from.team)) continue;
        if (Math.hypot(c.x - r.x, c.z - r.z) < 2.4) { hit = [r.x, r.z]; break; }
      }
      r.x += r.vx * dt; r.z += r.vz * dt;
      const gy = surfaceH(r.x, r.z); r.y = Math.max(gy + 0.6, r.y - dt * 0.8);
      if (!hit && (r.t > 3.5 || Math.abs(r.x) > HX + 60 || Math.abs(r.z) > HZ + 60)) hit = [r.x, r.z];
      r.m.position.set(r.x, r.y, r.z); r.m.rotation.set(0, Math.atan2(-r.vx, -r.vz), 0);
      hd.smoke(r.x - ux * 0.5, r.y, r.z - uz * 0.5, (R() - 0.5), 0.5, (R() - 0.5), 0.35, 4, 1.2, 0.75, 0.45);
      hd.fire(r.x - ux * 0.45, r.y, r.z - uz * 0.45, -ux * 6, 0, -uz * 6, 0.45, 0.08, 1.2);
      if (hit) { scene.remove(r.m); rockets.splice(rockets.indexOf(r), 1); blast(hit[0], hit[1], r.from, 48, 8); }
    }
  }
  // mines: dropped behind, armed after a second, go off when a car rolls over them
  const mines = [];
  function dropMine(c) {
    const [fx, fz] = c.fwd, m = mkMine(); hd.linearize(m); m.traverse(o => { o.userData.hdLinear = true; }); scene.add(m);
    const x = c.x - fx * 3.2, z = c.z - fz * 3.2; m.position.set(x, surfaceH(x, z) + 0.45, z);
    mines.push({ m, x, z, owner: c, t: 0 }); sfx.hit();
  }
  function mineStep(dt, now) {
    for (const mn of mines.slice()) {
      mn.t += dt; mn.m.userData.led.emissiveIntensity = (now / 250 | 0) % 2 ? 8 : 0.2;
      if (mn.t < 1) continue;
      for (const c of [...allPlayerCars(), ...rivals, ...npcs, ...extras]) {
        if (!c.alive || (c === mn.owner && mn.t < 3)) continue;
        if (Math.hypot(c.x - mn.x, c.z - mn.z) < 2.6) { scene.remove(mn.m); mines.splice(mines.indexOf(mn), 1); blast(mn.x, mn.z, mn.owner, 52, 6.5); break; }
      }
      if (mn.t > 90) { scene.remove(mn.m); mines.splice(mines.indexOf(mn), 1); }
    }
  }
  // shield bubble around protected cars
  const bubbleMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.3, 1.6), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const bubbleGeo = new THREE.SphereGeometry(1, 20, 12);
  function shieldStep(dt) {
    for (const c of [...allPlayerCars(), ...rivals, ...extras]) {
      if (c.shield > 0) {
        c.shield -= dt;
        if (!c.bubble) { c.bubble = new THREE.Mesh(bubbleGeo, bubbleMat); c.bubble.scale.set(1.6, 1.15, 2.8); c.bubble.userData.hdLinear = true; c.bubble.renderOrder = 22; scene.add(c.bubble); }
        c.bubble.visible = c.shield > 2 || (performance.now() / 120 | 0) % 2 === 0;
        c.bubble.position.set(c.x, c.mesh.position.y + 0.8, c.z); c.bubble.rotation.y = c.h;
      } else if (c.bubble) { scene.remove(c.bubble); c.bubble = null; }
    }
  }

  // =====================================================================================
  // breakable street furniture: bus shelters, bins, benches (real positions from OpenStreetMap where we have them)
  // =====================================================================================
  const furniture = [];
  function buildFurniture() {
    const list = (W.furniture || []).slice();
    // add bins and benches along the main streets where the map has none
    let k = 0;
    for (const r of W.roads) {
      if (!r.d || r.b || r.w < 9) continue;
      const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1], l = Math.hypot(dx, dz); if (l < 30) continue;
        const side = (k++ % 2) ? 1 : -1, ux = dx / l, uz = dz / l, off = r.w / 2 + 1.0;
        list.push({ t: k % 3 === 0 ? 'bench' : 'bin', x: p[i] + ux * l * 0.5 - uz * off * side, z: p[i + 1] + uz * l * 0.5 + ux * off * side, a: Math.atan2(-uz * side, ux * side) });
      }
    }
    const M = {
      metal: new THREE.MeshStandardMaterial({ color: hd.lin(0x2f5a3a), roughness: 0.5, metalness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: hd.lin(0x8ab0c0), roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }),
      bin: new THREE.MeshStandardMaterial({ color: hd.lin(0x2a6a3a), roughness: 0.55, metalness: 0.2 }),
      wood: new THREE.MeshStandardMaterial({ color: hd.lin(0x7a5232), roughness: 0.75 }),
      ad: null,
    };
    const [ac, ag] = canvas(128, 256); const gr = ag.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ff8a3d'); gr.addColorStop(1, '#e2337a'); ag.fillStyle = gr; ag.fillRect(0, 0, 128, 256);
    ag.fillStyle = '#fff'; ag.font = 'bold 26px Arial'; ag.textAlign = 'center'; ag.fillText('CHANTENAY', 64, 60); ag.fillText('FM 92.4', 64, 95); ag.font = 'bold 17px Arial'; ag.fillText('LA RADIO', 64, 200); ag.fillText('DU QUARTIER', 64, 222);
    const at = new THREE.CanvasTexture(ac); at.encoding = THREE.sRGBEncoding; M.ad = new THREE.MeshStandardMaterial({ map: at, emissive: 0xffffff, emissiveMap: at, emissiveIntensity: 0.5, roughness: 0.3 });
    for (const f of list) {
      if (Math.abs(f.x) > HX - 4 || Math.abs(f.z) > HZ - 4 || groundH(f.x, f.z) < WATER_Y + 1) continue;
      if (roadEdge(f.x, f.z)[0] < 0.4) continue; // not on the carriageway
      const g = new THREE.Group(), parts = [];
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); parts.push(o); return o; };
      if (f.t === 'shelter') {
        add(new THREE.BoxGeometry(3.4, 0.08, 1.5), M.metal, 0, 2.4, 0);
        add(new THREE.BoxGeometry(3.3, 2.1, 0.04), M.glass, 0, 1.25, -0.7);
        add(new THREE.BoxGeometry(0.04, 2.1, 1.3), M.glass, -1.65, 1.25, 0);
        add(new THREE.BoxGeometry(1.1, 1.9, 0.12), M.ad, 1.65, 1.2, 0);
        for (const sx of [-1.65, 1.65]) add(new THREE.BoxGeometry(0.08, 2.4, 0.08), M.metal, sx, 1.2, -0.7);
        add(new THREE.BoxGeometry(1.6, 0.06, 0.4), M.wood, -0.3, 0.5, -0.45);
      } else if (f.t === 'bench') {
        add(new THREE.BoxGeometry(1.8, 0.06, 0.45), M.wood, 0, 0.45, 0); add(new THREE.BoxGeometry(1.8, 0.4, 0.05), M.wood, 0, 0.75, -0.22);
        for (const sx of [-0.8, 0.8]) add(new THREE.BoxGeometry(0.06, 0.45, 0.45), M.metal, sx, 0.22, 0);
      } else {
        add(new THREE.CylinderGeometry(0.3, 0.26, 0.85, 12), M.bin, 0, 0.6, 0); add(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), M.metal, 0, 0.5, -0.32);
      }
      if (f.a === undefined) { const [, nx, nz] = roadEdge(f.x, f.z); f.a = Math.atan2(-nx, -nz); } // open side towards the street
      g.position.set(f.x, surfaceH(f.x, f.z) + 0.2, f.z); g.rotation.y = f.a;
      g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize(g); scene.add(g);
      furniture.push({ g, parts, x: f.x, z: f.z, r: f.t === 'shelter' ? 2 : f.t === 'bench' ? 1.1 : 0.6, broken: false, t: 0, kind: f.t });
    }
  }
  function breakFurniture(f, fromX, fromZ, speed = 12) {
    f.broken = true; f.t = 0;
    for (const o of f.parts) { const a = Math.atan2(f.z - fromZ, f.x - fromX) + (R() - 0.5) * 1.2, s = speed * (0.4 + R() * 0.6);
      o.userData.v = [Math.cos(a) * s, 3 + R() * 5, Math.sin(a) * s, (R() - 0.5) * 10, (R() - 0.5) * 10]; }
    if (f.kind === 'shelter') { for (let i = 0; i < 20 * 1; i++) hd.spark(f.x, surfaceH(f.x, f.z) + 1.5, f.z, (R() - 0.5) * 8, 2 + R() * 4, (R() - 0.5) * 8, 0.6); }
    sfx.hit();
  }
  function furnitureStep(dt) {
    for (const f of furniture) {
      if (!f.broken) {
        for (const c of allPlayerCars().concat(rivals, npcs, extras)) {
          if (!c.alive || c.remote) continue;
          if (Math.abs(c.x - f.x) > 4 || Math.abs(c.z - f.z) > 4) continue;
          if (Math.hypot(c.x - f.x, c.z - f.z) < f.r + 1.4) { breakFurniture(f, c.x, c.z, Math.max(6, c.speed)); c.vx *= 0.85; c.vz *= 0.85; if (c.local) { L_resp(c, 5); } break; }
        }
        continue;
      }
      f.t += dt;
      if (f.t < 4) for (const o of f.parts) { const v = o.userData.v; v[1] -= 20 * dt; o.position.x += v[0] * dt * Math.cos(-f.g.rotation.y) - v[2] * dt * Math.sin(-f.g.rotation.y); o.position.z += v[0] * dt * Math.sin(-f.g.rotation.y) + v[2] * dt * Math.cos(-f.g.rotation.y); o.position.y = Math.max(0.05, o.position.y + v[1] * dt); if (o.position.y <= 0.05) { v[0] *= 0.8; v[2] *= 0.8; v[1] = Math.abs(v[1]) * 0.2; } o.rotation.x += v[3] * dt * (o.position.y > 0.1 ? 1 : 0); o.rotation.z += v[4] * dt * (o.position.y > 0.1 ? 1 : 0); }
      if (f.t > 40) { // the council puts it back
        let clear = true; for (const c of players()) if (Math.hypot(c.x - f.x, c.z - f.z) < 60) clear = false;
        if (clear) { f.broken = false; f.parts.forEach(o => { o.position.copy(o.userData.p0); o.rotation.set(0, 0, 0); }); }
      }
    }
  }
  const L_resp = (c, n) => { if (c.owner && !Match.over) c.owner.respect += n; };


  // =====================================================================================
  // the campaign: seven missions in the spirit of a 70s/90s car-combat B-movie
  // =====================================================================================
  const P = { // places, in game metres (OpenStreetMap)
    liberte: [100, 20], jeanMace: [45, 283], gare: [-300, 540], eglise: [-232, 352], bourg: [-237, 361],
    cardiff: [360, 430], mairie: [160, -440], marseillaise: [-150, -537], nation: [-86, -374],
  };
  const roadPoint = (x, z) => { const n = nearestNodeTo(x, z); return [G.x[n], G.z[n]]; };
  const headTo = (a, b) => heading(a[0], a[1], b[0], b[1]);
  function placePlayer(at, toward) {
    const L = locals[0], [x, z] = roadPoint(...at), n = nearestNodeTo(x, z), nb = G.adj[n].reduce((b, v) => !toward || Math.hypot(G.x[v] - toward[0], G.z[v] - toward[1]) < Math.hypot(G.x[b] - toward[0], G.z[b] - toward[1]) ? v : b, G.adj[n][0]);
    L.car.place(x, z, heading(x, z, G.x[nb], G.z[nb])); L.spawn = [x, z, L.car.h]; L.car.hp = 100; L.car.alive = true;
  }
  const MISSIONS = [
    { id: 'retour', title: 'Retour au quartier', where: 'Boulevard de la Liberté',
      intro: [['radio', 'Chantenay FM, 92.4, il est dix-huit heures. Un an que les Rapaces de la Butte font la loi dans le quartier…'], ['toi', 'Un an que je suis parti. Rien n’a changé. Ou alors en pire.'],
        ['dede', 'Petit ! C’est toi ? Ta caisse fait un bruit de casserole. Passe au garage, je vais te la remettre d’aplomb.'], ['dede', 'C’est sur le boulevard, tu verras le panneau bleu. Et méfie-toi : les Rapaces surveillent la rue.']],
      outro: [['dede', 'Voilà. Ici tu peux réparer, recharger les armes, gonfler le moteur… et repeindre la caisse quand les flics te cherchent.'], ['dede', 'Ça se paie en respect. Et du respect, tu vas en gagner. Nadia t’attend place Jean-Macé.']],
      setup(m) { placePlayer([118, -139], P.jeanMace); m.dest = addMarker(GARAGE.x, GARAGE.z, 5, 0x3a8aff); m.rap = [missionRapace(...roadPoint(70, 260), 0, { hp: 50 })]; },
      update(m) { objective('Retour au quartier', 'Rejoins le Garage de Chantenay'); objDir(GARAGE.x, GARAGE.z); return m.garageVisited ? 'win' : null; },
      garage: true },
    { id: 'jeanmace', title: 'La place Jean-Macé', where: 'Place Jean-Macé',
      intro: [['nadia', 'Te voilà enfin. La place Jean-Macé, c’était chez nous. Maintenant les Rapaces y garent leurs caisses noires.'], ['nadia', 'Tiens la place quarante-cinq secondes. Tant qu’un Rapace roule dans le cercle, le compteur s’arrête.'], ['toi', 'Quarante-cinq secondes. Facile.'], ['nadia', 'Ils vont arriver de partout. Bonne chance.']],
      outro: [['nadia', 'La place est à nous ! Les gens ressortent sur les terrasses.'], ['radio', 'Flash spécial : les Rapaces viennent de perdre la place Jean-Macé. On n’avait pas vu ça depuis longtemps.'], ['nadia', 'Prochaine étape : j’ai un colis à mettre dans le train de dix-huit heures douze. Il me faut une escorte.']],
      setup(m) { placePlayer([73, 132], P.jeanMace); m.zone = addMarker(...roadPoint(...P.jeanMace), 34, 0xf2c81e); m.hold = 0; m.need = 45;
        for (let i = 0; i < 4; i++) { const [x, z] = roadPoint(P.jeanMace[0] + (i % 2 ? 140 : -140), P.jeanMace[1] + (i < 2 ? 90 : -90)); missionRapace(x, z, 0, { respawn: true, goal: { x: m.zone.x, z: m.zone.z } }); } },
      update(m, dt) {
        const c = locals[0].car, inZ = Math.hypot(c.x - m.zone.x, c.z - m.zone.z) < m.zone.r;
        const foes = rivals.filter(r => r.alive && Math.hypot(r.x - m.zone.x, r.z - m.zone.z) < m.zone.r).length;
        if (inZ && !foes && c.alive) m.hold += dt;
        objective('La place Jean-Macé', inZ ? (foes ? foes + ' Rapace' + (foes > 1 ? 's' : '') + ' dans le cercle !' : 'Tiens la place : ' + Math.ceil(m.need - m.hold) + ' s') : 'Entre dans le cercle jaune');
        objBar(m.hold / m.need); objDir(inZ ? null : m.zone.x, m.zone.z);
        return m.hold >= m.need ? 'win' : null;
      } },
    { id: 'gare', title: 'Le train de 18 h 12', where: 'Gare de Chantenay',
      intro: [['nadia', 'Le colis est dans ma 205. Je l’emmène à la gare de Chantenay, toi tu me couvres.'], ['nadia', 'Si les Rapaces me rattrapent, c’est fini. Reste près de moi, je ne roule pas sans toi.'], ['duc', 'Une 205 jaune qui descend vers la gare… Allez me chercher ça, les gars.']],
      outro: [['nadia', 'Le colis est dans le train. On leur a mis une belle claque.'], ['nadia', 'Mais le Vautour, leur lieutenant, a vu ma plaque. Il traîne vers l’église Saint-Martin.']],
      setup(m) {
        placePlayer([60, 250], P.gare);
        const [x, z] = roadPoint(52, 230); m.esc = extraCar(0xf2c81e, 0x1e7a3a, 'p205', { team: 1, hp: 120, friendly: true, guns: false });
        m.rt = route(x, z, ...P.gare); m.esc.place(x, z, headTo([x, z], m.rt[Math.min(2, m.rt.length - 1)])); m.esc.ri = 0;
        m.dest = addMarker(...m.rt[m.rt.length - 1], 9, 0x3ac87a); m.wave = 0; m.t = 0;
      },
      update(m, dt) {
        const c = locals[0].car, e = m.esc; m.t += dt;
        if (!e.alive) return 'fail';
        const far = Math.hypot(c.x - e.x, c.z - e.z) > 55;
        const [inp, done] = followRoute(e, m.rt, dt, 13, { wait: far, careful: true });
        drive(e, inp, dt);
        if (m.wave < 3 && m.t > 8 + m.wave * 22) { // ambushes along the way
          m.wave++; for (let i = 0; i < 2; i++) { const ahead = m.rt[Math.min(m.rt.length - 1, e.ri + 6 + i * 3)]; const [x, z] = roadPoint(ahead[0] + (R() - 0.5) * 60, ahead[1] + (R() - 0.5) * 60); const r = missionRapace(x, z, 0); r.ai.mode = 'hunt'; r.ai.tgt = e; }
          flashFor(locals[0], 'Embuscade !', 'Protège la 205');
        }
        objective('Le train de 18 h 12', far ? 'Nadia t’attend : reviens près d’elle' : 'Escorte la 205 jusqu’à la gare · 205 : ' + Math.round(e.hp / e.maxHp * 100) + ' %');
        objBar(e.hp / e.maxHp); objDir(far ? e.x : m.dest.x, far ? e.z : m.dest.z);
        return done ? 'win' : null;
      }, fail: 'La 205 de Nadia est détruite' },
    { id: 'vautour', title: 'Le Vautour', where: 'Église Saint-Martin',
      intro: [['vautour', 'Alors c’est toi, le revenant ? Viens me chercher. Mes potes m’attendent au bord de Loire.'], ['nadia', 'Il file vers le boulevard de Cardiff, direction le quai de la Fosse. S’il y arrive, il est intouchable. Démolis-le avant !']],
      outro: [['vautour', 'Argh… ma caisse… Le Grand Duc va me tuer.'], ['radio', 'Accrochage spectaculaire du côté de Saint-Martin. Le quartier respire un peu mieux ce soir.'], ['dede', 'Petit… tu as fait du bruit. Les flics commencent à poser des questions.']],
      setup(m) {
        placePlayer([-260, 330], P.cardiff);
        const [x, z] = roadPoint(...P.eglise); m.f = extraCar(0x2a2d33, 0xc8202f, 'saloon', { team: 0, hp: 150, bot: true });
        m.rt = route(x, z, ...P.cardiff); m.f.place(x, z, headTo([x, z], m.rt[Math.min(2, m.rt.length - 1)])); m.f.maxV = 31; m.f.ri = 0;
        m.dest = addMarker(...m.rt[m.rt.length - 1], 10, 0xff3b3b); m.t = 0;
      },
      update(m, dt) {
        const f = m.f; m.t += dt;
        if (!f.alive) return 'win';
        const go = m.t > 3; const [inp, done] = followRoute(f, m.rt, dt, 26, { wait: !go });
        f.ai = { mode: 'hunt' }; drive(f, inp, dt);
        if (m.t > 6 && R() < dt * 0.8) { const c = locals[0].car, d = Math.hypot(c.x - f.x, c.z - f.z); if (d < 30) dropMineFrom(f); }
        objective('Le Vautour', 'Démolis le Vautour avant le quai · ' + Math.round(f.hp / f.maxHp * 100) + ' %'); objBar(f.hp / f.maxHp); objDir(f.x, f.z);
        return done ? 'fail' : null;
      }, fail: 'Le Vautour a atteint le quai de la Fosse' },
    { id: 'police', title: 'Pin-pon', where: 'Boulevard de la Liberté', police: true,
      intro: [['radio', 'Avis à la population : la police nationale ratisse Chantenay à la recherche d’une berline violette.'], ['dede', 'C’est toi qu’ils cherchent. Sème-les, puis viens au garage : une peinture neuve et ils ne te reconnaîtront plus.']],
      outro: [['dede', 'Et voilà une caisse toute neuve. Les flics peuvent toujours courir.'], ['nadia', 'Bien joué. Maintenant, les Rapaces se cachent sur les quais, du côté de la Loire. Il va pleuvoir cette nuit…']],
      setup(m) { placePlayer([140, -264], P.mairie); m.paintAt = upg().paint; locals[0].heat = 3.5; locals[0].calm = 0; for (let i = 0; i < 3; i++) spawnCop(locals[0]); m.dest = addMarker(GARAGE.x, GARAGE.z, 5, 0x3a8aff); m.phase = 0; },
      update(m) {
        const L = locals[0], st = stars(L);
        if (st > 0) { objective('Pin-pon', 'Sème la police (' + '★'.repeat(st) + ') ou va directement repeindre la caisse au garage'); }
        else objective('Pin-pon', 'Les flics t’ont perdu. Passe au garage pour te faire oublier');
        objDir(GARAGE.x, GARAGE.z); objBar(null);
        return m.painted || (m.garageVisited && st === 0) ? 'win' : null;
      }, garage: true },
    { id: 'quais', title: 'Orage sur la Loire', where: 'Bords de Loire', weather: ['night', 1],
      intro: [['nadia', 'Quatre Rapaces planquent leurs caisses au bord de la Loire. De nuit, sous l’orage, ils ne t’attendent pas.'], ['nadia', 'Tu as trois minutes avant qu’ils ne déménagent. Ramasse les roquettes sur la route, ça aide.']],
      outro: [['radio', 'Nuit agitée sur les quais : quatre voitures en flammes, et l’orage qui n’arrange rien.'], ['duc', 'Tu m’as pris la place, la gare, mon lieutenant et mes quais. Monte sur la Butte, si tu oses.']],
      setup(m) {
        placePlayer([60, 280], [200, 470]); m.left = 180; m.kills = 0;
        const spots = [[150, 470], [240, 452], [320, 480], [300, 420]];
        m.r = spots.map(([x, z]) => { const [a, b] = roadPoint(x, z); return missionRapace(a, b, 0, { hp: 70 }); });
        const L = locals[0]; L.ammo = L.ammo || { rockets: 0, mines: 0, nitro: 0 }; L.ammo.rockets = Math.max(L.ammo.rockets, 3); L.weapon = 'rockets';
      },
      update(m, dt) {
        m.left -= dt; const alive = m.r.filter(r => r.alive);
        const near_ = alive.reduce((b, r) => !b || Math.hypot(r.x - locals[0].car.x, r.z - locals[0].car.z) < Math.hypot(b.x - locals[0].car.x, b.z - locals[0].car.z) ? r : b, null);
        objective('Orage sur la Loire', 'Rapaces restants : ' + alive.length + ' · ' + fmtClock(m.left)); objBar(m.left / 180);
        objDir(near_ ? near_.x : null, near_ ? near_.z : 0);
        if (!alive.length) return 'win';
        return m.left <= 0 ? 'fail' : null;
      }, fail: 'Les Rapaces ont filé avec leurs caisses' },
    { id: 'butte', title: 'La Butte', where: 'Haut de la Butte',
      intro: [['duc', 'Bienvenue chez moi. Du haut de la Butte, je vois tout Chantenay.'], ['duc', 'Ma Mercedes est blindée, mes roquettes te suivent partout. Tu vas regretter d’être revenu.'], ['nadia', 'Tout le quartier écoute la radio. Finis-le.']],
      outro: [['radio', 'C’est officiel : les Rapaces de la Butte, c’est fini ! Le Grand Duc a été vu partant à pied vers Saint-Herblain.'], ['nadia', 'Chantenay est à nous. Enfin, à tout le monde.'], ['dede', 'Passe quand tu veux au garage, petit. Le café est offert.'], ['radio', 'Et pour fêter ça, on remet le son. Chantenay FM, la radio du quartier !']],
      setup(m) {
        const b = bases()[0]; placePlayer(roadPoint(b.x - b.ux * 160, b.z - b.uz * 160), [b.x, b.z]);
        m.boss = missionRapace(...roadPoint(b.x, b.z), 0, { hp: 320, style: 'saloon', paint: 0x0d0d10, stripe: 0xd8a43c }); m.boss.boss = true; m.boss.fireCd = 4;
        for (let i = 0; i < 3; i++) { const [x, z] = roadPoint(b.x + (R() - 0.5) * 120, b.z + (R() - 0.5) * 120); missionRapace(x, z, 0, { respawn: i < 2 }); }
      },
      update(m, dt) {
        const B = m.boss, c = locals[0].car;
        if (!B.alive) return 'win';
        B.fireCd -= dt;
        const d = Math.hypot(c.x - B.x, c.z - B.z);
        if (B.fireCd <= 0 && d < 110 && c.alive) { B.fireCd = 3.2; fireRocket(B, c); flashFor(locals[0], 'Roquette !', 'Évite-la'); }
        objective('La Butte', 'Démolis le Grand Duc · ' + Math.round(B.hp / 320 * 100) + ' %'); objBar(B.hp / 320); objDir(B.x, B.z);
        return null;
      } },
  ];
  function dropMineFrom(c) { if (mines.filter(m => m.owner === c).length < 6) dropMine(c); }
  const camp = () => settings.camp || (settings.camp = { done: [] });
  let cur = null;
  function startMission(i) {
    const M = MISSIONS[i]; if (!M) return;
    if (!started || mode !== 'solo') startGame('solo');
    cleanupMission();
    mission = { ...M, idx: i, noPolice: !M.police }; cur = mission;
    setupMatch(0, 0); benchRivals();
    for (const L of locals) { L.heat = 0; L.kills = 0; }
    if (M.weather) { mission.savedAmb = [settings.tod, settings.rain]; hd.setTod(M.weather[0]); hd.setRain(M.weather[1]); hd.amb.t = 3; hd.amb.rain = M.weather[1]; hd.amb.wet = 1; }
    M.setup(mission);
    flash(M.title, M.where);
    dialogue(M.intro, () => { mission.live = true; sfx.pick(); });
  }
  function cleanupMission() {
    if (!cur) return;
    clearMarkers(); clearExtras();
    if (cur.savedAmb) { settings.tod = cur.savedAmb[0]; settings.rain = cur.savedAmb[1]; applyAmbience(); }
    restoreRivals(); objEl.hidden = true; objBar(null);
    cur = null; mission = null;
  }
  const mEl = document.createElement('div'); mEl.id = 'mres'; mEl.hidden = true; document.body.append(mEl);
  function endMission(res) {
    const m = mission; m.live = false;
    const win = res === 'win', i = m.idx;
    if (win) { const c = camp(); if (!c.done.includes(m.id)) c.done.push(m.id); saveSettings(); locals[0].respect += 200 + i * 50; saveBank(locals[0]); }
    const show = () => {
      blocking = true; mEl.hidden = false;
      const next = win && MISSIONS[i + 1];
      mEl.innerHTML = '<div class="card"><h2></h2><p></p><div class="menu"></div></div>';
      mEl.querySelector('h2').textContent = win ? (i === MISSIONS.length - 1 ? 'Chantenay est libre !' : 'Mission réussie') : 'Mission ratée';
      mEl.querySelector('p').textContent = win ? m.title + ' · +' + (200 + i * 50) + ' respect' : (m.fail || 'Ce n’est que partie remise');
      const menu = mEl.querySelector('.menu');
      const btn = (t, f, big) => { const b = document.createElement('button'); b.className = big ? 'big' : 'mbtn'; b.textContent = t; b.addEventListener('click', () => { mEl.hidden = true; blocking = false; f(); }); menu.append(b); return b; };
      const first = next ? btn('Mission suivante · ' + next.title, () => startMission(i + 1), true) : btn(win ? 'Rouler librement' : 'Réessayer', () => win ? freeRoam() : startMission(i), true);
      if (next || !win) btn(win ? 'Rejouer' : 'Rouler librement', () => win ? startMission(i) : freeRoam());
      btn('Menu de la campagne', () => { cleanupMission(); toMenu(); });
      first.focus();
    };
    say(win ? 'Mission réussie !' : 'Mission ratée.', { cancel: true, pitch: 1.05 });
    if (win) dialogue(m.outro, show); else show();
  }
  function freeRoam() { cleanupMission(); for (const r of rivals) spawnRival(r); setupMatch(settings.goal, settings.limit); flash('Chantenay', 'Bac à sable · roule librement'); }
  function toMenu() { // back to the title screen without reloading
    started = false; paused = false; document.body.classList.remove('ingame', 'split'); $('title').hidden = false; renderCampaign(); showView('vCamp');
    for (const L of locals) scene.remove(L.car.mesh); locals = [];
    for (const c of npcs.slice()) removeNpc(c); for (const p of peds) p.g.visible = false; active = false; sfx.engine(0, false); sfx.siren(0);
  }
  function renderCampaign() {
    const box = $('campList'); if (!box) return; box.innerHTML = '';
    const done = camp().done;
    MISSIONS.forEach((M, i) => {
      const open = i === 0 || done.includes(MISSIONS[i - 1].id) || done.includes(M.id);
      const b = document.createElement('button'); b.className = 'mbtn campBtn';
      b.innerHTML = '<b></b><span></span>'; b.children[0].textContent = (i + 1) + '. ' + M.title + (done.includes(M.id) ? '  ✓' : '');
      b.children[1].textContent = open ? M.where : 'Verrouillée'; b.disabled = !open;
      b.addEventListener('click', () => startMission(i));
      box.append(b);
    });
    const prog = $('campProg'); if (prog) prog.textContent = done.length + ' / ' + MISSIONS.length + ' missions · respect en banque : ' + (settings.bank || 0);
  }

  // =====================================================================================
  // frame hooks
  // =====================================================================================
  function tick(dt) { // every frame, even while the world waits
    if (dq) {
      dq.t += dt; const n = Math.min(dq.text.length, Math.floor(dq.t * 45));
      if (n !== dq.shown) { dq.shown = n; dlgEl.querySelector('.dlgTxt').textContent = dq.text.slice(0, n); }
      const Pd = pads.find(p => p.gp); if (Pd && Pd.press[0]) dlgAdvance(); if (Pd && Pd.press[9]) dlgSkip();
    }
    if (garageOpen) garagePad();
  }
  function gameStep(dt) { // inside the world step
    const now = performance.now();
    if (!furnitureBuilt) { buildFurniture(); buildGarage(); furnitureBuilt = true; for (const L of furniture) L.parts.forEach(o => { o.userData.p0 = o.position.clone(); }); }
    step(dt);
    puStep(dt, now); rocketStep(dt); mineStep(dt, now); shieldStep(dt); furnitureStep(dt);
    for (const L of locals) {
      L.specCd = (L.specCd || 0) - dt;
      const c = L.car;
      if (c.nitro > 0) { c.nitro -= dt; if (R() < dt * 30) { const [fx, fz] = c.fwd; hd.fire(c.x - fx * 2.3, c.mesh.position.y + 0.3, c.z - fz * 2.3, -fx * 8, 0.3, -fz * 8, 0.45, 0.12, 1.4); } }
      // garage forecourt (solo and campaign)
      if (mode === 'solo' && GARAGE.pad && !garageOpen && c.alive) {
        garageCool -= dt;
        const d = Math.hypot(c.x - GARAGE.x, c.z - GARAGE.z);
        if (d < 5 && c.speed < 9 && garageCool <= 0) openGarage(L);
      }
    }
    if (GARAGE.pad) { GARAGE.pad.ring.visible = mode === 'solo'; GARAGE.pad.ring.material.opacity = 0.5 + Math.sin(now / 250) * 0.3; }
    for (const m of markers) { m.ring.rotation.y += dt * 0.6; m.beam.material.opacity = 0.16 + Math.sin(now / 300) * 0.05; }
    hud(dt);
    if (mission && mission.live) {
      const r = mission.update(mission, dt);
      if (r) endMission(r);
    }
  }
  let furnitureBuilt = false;
  function hud() {
    const el = $('ammo'); if (!el) return;
    const L = locals[0]; if (!L || locals.length > 1) { el.hidden = true; return; }
    const a = L.ammo || {}, items = [['rockets', '🚀', a.rockets], ['mines', '💣', a.mines], ['nitro', 'N₂O', a.nitro]].filter(x => x[2] > 0);
    el.hidden = !items.length && !(L.car.shield > 0);
    const txt = items.map(([k, ic, n]) => (L.weapon === k ? '▶' : '') + ic + ' ' + n).join('   ') + (L.car.shield > 0 ? '   🛡 ' + Math.ceil(L.car.shield) : '');
    if (el.textContent !== txt) el.textContent = txt;
  }
  gx_onGarage = () => { if (mission && mission.garage) { mission.garageVisited = true; mission.painted = mission.paintAt !== undefined && mission.paintAt !== upg().paint; } };
  function startHook(kind) {
    start(kind);
    for (const pk of pickups) { pk.on = false; pk.mesh.visible = false; }
    if (!pus.length) for (let i = 0; i < 12; i++) pus.push(makePu(PU_KINDS[i % PU_KINDS.length]));
    for (const pu of pus) placePu(pu);
    for (const L of locals) { L.ammo = { rockets: 0, mines: 0, nitro: 1 }; L.weapon = null; }
    if (kind === 'solo') { const L = locals[0]; L.respect = settings.bank || 0; applyUpgrades(L); }
    if (mission && kind !== 'solo') cleanupMission();
  }

  // ---------- the radio host comments on the action ----------
  let djCd = 0, djLast = '';
  const DJ = {
    ko: ['Et un Rapace de moins dans le quartier !', 'Oh la belle tôle froissée ! Ça, c’est du travail.', 'Encore un qui finit à la casse, quelle soirée !', 'Les Rapaces perdent des plumes ce soir !', 'Démoli ! On m’appelle du standard, ça klaxonne de partout.', 'Allô la dépanneuse ? Il y a du boulot à Chantenay.'],
    police: ['Les gyrophares s’allument du côté de Chantenay, prudence au volant.', 'Avis aux auditeurs : la police a sorti les grands moyens.', 'Ça sent le barrage de police, mes amis.'],
    civko: ['Une pensée pour le propriétaire de cette pauvre voiture.', 'Hé, doucement avec les voitures des honnêtes gens !'],
    copko: ['Une voiture de police en flammes… ça va faire du bruit au commissariat.'],
    station: [],
  };
  function dj(kind, arg) {
    if (!sfx.station && kind !== 'station') return;
    if (kind === 'station') { if (arg) say('Vous écoutez ' + arg.name + '. ' + ({ 'G-funk': 'Le son de la côte ouest, depuis Chantenay.', 'rap français': 'Le meilleur du rap, made in Nantes.', 'techno': 'Ça tape fort du côté de la Loire.', 'funk': 'Du groove, rien que du groove.' }[arg.style] || ''), { cancel: true, pitch: 1.05, rate: 1.12 }); return; }
    if (djCd > performance.now() || Math.random() < 0.45) return;
    const list = DJ[kind]; if (!list || !list.length) return;
    let t = list[(Math.random() * list.length) | 0]; if (t === djLast) t = list[(Math.random() * list.length) | 0]; djLast = t;
    djCd = performance.now() + 14000;
    say(t, { pitch: 1.05, rate: 1.12, vol: 0.8 });
  }
  const api = { dj, step: gameStep, tick, start: startHook, cars: () => npcs.concat(extras), damage: damageNpc, addHeat, say, peds: () => peds, stars, special, startMission, renderCampaign, cleanupMission, MISSIONS,
    get blocking() { return blocking; }, get mission() { return mission; }, foes: () => extras.filter(c => c.alive && c.team === 1), saveBank, pus: () => pus, furniture: () => furniture, garage: GARAGE,
    get onGarage() { return gx_onGarage; },
    minimap(me, add) { minimap(me, add); for (const pu of pus) if (pu.on) add(pu, '#' + new THREE.Color(PU_COL[pu.kind]).getHexString()); for (const c of extras) if (c.alive) add(c, c.friendly ? '#f2c81e' : '#ff3b3b'); for (const m of markers) add(m, '#ffffff'); if (GARAGE.pad && mode === 'solo') add(GARAGE, '#3a8aff'); } };
  return api;
})();
// <<< GAMEPLAY MODULE
