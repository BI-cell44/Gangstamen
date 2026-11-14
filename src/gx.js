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
  const budget = () => { const n = Math.max(1, locals.length), k = settings.traffic === 1 ? 0.5 : 1; return { civ: Math.round([14, 10, 8, 7][n - 1] * k), peds: Math.round([64, 44, 34, 26][n - 1] * k) }; };

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
      const x = G.x[n], z = G.z[n]; if (Math.abs(x - CX) > HX - 10 || Math.abs(z - CZ) > HZ - 10) continue;
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
  function removeNpc(c) { // free what belongs to this car only (wheels and common materials are shared)
    const i = npcs.indexOf(c); if (i >= 0) npcs.splice(i, 1); scene.remove(c.mesh);
    c.mesh.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) if (!m.userData.shared) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }
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
          if (Math.abs(x - CX) > HX - 5 || Math.abs(z - CZ) > HZ - 5 || groundH(x, z) < WATER_Y + 1) { if (out.length > 3) walks.push(out.slice()); out.length = 0; continue; }
          out.push(x, z);
        }
        if (out.length > 3) walks.push(out);
      }
    }
  }
  // ---------- the crowd: one small rig posed on the CPU, drawn as instanced body parts (a dozen draw calls in all) ----------
  const CROWD_MAX = 160;
  const crowd = (() => {
    const G_ = {
      torso: new THREE.BoxGeometry(0.38, 0.56, 0.22).translate(0, 0.28, 0),
      head: new THREE.SphereGeometry(0.115, 12, 9).translate(0, 0.13, 0.01),
      hair: new THREE.SphereGeometry(0.125, 12, 7, 0, 6.283, 0, 1.75).translate(0, 0.145, -0.01),
      cap: new THREE.SphereGeometry(0.125, 12, 6, 0, 6.283, 0, 1.4).translate(0, 0.16, 0).merge ? null : null,
      upper: new THREE.BoxGeometry(0.1, 0.3, 0.11).translate(0, -0.15, 0),
      fore: new THREE.BoxGeometry(0.085, 0.27, 0.09).translate(0, -0.135, 0),
      hand: new THREE.SphereGeometry(0.048, 8, 6).translate(0, -0.3, 0.01),
      thigh: new THREE.BoxGeometry(0.15, 0.45, 0.16).translate(0, -0.225, 0),
      shin: new THREE.BoxGeometry(0.12, 0.44, 0.13).translate(0, -0.22, 0),
      foot: new THREE.BoxGeometry(0.11, 0.08, 0.25).translate(0, -0.04, 0.06),
      skirt: new THREE.CylinderGeometry(0.17, 0.27, 0.5, 12).translate(0, -0.22, 0),
      visor: new THREE.BoxGeometry(0.2, 0.025, 0.14).translate(0, 0.19, 0.13),
    };
    G_.cap = new THREE.SphereGeometry(0.125, 12, 6, 0, 6.283, 0, 1.45).translate(0, 0.15, 0);
    const per = { torso: 1, head: 1, hair: 1, cap: 1, visor: 1, upper: 2, fore: 2, hand: 2, thigh: 2, shin: 2, foot: 2, skirt: 1 };
    const M = {};
    for (const k in G_) {
      const m = new THREE.InstancedMesh(G_[k], new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: k === 'foot' ? 0.5 : 0.85 }), CROWD_MAX * per[k]);
      m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.castShadow = ['torso', 'thigh', 'shin', 'skirt', 'head'].includes(k);
      m.frustumCulled = false; m.userData.hdLinear = true; scene.add(m); M[k] = m;
    }
    // the rig
    const O = () => new THREE.Object3D();
    const root = O(), hips = O(), torso = O(), neck = O(), sh = [O(), O()], el = [O(), O()], hp = [O(), O()], kn = [O(), O()], an = [O(), O()];
    root.add(hips); hips.add(torso); torso.add(neck);
    for (let s2 = 0; s2 < 2; s2++) {
      const sx = s2 ? 0.215 : -0.215; sh[s2].position.set(sx, 0.52, 0); torso.add(sh[s2]); el[s2].position.y = -0.3; sh[s2].add(el[s2]);
      hp[s2].position.set(s2 ? 0.1 : -0.1, 0, 0); hips.add(hp[s2]); kn[s2].position.y = -0.45; hp[s2].add(kn[s2]); an[s2].position.y = -0.44; kn[s2].add(an[s2]);
    }
    neck.position.y = 0.58;
    const tmp = new THREE.Matrix4(), col = new THREE.Color();
    let n = {};
    function begin() { for (const k in M) n[k] = 0; }
    function put(k, node, c) { const m = M[k]; if (n[k] >= m.instanceMatrix.count) return; m.setMatrixAt(n[k], node.matrixWorld); m.setColorAt(n[k], c); n[k]++; }
    function end() { for (const k in M) { M[k].count = n[k]; M[k].instanceMatrix.needsUpdate = true; if (M[k].instanceColor) M[k].instanceColor.needsUpdate = true; } }
    // pose: { x, y, z, h, s (scale), lie, hipsY, sway, lean, twist, look, thigh[2], knee[2], arm[2], armOut[2], elbow[2] }
    function draw(p, P, at) {
      at = at || p; root.position.set(at.x, at.y, at.z); root.rotation.set(P.lie || 0, at.h, 0, 'YXZ'); root.scale.setScalar(p.s);
      hips.position.y = P.hipsY; hips.rotation.set(0, 0, P.sway || 0); torso.rotation.set(P.lean || 0, P.twist || 0, 0); neck.rotation.set(P.nod || 0, P.look || 0, 0);
      for (let s2 = 0; s2 < 2; s2++) {
        hp[s2].rotation.set(P.thigh[s2], 0, 0); kn[s2].rotation.set(P.knee[s2], 0, 0); an[s2].rotation.set(P.ankle ? P.ankle[s2] : 0, 0, 0);
        sh[s2].rotation.set(P.arm[s2], 0, (s2 ? -1 : 1) * (P.armOut ? P.armOut[s2] : 0.08)); el[s2].rotation.set(P.elbow[s2], 0, 0);
      }
      root.updateMatrixWorld(true);
      put('torso', torso, p.cTop); put('head', neck, p.cSkin);
      if (p.cap) { put('cap', neck, p.cCap); put('visor', neck, p.cCap); } else put('hair', neck, p.cHair);
      for (let s2 = 0; s2 < 2; s2++) {
        put('upper', sh[s2], p.cTop); put('fore', el[s2], p.tee ? p.cSkin : p.cTop); put('hand', el[s2], p.cSkin);
        put('thigh', hp[s2], p.cBot); put('shin', kn[s2], p.shorts ? p.cSkin : p.cBot); put('foot', an[s2], p.cShoe);
      }
      if (p.skirt) put('skirt', hips, p.cBot);
    }
    return { begin, end, draw };
  })();
  const SKIN = [0xe8c3a0, 0xc99a74, 0x8d5a3c, 0x5c3a28, 0xf0d2b8, 0xd9a98a];
  const TOPS = [0xd63a8a, 0x2a8ad6, 0x2ad6a0, 0xf2c81e, 0xe8e2d0, 0x6a2ad6, 0xd65a2a, 0x1a1a1a, 0x3a6a2a, 0xc81e1e, 0x1f3f91, 0x9a6a3a, 0xf3ead8, 0x2a2a3a];
  const BOTTOMS = [0x2a3a6a, 0x1a1a1a, 0x5a4a3a, 0x3a5a8a, 0x6a6a72, 0x4a6a9a, 0x7a2a3a, 0xc8b89a];
  const HAIR = [0x1a120a, 0x3a2412, 0x8a6a3a, 0xd8c890, 0x101010, 0x6a3a1a, 0xb0b0b0];
  const SHOES = [0x1a1a1a, 0xf2f2ee, 0x5a3a20, 0x2a2a6a, 0xc81e1e];
  const LC = h => new THREE.Color(hd.lin(h));
  function look() { // a 90s outfit: shell suits, jeans, caps, t-shirts, skirts
    const pick = a => a[(R() * a.length) | 0], kid = R() < 0.08, skirt = R() < 0.22;
    return { s: kid ? 0.62 + R() * 0.1 : 0.9 + R() * 0.17, cTop: LC(pick(TOPS)), cBot: LC(pick(BOTTOMS)), cSkin: LC(pick(SKIN)), cHair: LC(pick(HAIR)), cShoe: LC(pick(SHOES)), cCap: LC(pick(TOPS)),
      skirt, shorts: !skirt && R() < 0.18, tee: R() < 0.45, cap: !skirt && R() < 0.2, kid };
  }
  function makePed() {
    return Object.assign(look(), { w: 0, t: 0, dir: R() < 0.5 ? 1 : -1, speed: 1.05 + R() * 0.55, ox: 0, oz: 0, fvx: 0, fvz: 0, state: 'walk', timer: 0, phase: R() * 6, x: 0, y: 0, z: 0, h: 0, on: false, idleIn: 6 + R() * 20, look_: 0, lookT: 0 });
  }
  function placePed(p) {
    const ps = players(); if (!ps.length || !walks.length) return false;
    for (let k = 0; k < 40; k++) {
      const w = (R() * walks.length) | 0, pl = walks[w], i = ((R() * (pl.length / 2 - 1)) | 0);
      const x = pl[2 * i], z = pl[2 * i + 1], d = minPlayerDist(x, z);
      if (d < 35 || d > 170) continue;
      Object.assign(p, { w, t: i + R() * 0.9, ox: 0, oz: 0, state: 'walk', timer: 0, on: true });
      return true;
    }
    p.on = false; return false;
  }
  // poses
  const P0 = () => ({ hipsY: 0.93, thigh: [0, 0], knee: [0, 0], arm: [0, 0], elbow: [-0.15, -0.15], armOut: [0.08, 0.08] });
  function walkPose(ph, A, run) {
    const P = P0(), s1 = Math.sin(ph), c1 = Math.cos(ph);
    P.thigh = [-s1 * A * 0.55, s1 * A * 0.55];
    P.knee = [0.08 + Math.max(0, c1) * A * 0.95, 0.08 + Math.max(0, -c1) * A * 0.95];
    P.ankle = [-P.knee[0] * 0.3, -P.knee[1] * 0.3];
    P.arm = [s1 * A * 0.45, -s1 * A * 0.45]; P.elbow = [-(0.25 + A * 0.35), -(0.25 + A * 0.35)];
    P.hipsY = 0.93 - A * 0.035 + Math.abs(c1) * A * 0.04; P.sway = s1 * 0.03 * A; P.twist = -s1 * 0.1 * A; P.lean = run ? 0.22 : 0.03;
    return P;
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
      p.h += wrapA(Math.atan2(hx, hz) - p.h) * Math.min(1, dt * 6);
      p.idleIn -= dt; if (p.idleIn <= 0) { p.state = 'idle'; p.timer = 2 + R() * 4; p.idleIn = 10 + R() * 25; if (R() < 0.3) p.dir = -p.dir; }
    } else if (p.state === 'idle') { // stops, looks around, then goes on
      p.timer -= dt; if (p.timer <= 0) p.state = 'walk';
    } else if (p.state === 'flee') {
      p.ox += p.fvx * dt; p.oz += p.fvz * dt; moving = 5.5; p.timer -= dt; p.h = Math.atan2(p.fvx, p.fvz);
      if (p.timer <= 0) p.state = 'walk';
    } else if (p.state === 'down') {
      p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; }
    }
    p.x = ax + (bx - ax) * f + p.ox; p.z = az + (bz - az) * f + p.oz;
    // watch out for cars
    if (p.state !== 'down') for (const c of [...allPlayerCars(), ...rivals, ...npcs]) {
      if (!c.alive || c.speed < 3) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d > 14) continue;
      const vx = c.vx / c.speed, vz = c.vz / c.speed, along = dx * vx + dz * vz, lat = dx * vz - dz * vx;
      if (d < 2.3) { // too late: knocked over, gets back up a bit later
        p.state = 'down'; p.timer = 2.5 + R(); p.ox += vx * 1.5; p.oz += vz * 1.5; sfx.hit();
        if (c.local) { addHeat(c, 0.45); shout(c, true); }
        break;
      }
      if (along > 0 && along < c.speed * 1.4 + 3 && Math.abs(lat) < 3.2 && (p.state === 'walk' || p.state === 'idle')) {
        const sg = lat >= 0 ? 1 : -1; p.state = 'flee'; p.timer = 0.9 + R() * 0.4;
        p.fvx = vz * sg * 6.5; p.fvz = -vx * sg * 6.5;
        if (c.local) shout(c, false);
        break;
      }
    }
    p.y = surfaceH(p.x, p.z) + 0.36;
    // head: glances around now and then
    p.lookT -= dt; if (p.lookT <= 0) { p.lookT = 1 + R() * 3; p.lookTo = R() < 0.6 ? 0 : (R() - 0.5) * 1.6; }
    p.look_ += ((p.lookTo || 0) - p.look_) * Math.min(1, dt * 3);
    let P;
    if (p.state === 'down') { P = P0(); P.lie = -Math.PI / 2; P.arm = [-2.6, -2.2]; P.thigh = [0.2, -0.3]; P.knee = [0.6, 0.2]; P.hipsY = 0.18 / p.s; p.y -= 0.05; }
    else if (p.state === 'idle') { const t = performance.now() / 1000 + p.phase; P = P0(); P.sway = Math.sin(t * 0.9) * 0.04; P.thigh = [Math.sin(t * 0.9) * 0.05, -0.05]; P.arm = [0.05, -0.05]; P.look = p.look_ * 1.4; }
    else {
      p.phase += dt * (moving > 3 ? moving * 2.1 : moving * 4.2);
      const run = p.state === 'flee', A = run ? 1.25 : Math.min(1, 0.55 + p.speed * 0.3);
      P = walkPose(p.phase, A, run); P.look = p.look_;
      if (run) { P.arm = [-2.5 + Math.sin(p.phase * 2) * 0.3, -2.5 - Math.sin(p.phase * 2) * 0.3]; P.armOut = [0.4, 0.4]; P.elbow = [-0.3, -0.3]; }
    }
    p.pose = P;
  }
  // ---------- café terraces: tables, chairs, parasols and their customers ----------
  const customers = [];
  function buildTerraces() {
    if (!W.shops) return;
    const tableM = stdM2(0xe8e2d0, 0.5, 0.2), metal = stdM2(0x2a2a2e, 0.5, 0.6), chairM = stdM2(0x8a5a32, 0.7);
    const PARA = [[0xc8202f, 0xf3ead8], [0x1f3f91, 0xf3ead8], [0x2b6b3a, 0xf2c81e], [0xe86a1a, 0xf3ead8]];
    const paraMats = PARA.map(([a, b]) => { const [c, g] = canvas(256, 16); for (let k = 0; k < 16; k++) { g.fillStyle = '#' + new THREE.Color(k % 2 ? b : a).getHexString(); g.fillRect(k * 16, 0, 16, 16); }
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide }); });
    const free = (x, z) => roadEdge(x, z)[0] > 0.5 && !buildingPolys.some(b => pointInPoly(x, z, b.p || b));
    W.shops.forEach((sh, si) => {
      if (sh.k !== 'cafe' && sh.k !== 'restaurant') return;
      if (Math.abs(sh.x - CX) > HX - 5 || Math.abs(sh.z - CZ) > HZ - 5) return;
      const [d, nx, nz] = roadEdge(sh.x, sh.z); if (d > 14 || d < 2.2) return;
      const k = Math.max(1, d - 1.7), cx = sh.x - nx * k, cz = sh.z - nz * k, ux = -nz, uz = nx;
      const spots = [-2.4, 0, 2.4].map(o => [cx + ux * o, cz + uz * o]).filter(([x, z]) => free(x, z) && free(x + ux * 0.9, z + uz * 0.9) && free(x - ux * 0.9, z - uz * 0.9));
      const pm = paraMats[si % paraMats.length];
      spots.slice(0, si % 3 === 0 ? 3 : 2).forEach(([x, z], ti) => {
        const g = new THREE.Group(), parts = [];
        const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; g.add(o); parts.push(o); return o; };
        add(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), tableM, 0, 0.74, 0); add(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), metal, 0, 0.36, 0); add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), metal, 0, 0.02, 0);
        const cup = add(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 8), stdM2(0xf3ead8, 0.3), 0.12, 0.8, 0.05);
        add(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), metal, 0, 1.15, 0);
        const para = add(new THREE.ConeGeometry(1.25, 0.5, 16, 1, true), pm, 0, 2.35, 0); para.castShadow = true;
        const seats = [];
        for (const side of [-1, 1]) {
          const chx = side * 0.72;
          add(new THREE.BoxGeometry(0.42, 0.04, 0.42), chairM, chx, 0.45, 0); add(new THREE.BoxGeometry(0.04, 0.45, 0.42), chairM, chx + side * 0.2, 0.68, 0);
          for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) add(new THREE.BoxGeometry(0.03, 0.45, 0.03), metal, chx + lx, 0.22, lz);
          seats.push(side);
        }
        const a = Math.atan2(ux, uz); // table row along the facade; chairs on either side along it
        g.position.set(x, surfaceH(x, z) + 0.2, z); g.rotation.y = a - Math.PI / 2;
        g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize(g); scene.add(g);
        const f = { g, parts, x, z, r: 0.9, broken: false, t: 0, kind: 'table' }; furniture.push(f);
        // one or two customers, facing the table
        for (const side of seats) {
          if (R() < 0.3) continue;
          const lx = side * 0.72, ca = g.rotation.y, wx = x + Math.cos(ca) * lx, wz = z - Math.sin(ca) * lx;
          customers.push(Object.assign(look(), { x: wx, z: wz, y: g.position.y + 0.06, h: ca + (side > 0 ? -Math.PI / 2 : Math.PI / 2), table: f, state: 'sit', timer: 0, phase: R() * 10, drink: 3 + R() * 8, talk: R() < 0.6, look_: 0 }));
        }
      });
    });
  }
  const stdM2 = (c, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: hd.lin(c), roughness: r, metalness: m });
  function customerStep(c, dt) {
    // sit -> (a car comes) flee -> back to the chair -> sit; a car that reaches them knocks them over
    const t = performance.now() / 1000 + c.phase;
    c.ox = c.ox || 0; c.oz = c.oz || 0;
    const px = c.x + c.ox, pz = c.z + c.oz;
    if (c.state !== 'down') for (const car of [...allPlayerCars(), ...rivals, ...npcs, ...extras]) {
      if (!car.alive) continue;
      const dx = px - car.x, dz = pz - car.z; if (Math.abs(dx) > 10 || Math.abs(dz) > 10) continue;
      const d = Math.hypot(dx, dz);
      if (d < 2.1 && car.speed > 2) { // hit: knocked over and pushed along the car's way
        const vx = car.vx / car.speed, vz = car.vz / car.speed, k = Math.min(3.5, 0.8 + car.speed * 0.12);
        c.state = 'down'; c.timer = 3 + R() * 1.5; c.ox += vx * k + dx / (d || 1) * 0.6; c.oz += vz * k + dz / (d || 1) * 0.6; c.downA = Math.atan2(vx, vz);
        sfx.hit(); if (car.local) { addHeat(car, 0.45); shout(car, true); }
        break;
      }
      if (car.speed > 4 && d < 9 && (c.state === 'sit' || c.state === 'back')) { // run away from the car, sideways to its path
        const vx = car.vx / car.speed, vz = car.vz / car.speed, lat = dx * vz - dz * vx, sg = lat >= 0 ? 1 : -1;
        let fx = vz * sg + dx / (d || 1) * 0.6, fz = -vx * sg + dz / (d || 1) * 0.6; const fl = Math.hypot(fx, fz) || 1;
        c.state = 'flee'; c.timer = 1 + R() * 0.6; c.fvx = fx / fl * 5.2; c.fvz = fz / fl * 5.2; c.fleeA = Math.atan2(c.fvx, c.fvz);
        if (car.local) shout(car, false);
        break;
      }
    }
    if (c.state === 'sit' && c.table.broken) { c.state = 'flee'; c.timer = 1.2; c.fleeA = c.h + Math.PI; c.fvx = Math.sin(c.fleeA) * 4; c.fvz = Math.cos(c.fleeA) * 4; }
    let moving = 0;
    if (c.state === 'flee') {
      c.ox += c.fvx * dt; c.oz += c.fvz * dt; moving = 5.2; c.timer -= dt;
      const ol = Math.hypot(c.ox, c.oz); if (ol > 7) { c.ox *= 7 / ol; c.oz *= 7 / ol; }
      if (c.timer <= 0) { c.state = 'scared'; c.timer = 2 + R() * 2; }
    } else if (c.state === 'scared' || c.state === 'down') {
      c.timer -= dt; if (c.timer <= 0) c.state = c.state === 'down' ? 'scared' : (c.table.broken ? 'scared' : 'back');
    } else if (c.state === 'back') { // walks back to the chair
      const ol = Math.hypot(c.ox, c.oz);
      if (ol < 0.15) { c.ox = c.oz = 0; c.state = 'sit'; }
      else { const k = Math.min(ol, 1.3 * dt) / ol; c.ox -= c.ox * k; c.oz -= c.oz * k; moving = 1.3; c.walkA = Math.atan2(-c.ox, -c.oz); }
    }
    let P;
    if (c.state === 'sit') {
      P = P0();
      P.hipsY = 0.5; P.thigh = [-1.5, -1.5]; P.knee = [1.45, 1.45]; P.ankle = [0.05, 0.05]; P.lean = 0.08;
      P.arm = [-0.55, -0.6]; P.elbow = [-0.9, -0.95]; P.armOut = [0.12, 0.12];
      c.drink -= dt;
      if (c.drink < 1.4) { const k = Math.sin(Math.max(0, c.drink) / 1.4 * Math.PI); P.arm[1] = -0.6 - k * 0.6; P.elbow[1] = -0.95 - k * 1.3; P.nod = -k * 0.25; }
      if (c.drink < 0) c.drink = 4 + R() * 9;
      if (c.talk) { P.look = Math.sin(t * 0.7) * 0.35; P.arm[0] += Math.max(0, Math.sin(t * 2.3)) * -0.5; P.elbow[0] += Math.sin(t * 4.1) * 0.2; P.nod = (P.nod || 0) + Math.sin(t * 3.1) * 0.06; }
      c.draw = { x: c.x, y: c.y, z: c.z, h: c.h };
    } else {
      const x = c.x + c.ox, z = c.z + c.oz, y = surfaceH(x, z) + 0.36;
      if (c.state === 'down') { P = P0(); P.lie = -Math.PI / 2; P.arm = [-2.6, -2.2]; P.thigh = [0.2, -0.3]; P.knee = [0.6, 0.2]; P.hipsY = 0.18 / c.s; c.draw = { x, y: y - 0.05, z, h: c.downA || c.h }; }
      else if (c.state === 'scared' && c.timer <= 0) { P = P0(); P.look = Math.sin(t * 0.6) * 0.8; P.arm = [0.1, -0.4]; P.elbow = [-0.2, -1.2]; c.draw = { x, y, z, h: (c.fleeA || c.h) + Math.PI }; } // waits for the table to be put back
      else if (c.state === 'scared') { P = P0(); P.arm = [-2.7 + Math.sin(t * 9) * 0.2, -2.7 - Math.sin(t * 9) * 0.2]; P.armOut = [0.35, 0.35]; P.elbow = [-0.3, -0.3]; P.lean = -0.1; c.draw = { x, y, z, h: (c.fleeA || c.h) + Math.PI }; }
      else {
        c.phase += dt * (moving > 3 ? moving * 2.1 : moving * 4.2);
        const run = c.state === 'flee'; P = walkPose(c.phase, run ? 1.25 : 0.9, run);
        if (run) { P.arm = [-2.5 + Math.sin(c.phase * 2) * 0.3, -2.5 - Math.sin(c.phase * 2) * 0.3]; P.armOut = [0.4, 0.4]; P.elbow = [-0.3, -0.3]; }
        c.draw = { x, y, z, h: run ? c.fleeA : c.walkA };
      }
    }
    c.pose = P;
  }
  function crowdDraw() {
    crowd.begin();
    for (const p of peds) if (p.on && p.pose) crowd.draw(p, p.pose);
    for (const c of customers) if (c.pose && c.vis) crowd.draw(c, c.pose, c.draw);
    crowd.end();
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
    while (peds.length < Math.min(B.peds, CROWD_MAX - 70)) { const p = makePed(); peds.push(p); if (!placePed(p)) break; }
    peds.forEach((p, i) => { if (i >= B.peds) p.on = false; });
    for (const p of peds.slice(0, B.peds)) {
      if (!p.on || minPlayerDist(p.x, p.z) > 200) { if (!placePed(p)) continue; }
      pedStep(p, dt);
    }
    for (const c of customers) { c.vis = minPlayerDist(c.x, c.z) < 160; if (c.vis) customerStep(c, dt); }
    crowdDraw();
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
    if (by && by.local) { addHeat(by, d * (c.npc === 'cop' ? 0.035 : 0.012)); if (c.npc === 'civ') { c.nav.panic = 8; } }
    if (c.npc === 'civ' && by && by.local && !c.chase && c.npc === 'civ' && c.hp > 0 && R() < 0.02) sfx.horn && sfx.horn();
    if (c.hp > 0) return;
    c.alive = false; c.dead = 0; explode(c.x, c.z);
    c.mesh.userData.mBody.color.setHex(0x1a1414);
    if (by && by.local) { addHeat(by, c.npc === 'cop' ? 1.2 : 0.6); if (gx.dj) gx.dj(c.npc === 'cop' ? 'copko' : 'civko'); }
    if (gx.onNpcDown) gx.onNpcDown(c, by);
  }
  function start(kind) {
    for (const c of npcs.slice()) removeNpc(c);
    for (const L of locals) { L.heat = 0; L.calm = 0; }
    active = settings.traffic !== false && settings.traffic !== 0;
    for (const p of peds) p.on = false;
    if (!active) { crowd.begin(); crowd.end(); return; }
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
    beam.scale.set(Math.min(r * 0.5, 2.5), 1, Math.min(r * 0.5, 2.5)); ring.scale.setScalar(r); // a thin column: a wide one would fill the screen from inside
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
  const GARAGE = { x: 66, z: 108, name: 'Garage de Chantenay' }; // Dédé's: the real Garage Tribot's spot
  const GARAGES = [GARAGE]; let curGarage = GARAGE;
  let garageOpen = false, garageCool = 0, garageSel = 0;
  function buildGarageAt(G) {
    // nearest point of the boulevard: the forecourt marker sits there, the workshop beside it
    let best = null, bd = 1e9;
    for (const r of W.roads) { if (!r.d) continue; for (let i = 0; i < r.p.length; i += 2) { const d = Math.hypot(r.p[i] - G.x, r.p[i + 1] - G.z); if (d < bd) { bd = d; best = [r, i]; } } }
    const [r, i] = best, p = r.p, j = i + 2 < p.length ? i + 2 : i - 2;
    let ux = p[j] - p[i], uz = p[j + 1] - p[i + 1]; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l; if (j < i) { ux = -ux; uz = -uz; }
    const side = (-uz * (G.x - p[i]) + ux * (G.z - p[i + 1])) >= 0 ? 1 : -1;
    const nx = -uz * side, nz = ux * side, off = r.w / 2;
    G.x = p[i] + nx * (off - 1.5); G.z = p[i + 1] + nz * (off - 1.5);
    const g = new THREE.Group(), y = surfaceH(G.x, G.z);
    const [sc, sg] = canvas(512, 96);
    sg.fillStyle = G.bg || '#1f3f91'; sg.fillRect(0, 0, 512, 96); sg.strokeStyle = '#f3ead8'; sg.lineWidth = 6; sg.strokeRect(6, 6, 500, 84);
    sg.fillStyle = G.fg || '#f2c81e'; sg.font = 'bold ' + (G.name.length > 20 ? 34 : 40) + 'px Arial, sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText(G.name.toUpperCase(), 256, 38);
    sg.fillStyle = '#f3ead8'; sg.font = 'bold 22px Arial, sans-serif'; sg.fillText(G.sub || 'MÉCANIQUE · CARROSSERIE · PEINTURE', 256, 72);
    const st = new THREE.CanvasTexture(sc); st.encoding = THREE.sRGBEncoding;
    const signM = new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.4, roughness: 0.5 });
    const post = new THREE.MeshStandardMaterial({ color: hd.lin(0x2a2a2e), roughness: 0.5, metalness: 0.6 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1, 0.12), [post, post, post, post, signM, signM]); sign.position.set(0, 5.2, 0); g.add(sign);
    for (const sx of [-2.4, 2.4]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), post); pl.position.set(sx, 2.6, 0); pl.castShadow = true; g.add(pl); }
    // a petrol pump and a tyre stack for the look
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 0.5), new THREE.MeshStandardMaterial({ color: hd.lin(0xc8202f), roughness: 0.4 })); pump.position.set(3.6, 0.85, 1.2); pump.castShadow = true; g.add(pump);
    const tyreM = new THREE.MeshStandardMaterial({ color: hd.lin(0x141414), roughness: 0.9 });
    for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.13, 8, 16).rotateX(Math.PI / 2), tyreM); t.position.set(-3.6, 0.14 + k * 0.26, 1.3); g.add(t); }
    g.position.set(G.x + nx * 2.2, y + 0.3, G.z + nz * 2.2); g.rotation.y = Math.atan2(nx, nz);
    g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize(g); scene.add(g); G.mesh = g;
    gridAdd([G.x + nx * 2.2 - 0.1, G.z + nz * 2.2, G.x + nx * 2.2 + 0.1, G.z + nz * 2.2], 0.4);
    const pad = addMarker(G.x, G.z, 4.2, 0x3a8aff); pad.garage = true; pad.beam.visible = false; markers.splice(markers.indexOf(pad), 1); G.pad = pad;
  }
  function buildGarage() {
    buildGarageAt(GARAGE);
    // the other real garages of the play area (OpenStreetMap): same services, their own sign
    const SIGNS = { 'Garage Auto 98': { sub: 'VÉHICULES D’OCCASION · ENTRETIEN', bg: '#b3121f', fg: '#f3ead8' } };
    for (const s of W.shops || []) {
      if (s.k !== 'garage' || Math.hypot(s.x - GARAGE.x, s.z - GARAGE.z) < 40 || Math.abs(s.x - CX) > HX - 10 || Math.abs(s.z - CZ) > HZ - 10) continue;
      if (typeof tramWall === 'function' && W.tram && s.z < tramWall(s.x) + 6) continue; // beyond the tram: out of reach
      const G = Object.assign({ x: s.x, z: s.z, name: s.n || 'Atelier mécanique', sub: 'RÉPARATIONS TOUTES MARQUES', bg: '#2a2a2e', fg: '#f2c81e', real: true }, SIGNS[s.n] || {});
      try { buildGarageAt(G); GARAGES.push(G); } catch (e) { console.warn('garage', s.n, e); }
    }
  }
  const UPG = [
    { k: 'repair', name: 'Réparation complète', desc: 'Carrosserie à 100 %', cost: () => 40 },
    { k: 'ammo', name: 'Plein de munitions', desc: '4 roquettes, 3 mines, 2 nitros', cost: () => 120 },
    { k: 'engine', name: 'Moteur gonflé', desc: 'Vitesse et reprise', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'armor', name: 'Blindage', desc: 'Encaisse mieux les coups', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'guns', name: 'Mitrailleuses', desc: 'Cadence et dégâts', max: 3, cost: l => [300, 600, 1000][l] },
    { k: 'paint', name: 'Peinture neuve', desc: 'Nouvelle couleur · la police perd ta trace', cost: () => 150 },
  ];
  const gEl = document.createElement('div'); gEl.id = 'garage'; gEl.hidden = true; document.body.append(gEl);
  const upg = () => settings.upg || (settings.upg = { engine: 0, armor: 0, guns: 0, paint: 0 });
  function applyUpgrades(L) {
    if (!L || (mode !== 'solo')) return;
    const u = upg(), c = L.car;
    c.maxV = (c.baseV || 44) * (1 + u.engine * 0.08); c.accK = (c.baseA || 1) * (1 + u.engine * 0.15); c.armor = 1 - u.armor * 0.15; L.gunK = u.guns;
  }
  function wallet(L) { return L.respect; }
  function openGarage(L) {
    garageOpen = true; blocking = true; garageSel = 0; L.car.vx = L.car.vz = 0; sfx.pick();
    renderGarage(L); gEl.hidden = false;
    say(curGarage === GARAGE ? ['Alors, qu’est-ce que je te fais ?', 'Entre, entre. On va arranger ça.', 'Encore toi ? Pose-la sur le pont.'][(R() * 3) | 0] : ['Bonjour ! C’est pour quoi ?', 'Posez-la là, on regarde ça.', 'Vous avez de la chance, on n’a personne.'][(R() * 3) | 0], { pitch: curGarage === GARAGE ? 0.75 : 1.1, cancel: true });
  }
  function closeGarage() { garageOpen = false; blocking = false; gEl.hidden = true; garageCool = 6; if (gx_onGarage) gx_onGarage(); }
  function renderGarage(L) {
    const u = upg();
    gEl.innerHTML = '<div class="card"><h2></h2><p class="gWallet">Respect à dépenser : <b>' + wallet(L) + '</b> · carrosserie ' + Math.round(L.car.hp) + ' %</p><div class="gList"></div><p class="fine">↑ ↓ choisir · Entrée ou A acheter · Échap ou B repartir</p><div class="menu"><button class="big gOut">Repartir</button></div></div>';
    gEl.querySelector('h2').textContent = curGarage.name;
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
      u.paint = (u.paint + 1) % CAR_PAINTS.length; settings.cars = settings.cars || []; settings.cars[0] = Object.assign(settings.cars[0] || { s: L.car.style || 'saloon' }, { p: (((settings.cars[0] || {}).p ?? 0) + 1) % CAR_PAINTS.length });
      const [a, b] = CAR_PAINTS[settings.cars[0].p];
      const old = L.car.mesh; L.car.mesh = makeCar(a, b, true, L.car.style || 'saloon'); L.car.mesh.position.copy(old.position); L.car.mesh.rotation.copy(old.rotation); scene.remove(old);
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
  function mkWrench() { // an adjustable spanner, one piece of forged steel: tapered handle with a hanging hole,
    // a head with the fixed jaw, the sliding jaw and its knurled worm wheel (sizes in metres before scaling)
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: hd.lin(0xc9ced6), roughness: 0.22, metalness: 1, envMapIntensity: 1.3 });
    const dark = new THREE.MeshStandardMaterial({ color: hd.lin(0x5a5e66), roughness: 0.35, metalness: 1 });
    const sh = new THREE.Shape();
    sh.moveTo(-0.045, -0.47); sh.absarc(0, -0.47, 0.045, Math.PI, 0, false);       // rounded end of the handle
    sh.lineTo(0.06, 0.1); sh.quadraticCurveTo(0.075, 0.17, 0.13, 0.2);            // handle widens into the head
    sh.quadraticCurveTo(0.2, 0.25, 0.19, 0.33); sh.lineTo(0.14, 0.36); sh.lineTo(0.035, 0.33); // under the sliding jaw
    sh.lineTo(0.03, 0.38); sh.lineTo(-0.075, 0.38);                               // bottom of the jaw opening
    sh.lineTo(-0.085, 0.56); sh.quadraticCurveTo(-0.15, 0.58, -0.19, 0.5);        // fixed jaw, hooked
    sh.quadraticCurveTo(-0.235, 0.36, -0.15, 0.24); sh.quadraticCurveTo(-0.07, 0.17, -0.06, 0.1);
    sh.lineTo(-0.045, -0.47);
    const hole = new THREE.Path(); hole.absellipse(0, -0.43, 0.018, 0.03, 0, Math.PI * 2, true); sh.holes.push(hole);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 }).translate(0, 0, -0.025), steel);
    g.add(body);
    // the sliding jaw, in the opening
    const jaw = new THREE.Shape(); jaw.moveTo(0.03, 0.38); jaw.lineTo(0.035, 0.52); jaw.quadraticCurveTo(0.08, 0.56, 0.12, 0.5); jaw.lineTo(0.14, 0.37); jaw.lineTo(0.03, 0.38);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(jaw, { depth: 0.042, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 }).translate(0, 0, -0.021), steel));
    // knurled worm wheel, seen through the head
    const worm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 16).rotateZ(Math.PI / 2), dark); worm.position.set(0.04, 0.3, 0); g.add(worm);
    for (let k = -2; k <= 2; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.006, 4, 16).rotateY(Math.PI / 2), dark); r.position.set(0.04 + k * 0.018, 0.3, 0); g.add(r); }
    // a red rubber grip, very 90s
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.058, 0.38, 18), new THREE.MeshStandardMaterial({ color: 0xd8202f, roughness: 0.55 }));
    grip.scale.z = 0.9; grip.position.y = -0.21; g.add(grip);
    for (const y of [-0.06, -0.36]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 6, 18).rotateX(Math.PI / 2), grip.material); b.scale.z = 0.9; b.position.y = y; g.add(b); }
    g.rotation.z = 0.35; g.scale.setScalar(2.1); g.position.y = 0.45;
    const o = new THREE.Group(); o.add(g); return o;
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
      if (d < 60 || d > 420 || Math.abs(x - CX) > HX - 15 || Math.abs(z - CZ) > HZ - 15 || pus.some(o => o !== pu && o.on && Math.hypot(o.x - x, o.z - z) < 60)) continue;
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
  const WEAPON_NAMES = { rockets: 'Roquettes', mines: 'Mines', nitro: 'Nitro' };
  function cycleWeapon(L) { // next special weapon in stock
    const a = L.ammo || (L.ammo = { rockets: 0, mines: 0, nitro: 0 }), order = ['rockets', 'mines', 'nitro'], have = order.filter(k => a[k] > 0);
    if (!have.length) { L.weapon = null; flashFor(L, 'Rien en stock', 'Ramasse des bonus ou passe au garage'); return; }
    const i = have.indexOf(L.weapon); L.weapon = have[(i + 1) % have.length];
    flashFor(L, WEAPON_NAMES[L.weapon], a[L.weapon] + ' en stock' + (have.length > 1 ? ' · ' + have.length + ' armes' : '')); sfx.pick();
  }
  function special(L) {
    const a = L.ammo || (L.ammo = { rockets: 0, mines: 0, nitro: 0 }), c = L.car; if (!c.alive) return;
    const order = ['rockets', 'mines', 'nitro'];
    if (!L.weapon || !a[L.weapon]) L.weapon = order.find(k => a[k] > 0) || null;
    if (!L.weapon) { flashFor(L, 'Rien en stock', 'Ramasse des bonus ou passe au garage'); return; }
    if (L.specCd > 0) return;
    if (L.weapon === 'rockets') { a.rockets--; L.specCd = 1.3; fireRocket(c, null); }
    else if (L.weapon === 'mines') { a.mines--; L.specCd = 0.6; dropMine(c, true); }
    else if (L.weapon === 'nitro') { a.nitro--; L.specCd = 0.4; c.nitro = 2.6; sfx.whoosh(); rumbleFor(L, 0.4, 0.6, 400); }
  }
  // rockets: slow, smoky, a big blast where they land
  const rockets = [];
  function fireRocket(from, target, ghost) { // ghost: another player's rocket, drawn here, its damage is counted on their side
    const [fx, fz] = ghost ? [ghost.vx / 42, ghost.vz / 42] : from.fwd, m = mkRocket(false); hd.linearize(m); m.traverse(o => { o.userData.hdLinear = true; }); scene.add(m);
    const [ox, oy, oz] = ghost ? [ghost.x, surfaceH(ghost.x, ghost.z) + 1, ghost.z] : muzzleOf(from);
    const r = { m, x: ox + fx * 1.5, y: oy + 0.15, z: oz + fz * 1.5, vx: fx * 42 + (ghost ? 0 : from.vx), vz: fz * 42 + (ghost ? 0 : from.vz), from, target, t: 0, ghost: !!ghost };
    rockets.push(r);
    if (!ghost && from.local && mode === 'online') Net.emit('rk', { x: Math.round(r.x * 10) / 10, z: Math.round(r.z * 10) / 10, vx: Math.round(r.vx * 10) / 10, vz: Math.round(r.vz * 10) / 10 });
    sfx.whoosh(); hd.muzzle(ox, oy, oz, false, fx, fz);
  }
  function netIn(topic, peer, d) { // rockets and blasts from the other players, for the eyes only
    if (!d || ![d.x, d.z].every(v => typeof v === 'number' && isFinite(v) && Math.abs(v) < 3000)) return;
    const R = Net.remotes.get(peer);
    if (topic === 'rk' && [d.vx, d.vz].every(v => typeof v === 'number' && isFinite(v) && Math.abs(v) < 200)) fireRocket(R ? R.car : { team: -9 }, null, d);
    if (topic === 'bl') explode(d.x, d.z);
  }
  function blast(x, z, by, dmg, r) {
    explode(x, z);
    for (const c of [...allPlayerCars(), ...rivals, ...npcs, ...extras]) {
      if (!c.alive || c === by && dmg < 0) continue;
      const d = Math.hypot(c.x - x, c.z - z); if (d > r) continue;
      const k = 1 - d / r; c.vx += (c.x - x) / (d || 1) * 14 * k; c.vz += (c.z - z) / (d || 1) * 14 * k; c.yv = (c.yv || 0) + 7 * k;
      if (c === by) { if (!c.remote) damage(c, dmg * k * 0.35, null); }
      else if (c.friendly && by && by.local) continue;
      else if (by && by.local) applyHit(by, c, dmg * k, c.x, c.z); // routes to remote players and to the host's bots online
      else if (!c.remote && !c.proxy) damage(c, dmg * k, by);
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
      if (!hit && (r.t > 3.5 || Math.abs(r.x - CX) > HX + 60 || Math.abs(r.z - CZ) > HZ + 60)) hit = [r.x, r.z];
      r.m.position.set(r.x, r.y, r.z); r.m.rotation.set(0, Math.atan2(-r.vx, -r.vz), 0);
      hd.smoke(r.x - ux * 0.5, r.y, r.z - uz * 0.5, (R() - 0.5), 0.5, (R() - 0.5), 0.35, 4, 1.2, 0.75, 0.45);
      hd.fire(r.x - ux * 0.45, r.y, r.z - uz * 0.45, -ux * 6, 0, -uz * 6, 0.45, 0.08, 1.2);
      if (hit) { scene.remove(r.m); rockets.splice(rockets.indexOf(r), 1); if (r.ghost) explode(hit[0], hit[1]); else blast(hit[0], hit[1], r.from, 48, 8); }
    }
  }
  // mines: dropped behind, armed after a second, go off when a car rolls over them
  const mines = [];
  const mineHalo = new THREE.MeshBasicMaterial({ map: puGlowTex, color: new THREE.Color(2.4, 0.25, 0.1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  function mineMesh() {
    const m = mkMine(); m.scale.setScalar(1.7); hd.linearize(m);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2), mineHalo); h.position.y = -0.2; m.add(h); m.userData.halo = h;
    m.traverse(o => { o.userData.hdLinear = true; }); scene.add(m); return m;
  }
  // a mine is dropped behind the car, or lobbed at an enemy in front (handy in a chase)
  function dropMine(c, aim) {
    const [fx, fz] = c.fwd, m = mineMesh();
    let target = null;
    if (aim) for (const o of [...allPlayerCars(), ...rivals, ...extras, ...npcs.filter(n => n.npc === 'cop')]) {
      if (o === c || !o.alive || !enemies(c, o) || o.friendly) continue;
      const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), al = (dx * fx + dz * fz) / (d || 1);
      if (d < 55 && d > 4 && al > 0.85 && (!target || d < target.d)) target = { o, d };
    }
    if (target) { // ballistic throw that lands where the target will be
      const T = 0.75, o = target.o, x0 = c.x + fx * 2.6, z0 = c.z + fz * 2.6;
      let vx = (o.x + o.vx * T - x0) / T, vz = (o.z + o.vz * T - z0) / T; const sp = Math.hypot(vx, vz); if (sp > 70) { vx *= 70 / sp; vz *= 70 / sp; }
      const y0 = surfaceH(x0, z0) + 1.4;
      mines.push({ m, x: x0, z: z0, y: y0, vx, vz, vy: 0.5 * 22 * T + (surfaceH(o.x, o.z) - y0 + 0.45) / T, fly: true, owner: c, t: 0 });
      sfx.whoosh(); if (c.local) flashFor(c.owner, 'Mine lancée !', '');
    } else {
      const x = c.x - fx * 3.2, z = c.z - fz * 3.2; m.position.set(x, surfaceH(x, z) + 0.45, z);
      mines.push({ m, x, z, owner: c, t: 0 }); sfx.hit();
    }
  }
  function mineStep(dt, now) {
    for (const mn of mines.slice()) {
      mn.t += dt; const blink = (now / 250 | 0) % 2; mn.m.userData.led.emissiveIntensity = blink ? 10 : 0.2; mn.m.userData.halo.material.opacity = 0.35 + blink * 0.5;
      if (mn.fly) { // in the air: falls, explodes on contact with a car
        mn.vy -= 22 * dt; mn.x += mn.vx * dt; mn.z += mn.vz * dt; mn.y += mn.vy * dt;
        const gy = surfaceH(mn.x, mn.z) + 0.45; mn.m.rotation.x += dt * 9;
        if (mn.y <= gy) { mn.y = gy; mn.fly = false; mn.t = 0; mn.m.rotation.x = 0; sfx.hit(); }
        mn.m.position.set(mn.x, mn.y, mn.z);
      } else if (mn.t < 0.2) continue; // armed almost at once: whoever follows the car that dropped it drives straight into it
      for (const c of [...allPlayerCars(), ...rivals, ...npcs, ...extras]) {
        if (!c.alive || (c === mn.owner && (mn.t < 3 || mn.fly))) continue;
        if (Math.hypot(c.x - mn.x, c.z - mn.z) < (mn.fly ? 2.4 : 3) && (!mn.fly || mn.y < c.mesh.position.y + 2)) { scene.remove(mn.m); mines.splice(mines.indexOf(mn), 1); blast(mn.x, mn.z, mn.owner, 52, 6.5); if (mn.owner.local && mode === 'online') Net.emit('bl', { x: Math.round(mn.x), z: Math.round(mn.z) }); break; }
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
      if (Math.abs(f.x - CX) > HX - 4 || Math.abs(f.z - CZ) > HZ - 4 || groundH(f.x, f.z) < WATER_Y + 1) continue;
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
    L.car.place(x, z, heading(x, z, G.x[nb], G.z[nb])); L.spawn = [x, z, L.car.h]; L.car.hp = 100; L.car.alive = true; L.car.vx = L.car.vz = 0; L.deadT = 0;
    const u = L.car.mesh.userData; if (u.mBody) u.mBody.color.setHex(u.base); if (u.mPaint) u.mPaint.color.setHex(u.paint);
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
        if (m.t > 5 && R() < dt * 1.1) { const c = locals[0].car, d = Math.hypot(c.x - f.x, c.z - f.z), [fx, fz] = f.fwd; if (d < 40 && ((c.x - f.x) * fx + (c.z - f.z) * fz) < 0) dropMineFrom(f); }
        objective('Le Vautour', 'Démolis le Vautour avant le quai · ' + Math.round(f.hp / f.maxHp * 100) + ' %'); objBar(f.hp / f.maxHp); objDir(f.x, f.z);
        return done ? 'fail' : null;
      }, fail: 'Le Vautour a atteint le quai de la Fosse' },
    { id: 'police', title: 'Pin-pon', where: 'Boulevard de la Liberté', police: true,
      intro: () => [['radio', 'Avis à la population : la police nationale ratisse Chantenay à la recherche d’' + carWanted() + '.'], ['dede', 'C’est toi qu’ils cherchent. Sème-les, puis viens au garage : une peinture neuve et ils ne te reconnaîtront plus.']],
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
  // what the police radio calls the player's car: its real model and colour (all feminine nouns)
  const PAINT_NAMES = ['violette', 'rouge', 'bleue', 'noire', 'blanche', 'verte', 'orange', 'jaune', 'turquoise', 'rose framboise'];
  const MODEL_NAMES = { saloon: 'berline', p205: '205', hatch: 'compacte', r5: 'R5', twingo: 'Twingo' };
  function carWanted() {
    const L = locals[0], p = CAR_PAINTS.indexOf(carChoice(0).paint);
    return 'une ' + (MODEL_NAMES[(L && L.car.style) || carChoice(0).style.k] || 'voiture') + ' ' + (PAINT_NAMES[p] || 'repérée dans le quartier');
  }
  function dropMineFrom(c) { if (mines.filter(m => m.owner === c).length < 6) dropMine(c); }
  const camp = () => settings.camp || (settings.camp = { done: [] });
  let cur = null;
  function startMission(i) {
    const M = MISSIONS[i]; if (!M) return;
    if (!started || mode !== 'solo') startGame('solo');
    cleanupMission();
    mission = { ...M, idx: i, noPolice: !M.police }; cur = mission;
    setupMatch(0, 0); benchRivals();
    for (const L of locals) { L.heat = 0; L.kills = 0; L.calm = 0; L.deadT = 0; }
    for (const c of npcs.slice()) if (c.npc === 'cop') removeNpc(c); // a fresh start: no police left over from the last try
    for (const mn of mines) scene.remove(mn.m); mines.length = 0;
    if (M.weather) { mission.savedAmb = [settings.tod, settings.rain]; hd.setTod(M.weather[0]); hd.setRain(M.weather[1]); hd.amb.t = 3; hd.amb.rain = M.weather[1]; hd.amb.wet = 1; }
    M.setup(mission);
    { const L = locals[0]; mission.snap = { respect: L.respect, ammo: { ...(L.ammo || {}) }, weapon: L.weapon }; }
    flash(M.title, M.where);
    dialogue(typeof M.intro === 'function' ? M.intro() : M.intro, () => { mission.live = true; sfx.pick(); });
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
    if (res === 'dead' && m.snap) { const L = locals[0]; L.respect = m.snap.respect; L.ammo = { ...m.snap.ammo }; L.weapon = m.snap.weapon; } // back to how things stood at the start
    if (win) { const c = camp(); if (!c.done.includes(m.id)) c.done.push(m.id); saveSettings(); locals[0].respect += 200 + i * 50; saveBank(locals[0]); }
    const show = () => {
      blocking = true; mEl.hidden = false;
      const next = win && MISSIONS[i + 1];
      mEl.innerHTML = '<div class="card"><h2></h2><p></p><div class="menu"></div></div>';
      mEl.querySelector('h2').textContent = win ? (i === MISSIONS.length - 1 ? 'Chantenay est libre !' : 'Mission réussie') : 'Mission ratée';
      mEl.querySelector('p').textContent = win ? m.title + ' · +' + (200 + i * 50) + ' respect' : res === 'dead' ? 'Ta caisse est en morceaux. La mission reprend depuis le début.' : (m.fail || 'Ce n’est que partie remise');
      const menu = mEl.querySelector('.menu');
      const btn = (t, f, big) => { const b = document.createElement('button'); b.className = big ? 'big' : 'mbtn'; b.textContent = t; b.addEventListener('click', () => { mEl.hidden = true; blocking = false; f(); }); menu.append(b); return b; };
      const first = next ? btn('Mission suivante · ' + next.title, () => startMission(i + 1), true) : btn(win ? 'Rouler librement' : 'Réessayer', () => win ? freeRoam() : startMission(i), true);
      if (next || !win) btn(win ? 'Rejouer' : 'Rouler librement', () => win ? startMission(i) : freeRoam());
      btn('Menu de la campagne', () => { cleanupMission(); toMenu(); });
      first.focus();
    };
    say(win ? 'Mission réussie !' : 'Mission ratée.', { cancel: true, pitch: 1.05 });
    if (win) dialogue(m.outro, show); else if (res === 'dead') setTimeout(show, 600); else show();
  }
  function freeRoam() { cleanupMission(); for (const r of rivals) spawnRival(r); setupMatch(settings.goal, settings.limit); flash('Chantenay', 'Bac à sable · roule librement'); }
  function toMenu() { // back to the title screen without reloading
    started = false; paused = false; document.body.classList.remove('ingame', 'split'); $('title').hidden = false; renderCampaign(); showView('vCamp');
    for (const L of locals) scene.remove(L.car.mesh); locals = [];
    for (const c of npcs.slice()) removeNpc(c); for (const p of peds) p.on = false; crowd.begin(); crowd.end(); active = false; sfx.engine(0, false); sfx.siren(0);
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
    step(dt);
    puStep(dt, now); rocketStep(dt); mineStep(dt, now); shieldStep(dt); furnitureStep(dt);
    for (const L of locals) {
      L.specCd = (L.specCd || 0) - dt;
      const c = L.car;
      if (c.nitro > 0) { c.nitro -= dt; if (R() < dt * 30) { const [fx, fz] = c.fwd; hd.fire(c.x - fx * 2.3, c.mesh.position.y + 0.3, c.z - fz * 2.3, -fx * 8, 0.3, -fz * 8, 0.45, 0.12, 1.4); } }
      // garage forecourt (solo and campaign)
      if (mode === 'solo' && GARAGE.pad && !garageOpen && c.alive) {
        garageCool -= dt;
        for (const G of GARAGES) if (Math.hypot(c.x - G.x, c.z - G.z) < 6 && c.speed < 9 && garageCool <= 0) { curGarage = G; openGarage(L); break; }
      }
    }
    for (const G of GARAGES) if (G.pad) { G.pad.ring.visible = mode === 'solo'; G.pad.ring.material.opacity = 0.5 + Math.sin(now / 250) * 0.3; }
    for (const m of markers) { m.ring.rotation.y += dt * 0.6; m.beam.material.opacity = 0.16 + Math.sin(now / 300) * 0.05; }
    hud(dt); modeStep(dt);
    if (mission && mission.live) {
      const c0 = locals[0] && locals[0].car;
      if (c0 && !c0.alive) { mission.deadFor = (mission.deadFor || 0) + dt; if (mission.deadFor > 1.6) endMission('dead'); } // wrecked: the mission starts over
      else { const r = mission.update(mission, dt); if (r) endMission(r); }
    }
  }
  let furnitureBuilt = false;
  function hud() {
    const el = $('ammo'); if (!el) return;
    const L = locals[0]; if (!L || locals.length > 1) { el.hidden = true; return; }
    const a = L.ammo || {}, items = [['rockets', '🚀', a.rockets], ['mines', '💣', a.mines], ['nitro', 'N₂O', a.nitro]].filter(x => x[2] > 0);
    el.hidden = !items.length && !(L.car.shield > 0);
    const sc = schemeOf(L.ctl), key = sc && sc.sp ? keyName(sc.sp[0]) : 'B', swk = sc && sc.sw ? keyName(sc.sw[0]) : 'RB';
    const txt = items.map(([k, ic, n]) => (L.weapon === k ? '▶' : '') + ic + ' ' + n).join('   ') + (L.car.shield > 0 ? '   🛡 ' + Math.ceil(L.car.shield) : '') + (items.length ? '   [' + key + ']' : '') + (items.length > 1 ? ' [' + swk + ' ⇄]' : '');
    if (el.textContent !== txt) el.textContent = txt;
  }
  gx_onGarage = () => { if (mission && mission.garage && (curGarage === GARAGE || mission.id === 'police')) { mission.garageVisited = true; mission.painted = mission.paintAt !== undefined && mission.paintAt !== upg().paint; } };
  function startHook(kind) {
    if (!furnitureBuilt) { buildFurniture(); buildGarage(); furnitureBuilt = true; for (const f of furniture) f.parts.forEach(o => { o.userData.p0 = o.position.clone(); }); }
    start(kind);
    for (const pk of pickups) { pk.on = false; pk.mesh.visible = false; }
    if (!pus.length) for (let i = 0; i < 12; i++) pus.push(makePu(PU_KINDS[i % PU_KINDS.length]));
    for (const pu of pus) placePu(pu);
    for (const L of locals) { L.ammo = { rockets: 0, mines: 0, nitro: 1 }; L.weapon = null; }
    if (kind === 'solo') { const L = locals[0]; L.respect = settings.bank || 0; applyUpgrades(L); }
    if (mission && kind !== 'solo') cleanupMission();
    stopMode(); if (kind === 'split' && settings.gmode >= 2) setupMode(settings.gmode); else if (kind === 'online' && Net.gxm) setupMode(Net.gxm);
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
  // ---------- quick chat: a few ready-made lines, D-pad or keys 1 to 6 ----------
  const QC = ['Par ici !', 'Attention, derrière toi !', 'Bien joué !', 'Revanche ?', 'Les flics !', 'Tous sur la Butte !'];
  let qcCd = 0;
  function quickChat(L, i) {
    if (!L || !QC[i] || performance.now() < qcCd) return; qcCd = performance.now() + 1200;
    const who = mode === 'online' ? (settings.nick || 'Moi') : 'J' + (L.slot + 1);
    if (mode === 'online') Net.emit('qc', { i, nick: settings.nick || 'Joueur' });
    chatShow(who, QC[i], L.colour);
  }
  function chatIn(peer, d) {
    if (!d || !Number.isInteger(d.i) || !QC[d.i]) return;
    const R = Net.remotes.get(peer); chatShow(R ? R.nick : String(d.nick || 'Joueur').slice(0, 14), QC[d.i], R ? R.colour : '#fff');
  }
  function chatShow(who, text, colour) {
    const d = document.createElement('div'); d.className = 'qc'; const b = document.createElement('b'); b.textContent = who + ' '; b.style.color = colour || 'var(--sunset)'; d.append(b, text);
    $('feed').prepend(d); setTimeout(() => d.remove(), 6000); while ($('feed').children.length > 6) $('feed').lastChild.remove();
    sfx.pick();
  }
  // =====================================================================================
  // split-screen modes: capture the flag (butte vs boulevard), king of the hill (place Jean-Macé), checkpoint race
  // =====================================================================================
  let gm = null;
  const MODE_NAMES = { 2: 'Capture du drapeau', 3: 'Roi de la colline', 4: 'Course de checkpoints' };
  function flagMesh(team) {
    const g = new THREE.Group(), T = TEAMS[team];
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), chrome); pole.position.y = 1.6; g.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95, 8, 4), new THREE.MeshStandardMaterial({ color: hd.lin(T.body), emissive: hd.lin(T.body), emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.7 }));
    cloth.position.set(0.78, 2.7, 0); g.add(cloth); g.userData.cloth = cloth;
    const p0 = cloth.geometry.attributes.position.array.slice(); cloth.userData.p0 = p0;
    g.traverse(o => { o.userData.hdLinear = true; o.castShadow = !!o.geometry; }); scene.add(g); return g;
  }
  const CP_ROUTE = [[160, -440], [-150, -537], [-86, -374], [-200, -150], [-232, 352], [-300, 540], [45, 283], [100, 20]];
  function setupMode(k) {
    gm = { kind: k, t: 0, objs: [] };
    if (k === 2) { // flags at the two bases
      gm.score = [0, 0];
      gm.flags = [0, 1].map(t => { const b = bases()[t], [x, z] = [b.x + b.ux * 14, b.z + b.uz * 14]; const m = addMarker(x, z, 4, TEAMS[t].body); return { team: t, home: [x, z], x, z, carrier: null, atHome: true, mesh: flagMesh(t), marker: m, idle: 0 }; });
      Match.goal = 3;
    } else if (k === 3) {
      const [x, z] = roadPoint(...P.jeanMace); gm.hill = addMarker(x, z, 26, 0xf2c81e); gm.owner = null;
      for (const r of rivals) r.ai.goal = { x, z };
      for (const L of locals) L.hillT = 0;
      Match.goal = 60;
    } else if (k === 4) {
      benchRivals();
      gm.cps = CP_ROUTE.map(([x, z], i) => { const [a, b] = roadPoint(x, z); return addMarker(a, b, 9, i === CP_ROUTE.length - 1 ? 0xffffff : 0x3ac8ff); });
      for (const L of locals) { L.cp = 0; L.kills = 0; }
      gm.count = 3.5; Match.goal = gm.cps.length;
    }
    updateClock();
  }
  function stopMode() { if (!gm) return; if (gm.flags) for (const f of gm.flags) scene.remove(f.mesh); clearMarkers(); if (gm.kind === 4) restoreRivals(); gm = null; }
  function modeStep(dt) {
    if (!gm) return;
    gm.t += dt;
    const now = performance.now();
    if (gm.kind === 2) {
      const cars = [...allPlayerCars(), ...rivals].filter(c => c.alive && c.team >= 0);
      for (const f of gm.flags) {
        if (f.carrier && !f.carrier.alive) { f.carrier = null; f.idle = 0; flashAll('Drapeau ' + (f.team ? 'chantenaysien' : 'des Rapaces') + ' à terre', ''); }
        if (f.carrier) { f.x = f.carrier.x; f.z = f.carrier.z; }
        else if (!f.atHome) { f.idle += dt; if (f.idle > 25) { f.atHome = true; [f.x, f.z] = f.home; } }
        for (const c of cars) {
          if (f.carrier || Math.hypot(c.x - f.x, c.z - f.z) > 4.5) continue;
          if (c.team !== f.team) { f.carrier = c; f.atHome = false; f.idle = 0; sfx.pick(); flashAll((c.owner && c.owner.slot !== undefined ? 'J' + (c.owner.slot + 1) : TEAMS[c.team].one) + ' a le drapeau !', 'Ramène-le à ta base'); break; }
          if (!f.atHome) { f.atHome = true; [f.x, f.z] = f.home; sfx.pick(); flashAll('Drapeau ramené', TEAMS[f.team].short); break; }
        }
        // capture: carrier reaches its own flag, which must be at home
        if (f.carrier) { const own = gm.flags[f.carrier.team]; if (own.atHome && Math.hypot(f.carrier.x - own.home[0], f.carrier.z - own.home[1]) < 6) {
          const tm = f.carrier.team; gm.score[tm]++; if (f.carrier.owner && f.carrier.local) { f.carrier.owner.kills++; f.carrier.owner.respect += 300; }
          flashAll('Capture ! ' + TEAMS[tm].short, gm.score[0] + ' – ' + gm.score[1]); say('Drapeau capturé pour les ' + TEAMS[tm].short + ' !', { cancel: true });
          f.carrier = null; f.atHome = true; [f.x, f.z] = f.home; for (const L of locals) rumbleFor(L, 0.5, 0.6, 300);
        } }
        const y = f.carrier ? f.carrier.mesh.position.y + 1.1 : surfaceH(f.x, f.z) + 0.2;
        f.mesh.position.set(f.x, y, f.z); f.mesh.rotation.y = now / 1400;
        const cl = f.mesh.userData.cloth, pa = cl.geometry.attributes.position, p0 = cl.userData.p0;
        for (let i = 0; i < pa.count; i++) { const x = p0[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 3 + now / 160) * 0.12 * (x + 0.75); } pa.needsUpdate = true;
        f.marker.set(f.x, f.z); f.marker.beam.visible = !f.carrier;
      }
      for (const r of rivals) { // bots: grab the other flag, carriers go home
        const enemyFlag = gm.flags[1 - r.team], mine = gm.flags[r.team];
        r.ai.goal = enemyFlag.carrier === r ? { x: mine.home[0], z: mine.home[1] } : !mine.atHome && !mine.carrier ? { x: mine.x, z: mine.z } : { x: enemyFlag.x, z: enemyFlag.z };
        if (enemyFlag.carrier === r) { r.ai.mode = 'cruise'; }
      }
    } else if (gm.kind === 3) {
      const h = gm.hill, inside = c => c.alive && Math.hypot(c.x - h.x, c.z - h.z) < h.r;
      const ps = locals.filter(L => inside(L.car)), bots = rivals.filter(inside);
      const teams = new Set(ps.map(L => teamMode ? 't' + L.team : 'p' + L.slot)); bots.forEach(r => teams.add(teamMode ? 't' + r.team : 'bots'));
      for (const R of Net.remotes.values()) if (inside(R.car)) teams.add('r' + R.peer);
      const owner = teams.size === 1 ? [...teams][0] : null;
      for (const L of ps) if (owner && (teamMode ? 't' + L.team : 'p' + L.slot) === owner) { L.hillT += dt; L.kills = Math.floor(L.hillT); }
      if (owner && owner !== gm.owner && owner[0] === 'p') say('Tu tiens la place !', { rate: 1.2 });
      if (owner !== gm.owner) { gm.owner = owner; h.ring.material.color.setHex(owner ? (owner === 'bots' ? 0xff3b3b : 0x7be07b) : 0xf2c81e).multiplyScalar(3); }
      h.beam.material.opacity = teams.size > 1 ? 0.35 + Math.sin(now / 90) * 0.15 : 0.2;
    } else if (gm.kind === 4) {
      if (gm.count > 0) {
        const before = Math.ceil(gm.count); gm.count -= dt; const after = Math.ceil(gm.count);
        for (const L of locals) { L.car.vx = L.car.vz = 0; }
        if (after !== before) { flashAll(after > 0 ? String(after) : 'Partez !', after > 0 ? 'Course de checkpoints' : ''); sfx.gun(after > 0); }
      }
      for (const L of locals) {
        const cp = gm.cps[L.cp]; if (!cp) continue;
        if (Math.hypot(L.car.x - cp.x, L.car.z - cp.z) < cp.r + 2) { L.cp++; L.kills = L.cp; L.respect += 50; sfx.pick(); flashFor(L, L.cp >= gm.cps.length ? 'Arrivée !' : 'Checkpoint ' + L.cp + ' / ' + gm.cps.length, ''); }
      }
      gm.cps.forEach((m, i) => { const next = locals.some(L => L.cp === i); m.beam.material.opacity = next ? 0.3 + Math.sin(now / 150) * 0.1 : 0.05; m.ring.visible = next || locals.some(L => L.cp < i); });
    }
    if (locals.length === 1 || true) {
      const txt = gm.kind === 2 ? 'Rapaces ' + gm.score[0] + ' – ' + gm.score[1] + ' Chantenaysiens' : gm.kind === 3 ? (gm.owner ? (gm.owner === 'bots' ? 'Les Rapaces tiennent la place' : gm.owner[0] === 'r' ? ((Net.remotes.get(gm.owner.slice(1)) || {}).nick || 'Un joueur') + ' tient la place' : gm.owner[0] === 't' ? TEAMS[+gm.owner[1]].short + ' tiennent la place' : 'J' + (+gm.owner.slice(1) + 1) + ' tient la place') : 'Place libre ou disputée')
        : locals.map(L => (mode === 'online' ? 'Toi' : 'J' + (L.slot + 1)) + ' ' + Math.min(L.cp, gm.cps.length) + '/' + gm.cps.length).join(' · ') + (mode === 'online' && Net.remotes.size ? ' · en tête : ' + Math.max(0, ...[...Net.remotes.values()].map(R => R.kills)) : '');
      objective(MODE_NAMES[gm.kind], txt); objDir(null);
    }
  }
  function modeTeamScores() { return gm && gm.kind === 2 ? gm.score.slice() : null; }
  function goalText() { return gm ? (gm.kind === 2 ? '3 captures pour gagner' : gm.kind === 3 ? '60 points pour gagner' : gm.cps.length + ' checkpoints') : ''; }
  function rematchMode() { if (!gm) return; const k = gm.kind; stopMode(); setupMode(k); }
  // =====================================================================================
  // hand-made landmarks: Saint-Martin's bell tower, the Loire quays, the Misery quarry, the yellow Titan crane
  // =====================================================================================
  const LM = {};
  const stdM = (c, r = 0.8, m = 0, extra = {}) => Object.assign(new THREE.MeshStandardMaterial({ color: hd.lin(c), roughness: r, metalness: m }), extra);
  function stoneTex(w, h, rows, tint) { // ashlar courses for the church and the quay walls
    const [c, g] = canvas(w, h); g.fillStyle = tint; g.fillRect(0, 0, w, h);
    const rh = h / rows;
    for (let r = 0; r < rows; r++) { let x = -(r % 2) * 18; while (x < w) { const bw = 26 + Math.random() * 22, l = 0.85 + Math.random() * 0.25;
      g.fillStyle = `rgba(${l > 1 ? 255 : 0},${l > 1 ? 255 : 0},${l > 1 ? 255 : 0},${Math.abs(l - 1) * 0.5})`; g.fillRect(x + 1, r * rh + 1, bw - 2, rh - 2);
      g.fillStyle = 'rgba(40,30,25,.45)'; g.fillRect(x, r * rh, bw, 1.5); g.fillRect(x, r * rh, 1.5, rh); x += bw; } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  function church() { // Saint-Martin de Chantenay: west bell tower with a slate spire over the place du Bourg
    let b = null, bi = -1; W.buildings.forEach((x, i) => { if (x.k === 6) { const n = x.p.length / 2; let cx = 0, cz = 0; for (let k = 0; k < n; k++) { cx += x.p[2 * k]; cz += x.p[2 * k + 1]; } cx /= n; cz /= n; if (Math.hypot(cx + 205, cz - 350) < 40) { b = x; bi = i; } } });
    if (!b) return;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let k = 0; k < b.p.length; k += 2) { x0 = Math.min(x0, b.p[k]); x1 = Math.max(x1, b.p[k]); z0 = Math.min(z0, b.p[k + 1]); z1 = Math.max(z1, b.p[k + 1]); }
    const tx = x0 - 1.5, tz = (z0 + z1) / 2, base = Math.min(groundH(tx, tz), b.b != null ? b.b : 1e9) - 0.5, top = base + 26;
    const st = stoneTex(512, 512, 16, '#cfc5b0'); st.repeat.set(1, 3);
    const stone = stdM(0xffffff, 0.85, 0, { map: st }), slate = stdM(0x3c4250, 0.55, 0.2), dark = stdM(0x141418, 0.9), gold = stdM(0xd8a43c, 0.3, 1);
    const g = new THREE.Group(); g.position.set(tx, 0, tz);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(7, top - base, 7), stone, 0, (top + base) / 2, 0);                    // tower shaft
    add(new THREE.BoxGeometry(7.6, 0.6, 7.6), stone, 0, base + 10, 0); add(new THREE.BoxGeometry(7.6, 0.6, 7.6), stone, 0, top - 0.3, 0); // string courses
    for (const [sx, sz, ry] of [[0, 3.52, 0], [0, -3.52, 0], [3.52, 0, Math.PI / 2], [-3.52, 0, Math.PI / 2]]) {
      const o = add(new THREE.BoxGeometry(1.6, 4, 0.1), dark, sx, top - 4, sz); o.rotation.y = ry;          // belfry openings
      const w = add(new THREE.BoxGeometry(1.2, 2.6, 0.1), dark, sx * 0.995, base + 5.5, sz * 0.995); w.rotation.y = ry; // tall windows
    }
    // west portal facing the place du Bourg
    const door = add(new THREE.BoxGeometry(0.2, 4.5, 2.6), stdM(0x3a2416, 0.7), -3.55, base + 2.25 + 0.5, 0);
    const arch = add(new THREE.CylinderGeometry(1.3, 1.3, 0.22, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), stdM(0x3a2416, 0.7), -3.55, base + 5, 0); arch.rotation.z = 0;
    // clock faces, lit at night
    const [cc, cg] = canvas(128, 128); cg.fillStyle = '#efe6cf'; cg.beginPath(); cg.arc(64, 64, 60, 0, 6.283); cg.fill(); cg.strokeStyle = '#222'; cg.lineWidth = 5; cg.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; cg.fillStyle = '#222'; cg.fillRect(64 + Math.cos(a) * 48 - 3, 64 + Math.sin(a) * 48 - 3, 6, 6); }
    cg.lineWidth = 6; cg.beginPath(); cg.moveTo(64, 64); cg.lineTo(64, 26); cg.moveTo(64, 64); cg.lineTo(92, 74); cg.stroke();
    const ct = new THREE.CanvasTexture(cc); ct.encoding = THREE.sRGBEncoding;
    const clockM = new THREE.MeshStandardMaterial({ map: ct, emissive: 0xffffff, emissiveMap: ct, emissiveIntensity: 0.15, roughness: 0.4 }); LM.clockM = clockM;
    for (const [sx, sz, ry] of [[0, 3.56, 0], [0, -3.56, Math.PI], [3.56, 0, Math.PI / 2], [-3.56, 0, -Math.PI / 2]]) { const o = add(new THREE.CircleGeometry(1.2, 24), clockM, sx, base + 13.5, sz); o.rotation.y = ry; }
    // pinnacles and the octagonal spire
    for (const sx of [-3.2, 3.2]) for (const sz of [-3.2, 3.2]) add(new THREE.ConeGeometry(0.5, 3.4, 4), stone, sx, top + 1.7, sz);
    add(new THREE.CylinderGeometry(3.2, 3.6, 1.2, 8), stone, 0, top + 0.6, 0);
    add(new THREE.ConeGeometry(3.1, 17, 8), slate, 0, top + 1.2 + 8.5, 0);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; const d = add(new THREE.BoxGeometry(0.7, 1.4, 0.7), slate, Math.cos(a) * 2.6, top + 3.2, Math.sin(a) * 2.6); d.rotation.y = -a; } // lucarnes
    add(new THREE.BoxGeometry(0.12, 2, 0.12), gold, 0, top + 19.1, 0); add(new THREE.BoxGeometry(0.12, 0.12, 1.1), gold, 0, top + 19.5, 0); // cross
    add(new THREE.SphereGeometry(0.25, 10, 8), gold, 0, top + 18.2, 0);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g);
    for (const [ax, az, bx, bz] of [[tx - 3.5, tz - 3.5, tx + 3.5, tz - 3.5], [tx + 3.5, tz - 3.5, tx + 3.5, tz + 3.5], [tx + 3.5, tz + 3.5, tx - 3.5, tz + 3.5], [tx - 3.5, tz + 3.5, tx - 3.5, tz - 3.5]]) gridAdd([ax, az, bx, bz], 0);
  }
  // Sainte-Anne (1846-1872), on the top of the butte: granite nave and transept, round apse, slate roofs,
  // the bell tower with its spire on the side of the avenue Sainte-Anne, which runs down to the stairs and the Loire
  function stAnne() {
    const L_ = landmarks.find(o => o.k === 'stAnne'); if (!L_) return;
    const p = L_.b.p, n = p.length / 2;
    let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += p[2 * i]; cz += p[2 * i + 1]; } cx /= n; cz /= n;
    // main axis of the footprint (principal component); the tower end is the one facing the stairs
    let sxx = 0, szz = 0, sxz = 0; for (let i = 0; i < n; i++) { const dx = p[2 * i] - cx, dz = p[2 * i + 1] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
    const th = 0.5 * Math.atan2(2 * sxz, sxx - szz); let ux = Math.cos(th), uz = Math.sin(th);
    if ((940 - cx) * ux + (100 - cz) * uz < 0) { ux = -ux; uz = -uz; }
    const vx = -uz, vz = ux;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (let i = 0; i < n; i++) { const dx = p[2 * i] - cx, dz = p[2 * i + 1] - cz, a = dx * ux + dz * uz, b = dx * vx + dz * vz; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    const len = a1 - a0, wid = b1 - b0, base = L_.base - 0.3;
    const st = stoneTex(512, 512, 18, '#bdb3a2'); st.repeat.set(2, 2);
    const stone = stdM(0xffffff, 0.85, 0, { map: st }), light = stdM(0xd9cfbb, 0.8), slate = stdM(0x3a404c, 0.5, 0.25), glass = stdM(0x223044, 0.2, 0.3, { emissive: new THREE.Color(0.9, 0.55, 0.25), emissiveIntensity: 0 }), gold = stdM(0xd8a43c, 0.3, 1), wood = stdM(0x3a2416, 0.7);
    LM.stAnneGlass = glass;
    const g = new THREE.Group(); g.position.set(cx, base, cz); g.rotation.y = Math.atan2(ux, uz); // local +z = towards the stairs
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const roof = (w, l, h, y, x, z) => { // a pitched roof: a triangular prism along local z
      const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.4, 0); s.lineTo(w / 2 + 0.4, 0); s.lineTo(0, h); s.lineTo(-w / 2 - 0.4, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false }); geo.translate(0, 0, -l / 2); return add(geo, slate, x, y, z);
    };
    const mid = (a0 + a1) / 2, tower = 7.5, naveW = Math.min(14, wid * 0.42), naveL = len - tower - 6, naveZ = a0 + 6 + naveL / 2, eaves = 13;
    add(new THREE.BoxGeometry(naveW, eaves, naveL), stone, 0, eaves / 2, naveZ);          // nave
    roof(naveW, naveL, 7, eaves, 0, naveZ);
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(wid * 0.22, 8, naveL - 4), stone, s * (naveW / 2 + wid * 0.11), 4, naveZ); } // aisles
    const trZ = a0 + 6 + naveL * 0.3, trW = Math.min(wid - 1, naveW * 2.4);                // transept
    add(new THREE.BoxGeometry(trW, eaves, 9), stone, 0, eaves / 2, trZ);
    { const s = new THREE.Shape(); s.moveTo(-4.9, 0); s.lineTo(4.9, 0); s.lineTo(0, 6.5); s.lineTo(-4.9, 0); const geo = new THREE.ExtrudeGeometry(s, { depth: trW, bevelEnabled: false }); geo.translate(0, 0, -trW / 2); geo.rotateY(Math.PI / 2); add(geo, slate, 0, eaves, trZ); }
    const ap = add(new THREE.CylinderGeometry(naveW / 2, naveW / 2, eaves - 1, 18, 1, false, Math.PI / 2, Math.PI), stone, 0, (eaves - 1) / 2, a0 + 6); ap.rotation.y = Math.PI; // apse, at the back
    add(new THREE.SphereGeometry(naveW / 2 + 0.3, 18, 8, Math.PI / 2, Math.PI, 0, Math.PI / 2), slate, 0, eaves - 1, a0 + 6).rotation.y = Math.PI;
    // tall windows along the nave, round-headed, glowing at night
    for (let k = 0; k < 6; k++) { const z = a0 + 9 + k * (naveL - 6) / 5; for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.15, 4.6, 1.5), glass, s * (naveW / 2 + 0.05), 8.2, z); }
    for (const s of [-1, 1]) add(new THREE.CircleGeometry(2.4, 24), glass, s * (trW / 2 + 0.06), 8.5, trZ, s * Math.PI / 2); // transept roses
    // the bell tower on the facade: square shaft, belfry, pinnacles, octagonal spire with a gilded cross
    const tz = a1 - tower / 2, tw = 7.6, shaft = 27;
    add(new THREE.BoxGeometry(tw, shaft, tw), stone, 0, shaft / 2, tz);
    for (const y of [9, 18, shaft]) add(new THREE.BoxGeometry(tw + 0.6, 0.6, tw + 0.6), light, 0, y, tz);
    for (const [sx, sz, ry] of [[0, tw / 2 + 0.03, 0], [0, -tw / 2 - 0.03, 0], [tw / 2 + 0.03, 0, Math.PI / 2], [-tw / 2 - 0.03, 0, Math.PI / 2]]) {
      for (const dx of [-1.3, 1.3]) add(new THREE.BoxGeometry(1.4, 5.2, 0.1), stdM(0x101014, 0.9), sx + (ry ? 0 : dx), shaft - 4, tz + sz + (ry ? dx : 0), ry); // twin belfry openings
      add(new THREE.CircleGeometry(1.1, 20), stdM(0xefe6cf, 0.4), sx, 14, tz + sz, ry + (sz < 0 ? Math.PI : 0) + (sx < 0 ? Math.PI : 0));
    }
    add(new THREE.BoxGeometry(3.4, 6.5, 0.4), wood, 0, 3.6, tz + tw / 2 + 0.1);             // portal
    add(new THREE.CylinderGeometry(1.7, 1.7, 0.5, 18, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), light, 0, 6.85, tz + tw / 2 + 0.15);
    add(new THREE.CircleGeometry(1.5, 24), glass, 0, 11.5, tz + tw / 2 + 0.06);              // rose above the portal
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.ConeGeometry(0.55, 4, 4), light, sx * (tw / 2 - 0.4), shaft + 2, tz + sz * (tw / 2 - 0.4), Math.PI / 4);
    add(new THREE.CylinderGeometry(3.3, 3.7, 1.4, 8), light, 0, shaft + 0.7, tz);
    add(new THREE.ConeGeometry(3.3, 21, 8), slate, 0, shaft + 1.4 + 10.5, tz);
    add(new THREE.BoxGeometry(0.15, 2.4, 0.15), gold, 0, shaft + 23.5, tz); add(new THREE.BoxGeometry(1.3, 0.15, 0.15), gold, 0, shaft + 23.9, tz);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.stAnne = g;
  }
  // the Sainte-Anne stairs (1851): the double flight from the statue down to the quai Marquis d'Aiguillon (OpenStreetMap ways)
  const STAIRS = [[939.5, 101.8, 945, 106.9, 25], [946.4, 108.3, 952, 113.4, 25], [953.5, 114.8, 959.1, 119.9, 25], [960.5, 121.3, 963.4, 123.9, 15],
    [942.4, 98.9, 947.9, 104, 25], [949.3, 105.3, 954.9, 110.5, 25], [956.4, 111.9, 962, 117, 25], [963.4, 118.3, 966.2, 120.9, 15],
    [969.8, 122.1, 972.4, 119.2, 15], [974, 117.5, 976.5, 114.8, 14], [964.9, 127.5, 962.3, 130.3, 15], [960.8, 132, 958.2, 134.7, 14]];
  function stairs() {
    const st = stoneTex(256, 256, 8, '#c9c0ae'), stepM = stdM(0xffffff, 0.9, 0, { map: st }), wallM = stdM(0xb7ad9b, 0.85), rail = stdM(0x1c1d22, 0.5, 0.7);
    const total = STAIRS.reduce((s, f) => s + f[4], 0), steps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stepM, total), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    // heights: the flights follow each other down the slope; the terrain sets the top and the quay the bottom
    const top = groundH(940, 100), bot = Math.max(WATER_Y + 1.5, Math.min(groundH(978, 112), groundH(955, 138)));
    const drop = top - bot, perStep = drop / 119; // 90 steps on each upper flight, then 29 on each lower one
    let k = 0; const g = new THREE.Group();
    const flightTop = i => top - [0, 25, 50, 75, 0, 25, 50, 75, 90, 105, 90, 105][i] * perStep;
    STAIRS.forEach(([ax, az, bx, bz, cnt], i) => {
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, y0 = flightTop(i), d = L / cnt, W = 2.6;
      q.setFromAxisAngle(up, Math.atan2(dx, dz));
      for (let s = 0; s < cnt; s++) {
        const y = y0 - s * perStep, h = Math.max(0.3, y - (bot - 2)), cxs = ax + dx * (s + 0.5) * d, czs = az + dz * (s + 0.5) * d;
        m4.compose(new THREE.Vector3(cxs, y - h / 2, czs), q, new THREE.Vector3(W, h, d + 0.02)); steps.setMatrixAt(k++, m4);
      }
      const yEnd = y0 - cnt * perStep, slope = Math.atan2(y0 - yEnd, L);
      for (const side of [-1, 1]) { // parapet and handrail along the flight
        const ox = -dz * side * (W / 2 + 0.2), oz = dx * side * (W / 2 + 0.2), mx = (ax + bx) / 2 + ox, mz = (az + bz) / 2 + oz, my = (y0 + yEnd) / 2;
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, L / Math.cos(slope) + 0.4), wallM); w.position.set(mx, my + 0.2, mz); w.rotation.set(0, Math.atan2(dx, dz), 0, 'YXZ'); w.rotateX(slope); w.castShadow = w.receiveShadow = true; g.add(w);
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, L / Math.cos(slope), 6), rail); r.position.set(mx - ox * 0.5, my + 1.0, mz - oz * 0.5); r.rotation.set(0, Math.atan2(dx, dz), 0, 'YXZ'); r.rotateX(Math.PI / 2 + slope); g.add(r);
      }
    });
    steps.count = k; steps.castShadow = steps.receiveShadow = true; g.add(steps);
    // the statue of Sainte-Anne (Amédée Ménard, 1871) on its column at the top, looking over the Loire
    const sx = 939.6, sz = 99.5, sy = groundH(sx, sz), white = stdM(0xe6dfd0, 0.7), lamp = stdM(0x1c1d22, 0.5, 0.7);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(2.6, 1.2, 2.6), wallM, sx, sy + 0.6, sz); add(new THREE.CylinderGeometry(0.75, 0.9, 5.5, 12), white, sx, sy + 3.95, sz);
    add(new THREE.BoxGeometry(1.8, 0.5, 1.8), white, sx, sy + 6.95, sz);
    const fig = new THREE.Group(); fig.position.set(sx, sy + 7.2, sz); fig.rotation.y = Math.atan2(0.74, 0.67); g.add(fig);
    const f = (geo, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, white); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; fig.add(o); };
    f(new THREE.CylinderGeometry(0.35, 0.75, 2.3, 14), 0, 1.15, 0); f(new THREE.SphereGeometry(0.3, 12, 10), 0, 2.55, 0); f(new THREE.ConeGeometry(0.42, 0.7, 12), 0, 2.75, -0.04);
    f(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 8), 0.35, 1.7, 0.25, -0.9); f(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 10), 0.25, 1.35, 0.4); f(new THREE.SphereGeometry(0.15, 10, 8), 0.25, 1.85, 0.4); // the child Mary at her side
    f(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 8), -0.45, 2.1, 0.35, -1.9); // arm raised towards the river
    for (const [lx, lz] of [[sx - 2.5, sz + 2.5], [sx + 2.5, sz - 2.5]]) { add(new THREE.CylinderGeometry(0.08, 0.12, 4, 8), lamp, lx, sy + 2, lz); const gl = add(new THREE.SphereGeometry(0.28, 10, 8), stdM(0xfff2cc, 0.3, 0, { emissive: new THREE.Color(1, 0.8, 0.5), emissiveIntensity: 0 }), lx, sy + 4.2, lz); (LM.stLamps = LM.stLamps || []).push(gl.material); }
    gridAdd([sx - 1.3, sz - 1.3, sx + 1.3, sz + 1.3], 0); gridAdd([sx + 1.3, sz - 1.3, sx - 1.3, sz + 1.3], 0);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.stairs = g;
  }
  // quays: a stone wall along the Loire, traced on the terrain (marching squares on the height grid)
  function quays() {
    const D = DEM, lvl = (WATER_Y + 1.0) * 10, H = (i, j) => D.h[Math.max(0, Math.min(D.nz - 1, j)) * D.nx + Math.max(0, Math.min(D.nx - 1, i))];
    const segs = [];
    for (let j = 0; j < D.nz - 1; j++) for (let i = 0; i < D.nx - 1; i++) {
      const v = [H(i, j), H(i + 1, j), H(i + 1, j + 1), H(i, j + 1)], P_ = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], pts = [];
      for (let e = 0; e < 4; e++) { const a = v[e], b2 = v[(e + 1) % 4]; if ((a < lvl) !== (b2 < lvl)) { const t = (lvl - a) / (b2 - a), [ai, aj] = P_[e], [bi, bj] = P_[(e + 1) % 4]; pts.push([D.x0 + (ai + (bi - ai) * t) * D.step, D.z0 + (aj + (bj - aj) * t) * D.step]); } }
      if (pts.length === 2) segs.push([...pts[0], ...pts[1]]); else if (pts.length === 4) { segs.push([...pts[0], ...pts[1]]); segs.push([...pts[2], ...pts[3]]); }
    }
    if (!segs.length) return;
    const st = stoneTex(512, 256, 8, '#9a9184'); const wallM = stdM(0xffffff, 0.9, 0, { map: st }), copeM = stdM(0xb8b0a2, 0.75);
    const pos = [], uv = [], cpos = [], bollards = [];
    let acc = 0;
    for (const [ax, az, bx, bz] of segs) {
      const L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
      const yt = Math.max(groundH(ax, az), groundH(bx, bz), WATER_Y + 1.3) + 0.15, yb = WATER_Y - 2.5;
      pos.push(ax, yb, az, bx, yb, bz, bx, yt, bz, ax, yb, az, bx, yt, bz, ax, yt, az);
      uv.push(acc / 6, 0, (acc + L) / 6, 0, (acc + L) / 6, (yt - yb) / 3, acc / 6, 0, (acc + L) / 6, (yt - yb) / 3, acc / 6, (yt - yb) / 3);
      const nx = -(bz - az) / L * 0.35, nz = (bx - ax) / L * 0.35;
      cpos.push(ax - nx, yt, az - nz, bx - nx, yt, bz - nz, bx + nx, yt, bz + nz, ax - nx, yt, az - nz, bx + nx, yt, bz + nz, ax + nx, yt, az + nz);
      acc += L; if (acc % 22 < L && Math.abs(ax - CX) < HX + 140) bollards.push([ax, az, yt]);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const wall = new THREE.Mesh(geo, wallM); wall.material.side = THREE.DoubleSide; wall.receiveShadow = true;
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); cg.computeVertexNormals();
    const cope = new THREE.Mesh(cg, copeM); cope.material.side = THREE.DoubleSide; cope.receiveShadow = true;
    const bm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.24, 0.6, 10).translate(0, 0.3, 0), stdM(0x1c1c20, 0.5, 0.6), bollards.length);
    const m4 = new THREE.Matrix4(); bollards.forEach(([x, z, y], i) => { m4.makeTranslation(x, y, z); bm.setMatrixAt(i, m4); }); bm.castShadow = true;
    const g = new THREE.Group(); g.add(wall, cope, bm); hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g);
    LM.quay = segs;
    // a moored barge and the yellow Titan crane at the far end of the quays, towards the Île de Nantes
    let east = null; for (const sg of segs) if (sg[1] > 480 && (!east || sg[0] > east[0])) east = sg;
    let mid = null; for (const sg of segs) if (sg[1] > 520 && Math.abs(sg[0] - 250) < (mid ? Math.abs(mid[0] - 250) : 1e9)) mid = sg;
    if (mid) barge(mid); titan();
  }
  function barge(sg) {
    const [ax, az, bx, bz] = sg, L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L;
    let nx = -uz, nz = ux; if (groundH(ax + nx * 8, az + nz * 8) > groundH(ax - nx * 8, az - nz * 8)) { nx = -nx; nz = -nz; } // towards the water
    const g = new THREE.Group(), hull = stdM(0x1f2a36, 0.6, 0.2), red = stdM(0x8a1d1d, 0.6), cream = stdM(0xe8e2d0, 0.6);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(5.2, 1.6, 30), hull, 0, 0.2, 0); add(new THREE.BoxGeometry(5.3, 0.25, 30.1), red, 0, 1.05, 0);
    add(new THREE.BoxGeometry(3.8, 2.4, 5), cream, 0, 2.2, 11); add(new THREE.BoxGeometry(4, 0.2, 5.4), red, 0, 3.5, 11);
    add(new THREE.BoxGeometry(3.6, 0.7, 18), stdM(0x3a3020, 0.8), 0, 1.4, -3);
    g.position.set(ax + nx * 6, WATER_Y - 0.1, az + nz * 6); g.rotation.y = Math.atan2(ux, uz);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.barge = g;
  }
  function titan(sg) { // the yellow Titan crane (1954): a lattice tower, the cabin, the long boom over the river
    const x = 1690, z = -430; // its real spot: the western tip of the Île de Nantes, across the Loire from the quai de la Fosse
    const yel = stdM(0xf2b705, 0.45, 0.35), dark = stdM(0x2a2a2e, 0.6, 0.5), g = new THREE.Group();
    const add = (geo, m, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
    // portal legs with cross-bracing
    for (const lx of [-5, 5]) for (const lz of [-5, 5]) add(new THREE.BoxGeometry(0.8, 26, 0.8), yel, lx, 13, lz);
    for (const y of [6, 13, 20, 26]) { add(new THREE.BoxGeometry(11, 0.6, 0.6), yel, 0, y, -5); add(new THREE.BoxGeometry(11, 0.6, 0.6), yel, 0, y, 5); add(new THREE.BoxGeometry(0.6, 0.6, 11), yel, -5, y, 0); add(new THREE.BoxGeometry(0.6, 0.6, 11), yel, 5, y, 0); }
    for (const y of [3, 10, 17]) { add(new THREE.BoxGeometry(0.35, 9.5, 0.35), yel, 0, y + 3.5, -5, 0, 0, 0.9); add(new THREE.BoxGeometry(0.35, 9.5, 0.35), yel, 0, y + 3.5, 5, 0, 0, -0.9); }
    add(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 20), dark, 0, 27, 0);
    add(new THREE.BoxGeometry(7, 6, 7), yel, 0, 31, 0);                                  // machinery house
    add(new THREE.BoxGeometry(2.6, 2.4, 2.4), stdM(0x9ab0c0, 0.1, 0.2), 4.6, 30, 0);     // cabin
    add(new THREE.BoxGeometry(4, 12, 4), yel, 0, 40, 0);                                 // A-frame mast
    add(new THREE.BoxGeometry(1.4, 1.6, 62), yel, 0, 34.5, -24);                         // the boom over the water
    add(new THREE.BoxGeometry(1.2, 1.2, 18), yel, 0, 35, 14);                            // counter-jib
    add(new THREE.BoxGeometry(4.5, 4, 5), dark, 0, 33, 21);                              // counterweight
    add(new THREE.CylinderGeometry(0.05, 0.05, 46, 4), dark, 0, 40, -18, 1.2, 0, 0); add(new THREE.CylinderGeometry(0.05, 0.05, 22, 4), dark, 0, 40, 10, -1.0, 0, 0);
    add(new THREE.CylinderGeometry(0.04, 0.04, 20, 4), dark, 0, 24, -52); add(new THREE.BoxGeometry(1.2, 1.4, 1.2), dark, 0, 14, -52);
    const redL = new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.3, 0.2) }); LM.titanLights = redL;
    for (const p of [[0, 46.2, 0], [0, 35.6, -55], [0, 35.6, 22]]) add(new THREE.SphereGeometry(0.35, 8, 6), redL, ...p);
    g.position.set(x, Math.max(groundH(x, z), WATER_Y + 1.2), z); g.rotation.y = 0.4; g.scale.setScalar(1.15);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.titan = g;
  }
  // the Misery quarry: the granite cliff face of the old quarry, just east of the district
  function misery() {
    const x = HX + 75, z0 = 180, z1 = 380, g = new THREE.Group();
    const [c, cg] = canvas(512, 256); cg.fillStyle = '#7d7468'; cg.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 900; i++) { const l = 80 + Math.random() * 90; cg.fillStyle = `rgba(${l},${l - 6},${l - 14},.5)`; const w = 6 + Math.random() * 40; cg.fillRect(Math.random() * 512, Math.random() * 256, w, 2 + Math.random() * 10); }
    for (let i = 0; i < 40; i++) { cg.strokeStyle = 'rgba(30,26,22,.55)'; cg.lineWidth = 1 + Math.random() * 2; cg.beginPath(); const sx = Math.random() * 512; cg.moveTo(sx, 0); cg.lineTo(sx + (Math.random() - 0.5) * 60, 256); cg.stroke(); }
    for (let i = 0; i < 160; i++) { cg.fillStyle = `rgba(${40 + Math.random() * 40},${80 + Math.random() * 50},${30},.6)`; cg.beginPath(); cg.arc(Math.random() * 512, Math.random() < 0.6 ? Math.random() * 40 : Math.random() * 256, 3 + Math.random() * 9, 0, 6.283); cg.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.repeat.set(3, 1);
    const n = 40, geo = new THREE.PlaneGeometry(z1 - z0, 30, n, 8), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i); p.setZ(i, Math.sin(u * 0.13) * 3 + Math.sin(u * 0.41 + v * 0.3) * 1.6 + (Math.random() - 0.5) * 1.2 + (v + 15) * 0.25); }
    geo.computeVertexNormals();
    const face = new THREE.Mesh(geo, stdM(0xffffff, 0.95, 0, { map: t })); face.rotation.y = -Math.PI / 2; face.position.set(x, groundH(x - 30, (z0 + z1) / 2) + 14, (z0 + z1) / 2); face.receiveShadow = face.castShadow = true;
    g.add(face);
    // the top of the cliff: trees
    const crown = new THREE.InstancedMesh(hd.crownGeo(), stdM(0x3c6a2a, 0.9), 26), m4 = new THREE.Matrix4();
    for (let i = 0; i < 26; i++) { const zz = z0 + Math.random() * (z1 - z0); m4.compose(new THREE.Vector3(x + 4 + Math.random() * 14, face.position.y + 15 + Math.random() * 2, zz), new THREE.Quaternion(), new THREE.Vector3().setScalar(1.4 + Math.random())); crown.setMatrixAt(i, m4); }
    g.add(crown);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.misery = g;
  }
  function world() {
    try { church(); } catch (e) { console.warn('church', e); }
    try { quays(); } catch (e) { console.warn('quays', e); }
    try { stAnne(); } catch (e) { console.warn('stAnne', e); }
    try { stairs(); } catch (e) { console.warn('stairs', e); }
    // (the Misery quarry used to be a painted cliff past the map edge: the real slope of the butte is in the relief now)
    buildFurniture(); try { buildTerraces(); } catch (e) { console.warn('terraces', e); } buildGarage(); furnitureBuilt = true; for (const f of furniture) f.parts.forEach(o => { o.userData.p0 = o.position.clone(); });
  }
  function landmarkTick() { // lights that follow the time of day
    const n = hd.amb ? Math.min(1, hd.amb.t / 2.2) : 0;
    if (LM.clockM) LM.clockM.emissiveIntensity = 0.15 + n * 2.2;
    if (LM.stAnneGlass) LM.stAnneGlass.emissiveIntensity = n * 1.6; if (LM.stLamps) for (const m of LM.stLamps) m.emissiveIntensity = n * 6;
    if (LM.titanLights) LM.titanLights.color.setRGB((performance.now() / 700 | 0) % 2 ? 8 * n + 0.6 : 0.4, 0.3, 0.2);
  }
  { const el = $('ammo'); if (el) { el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.addEventListener('pointerdown', e => { e.preventDefault(); if (locals[0]) cycleWeapon(locals[0]); }); } }
  const api = { netIn, dj, cycleWeapon, quickChat, chatIn, step: gameStep, world, landmarkTick, tick, start: startHook, cars: () => npcs.concat(extras), damage: damageNpc, addHeat, say, peds: () => peds, stars, special, startMission, renderCampaign, cleanupMission, MISSIONS,
    get gmode() { return gm ? gm.kind : 0; }, mines: () => mines, customers: () => customers, teamScores: modeTeamScores, goalText, rematch: rematchMode,
    get blocking() { return blocking; }, get mission() { return mission; }, foes: () => extras.filter(c => c.alive && c.team === 1), saveBank, pus: () => pus, furniture: () => furniture, garage: GARAGE, garages: GARAGES,
    get onGarage() { return gx_onGarage; },
    minimap(me, add) { minimap(me, add); for (const pu of pus) if (pu.on) add(pu, '#' + new THREE.Color(PU_COL[pu.kind]).getHexString()); for (const c of extras) if (c.alive) add(c, c.friendly ? '#f2c81e' : '#ff3b3b'); for (const m of markers) add(m, '#ffffff'); if (GARAGE.pad && mode === 'solo') for (const G of GARAGES) add(G, '#3a8aff'); } };
  return api;
})();
// <<< GAMEPLAY MODULE
