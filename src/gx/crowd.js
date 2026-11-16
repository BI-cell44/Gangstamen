  // ---------- the crowd: one small rig posed on the CPU, drawn as instanced body parts (a dozen draw calls in all) ----------
  const CROWD_MAX = 160;
  const crowd = (() => {
    // (Fable 5.2, user feedback: the people were stacks of boxes.) Rounded parts: a torso lofted from the hips to the
    // shoulders, tapered limbs, a head on a neck with a nose, shoes with a toe, several haircuts, jackets, bags. Each
    // person also has a build (shoulder width, belly, limb thickness) applied when the part is drawn.
    const rings = (R_, seg = 10) => { // [y, rx, rz, z offset] rings -> closed tube with smooth normals
      const pos = [], idx = [];
      R_.forEach(([y, rx, rz, zo = 0]) => { for (let i = 0; i < seg; i++) { const a = i / seg * 6.2832; pos.push(Math.sin(a) * rx, y, Math.cos(a) * rz + zo); } });
      for (let r = 0; r + 1 < R_.length; r++) for (let i = 0; i < seg; i++) { const a = r * seg + i, b2 = r * seg + (i + 1) % seg, c = a + seg, d = b2 + seg; idx.push(a, b2, c, b2, d, c); }
      const cap = (r, up) => { const c0 = pos.length / 3; pos.push(0, R_[r][0], R_[r][3] || 0); for (let i = 0; i < seg; i++) { const a = r * seg + i, b2 = r * seg + (i + 1) % seg; if (up) idx.push(a, b2, c0); else idx.push(b2, a, c0); } };
      cap(0, true); cap(R_.length - 1, false);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
    };
    const limb = (r0, r1, len, zs = 1) => rings([[0, r0, r0 * zs], [-len * 0.35, (r0 + r1) / 2 * 1.06, (r0 + r1) / 2 * 1.06 * zs], [-len, r1, r1 * zs]], 8);
    const G_ = {
      torso: rings([[0, 0.165, 0.115], [0.1, 0.17, 0.12], [0.24, 0.15, 0.105], [0.4, 0.185, 0.12, 0.005], [0.5, 0.2, 0.11], [0.56, 0.13, 0.085], [0.6, 0.055, 0.055]], 12),
      head: (() => { const g = rings([[-0.02, 0.05, 0.05], [0.03, 0.085, 0.09, 0.005], [0.11, 0.103, 0.115, 0.008], [0.19, 0.1, 0.112, 0.004], [0.245, 0.06, 0.07]], 12); return g; })(),
      nose: new THREE.ConeGeometry(0.018, 0.045, 5).rotateX(Math.PI / 2).translate(0, 0.105, 0.125),
      hair: rings([[0.1, 0.108, 0.118, -0.012], [0.17, 0.112, 0.124, -0.006], [0.235, 0.09, 0.1, -0.004], [0.265, 0.03, 0.035]], 12),
      hairLong: rings([[-0.16, 0.085, 0.045, -0.085], [-0.02, 0.1, 0.06, -0.075], [0.1, 0.112, 0.12, -0.018], [0.18, 0.113, 0.125, -0.008], [0.24, 0.088, 0.098, -0.004], [0.265, 0.03, 0.035]], 12),
      bun: new THREE.SphereGeometry(0.055, 8, 6).translate(0, 0.21, -0.12),
      cap: rings([[0.16, 0.111, 0.122, -0.004], [0.215, 0.105, 0.115], [0.255, 0.07, 0.08], [0.272, 0.02, 0.02]], 12),
      visor: rings([[0.168, 0.085, 0.075, 0.15], [0.178, 0.085, 0.075, 0.15]], 10),
      upper: limb(0.058, 0.046, 0.3),
      fore: limb(0.045, 0.036, 0.27),
      hand: new THREE.SphereGeometry(0.043, 8, 6).scale(0.85, 1.25, 0.6).translate(0, -0.31, 0.005),
      thigh: limb(0.088, 0.064, 0.45),
      shin: limb(0.062, 0.043, 0.44),
      foot: rings([[-0.085, 0.045, 0.1, 0.055], [-0.03, 0.05, 0.115, 0.05], [0, 0.04, 0.07, 0.02]], 10),
      skirt: rings([[-0.5, 0.26, 0.2], [-0.25, 0.22, 0.165], [0.02, 0.17, 0.12]], 12),
      jacket: rings([[-0.06, 0.2, 0.15], [0.12, 0.185, 0.135], [0.3, 0.18, 0.13], [0.42, 0.2, 0.135, 0.005], [0.52, 0.215, 0.125], [0.575, 0.14, 0.095]], 12),
      pack: rings([[0.16, 0.12, 0.07, -0.17], [0.3, 0.135, 0.085, -0.18], [0.46, 0.12, 0.07, -0.17], [0.5, 0.07, 0.04, -0.16]], 8),
      bag: rings([[-0.02, 0.035, 0.11, 0], [0.12, 0.04, 0.12, 0], [0.16, 0.02, 0.09, 0]], 8),
    };
    const per = { torso: 1, head: 1, nose: 1, hair: 1, hairLong: 1, bun: 1, cap: 1, visor: 1, upper: 2, fore: 2, hand: 2, thigh: 2, shin: 2, foot: 2, skirt: 1, jacket: 1, pack: 1, bag: 1 };
    const M = {};
    for (const k in G_) {
      const m = new THREE.InstancedMesh(G_[k], new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: k === 'foot' || k === 'bag' ? 0.5 : k === 'hair' || k === 'hairLong' || k === 'bun' ? 0.6 : 0.85 }), Math.ceil(CROWD_MAX * per[k] * (['hairLong', 'bun', 'cap', 'visor', 'skirt', 'jacket', 'pack', 'bag'].includes(k) ? 0.6 : 1)));
      m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.castShadow = ['torso', 'thigh', 'shin', 'skirt', 'head', 'jacket'].includes(k);
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
    const sc = new THREE.Matrix4();
    function put(k, node, c, sx = 1, sz = 1) { const m = M[k]; if (n[k] >= m.instanceMatrix.count) return; if (sx !== 1 || sz !== 1) { tmp.copy(node.matrixWorld).multiply(sc.makeScale(sx, 1, sz)); m.setMatrixAt(n[k], tmp); } else m.setMatrixAt(n[k], node.matrixWorld); m.setColorAt(n[k], c); n[k]++; }
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
      const bw = p.bw || 1, bd = p.bd || 1, lt = p.lt || 1;
      put('torso', torso, p.cTop, bw, bd); put('head', neck, p.cSkin); put('nose', neck, p.cSkin);
      if (p.jacket) put('jacket', torso, p.cJacket, bw, bd);
      if (p.pack) put('pack', torso, p.cBag, 1, bd); 
      if (p.cap) { put('cap', neck, p.cCap); put('visor', neck, p.cCap); if (p.longHair) put('hairLong', neck, p.cHair); }
      else if (!p.bald) { put(p.longHair ? 'hairLong' : 'hair', neck, p.cHair); if (p.bun) put('bun', neck, p.cHair); }
      for (let s2 = 0; s2 < 2; s2++) {
        const sleeve = p.jacket ? p.cJacket : p.cTop;
        put('upper', sh[s2], sleeve, lt * (p.jacket ? 1.18 : 1), lt * (p.jacket ? 1.18 : 1)); put('fore', el[s2], p.tee && !p.jacket ? p.cSkin : sleeve, lt * (p.jacket ? 1.15 : 1), lt * (p.jacket ? 1.15 : 1)); put('hand', el[s2], p.cSkin);
        put('thigh', hp[s2], p.skirt ? p.cSkin : p.cBot, lt * bw, lt * bd); put('shin', kn[s2], p.shorts || p.skirt ? p.cSkin : p.cBot, lt, lt); put('foot', an[s2], p.cShoe);
      }
      if (p.bag) put('bag', el[1], p.cBag);
      if (p.skirt) put('skirt', hips, p.cBot, bw, bd);
    }
    return { begin, end, draw };
  })();
  const SKIN = [0xe8c3a0, 0xc99a74, 0x8d5a3c, 0x5c3a28, 0xf0d2b8, 0xd9a98a];
  const TOPS = [0xd63a8a, 0x2a8ad6, 0x2ad6a0, 0xf2c81e, 0xe8e2d0, 0x6a2ad6, 0xd65a2a, 0x1a1a1a, 0x3a6a2a, 0xc81e1e, 0x1f3f91, 0x9a6a3a, 0xf3ead8, 0x2a2a3a];
  const BOTTOMS = [0x2a3a6a, 0x1a1a1a, 0x5a4a3a, 0x3a5a8a, 0x6a6a72, 0x4a6a9a, 0x7a2a3a, 0xc8b89a];
  const HAIR = [0x1a120a, 0x3a2412, 0x8a6a3a, 0xd8c890, 0x101010, 0x6a3a1a, 0xb0b0b0];
  const SHOES = [0x1a1a1a, 0xf2f2ee, 0x5a3a20, 0x2a2a6a, 0xc81e1e];
  const LC = h => new THREE.Color(hd.lin(h));
  const JACKETS = [0x2a2a3a, 0x5a3a20, 0x1f3f91, 0x7a2a3a, 0x3a5a3a, 0xc8b89a, 0x6a2ad6, 0x1a1a1a, 0xd8d0c0];
  const BAGS = [0x5a3a20, 0x1a1a1a, 0xc81e1e, 0x2a8ad6, 0xf2c81e, 0x6a2ad6];
  function look() { // people of 1996: shell suits, jeans and jackets, caps, long hair and buns, satchels, grey heads
    const pick = a => a[(R() * a.length) | 0], kid = R() < 0.08, old = !kid && R() < 0.16, woman = R() < 0.5, skirt = woman && R() < 0.4;
    const longHair = woman ? R() < 0.7 : R() < 0.08, jacket = !kid && R() < (old ? 0.7 : 0.4);
    return { s: kid ? 0.62 + R() * 0.1 : (woman ? 0.87 : 0.93) + R() * 0.14 - (old ? 0.04 : 0), cTop: LC(pick(TOPS)), cBot: LC(pick(BOTTOMS)), cSkin: LC(pick(SKIN)), cHair: LC(old ? pick([0xb0b0b0, 0xd8d8d8, 0x8a8a8a]) : pick(HAIR)), cShoe: LC(pick(SHOES)), cCap: LC(pick(TOPS)),
      cJacket: LC(pick(JACKETS)), cBag: LC(pick(BAGS)),
      skirt, shorts: !skirt && !old && R() < 0.18, tee: R() < 0.45, cap: !skirt && !old && R() < 0.2, kid, old, woman, longHair, bun: woman && !longHair && R() < 0.4, bald: !woman && !kid && R() < (old ? 0.35 : 0.06),
      jacket, pack: kid ? R() < 0.7 : R() < 0.12, bag: !kid && woman && R() < 0.45,
      bw: (woman ? 0.86 : 1) + R() * 0.16 + (kid ? -0.02 : 0), bd: 0.9 + R() * R() * 0.5 + (old ? 0.1 : 0), lt: 0.88 + R() * 0.24 };
  }
  function makePed() {
    const lk = look();
    return Object.assign(lk, { w: 0, t: 0, dir: R() < 0.5 ? 1 : -1, speed: (1.05 + R() * 0.55) * (lk.old ? 0.72 : lk.kid ? 0.9 : 1), ox: 0, oz: 0, fvx: 0, fvz: 0, state: 'walk', timer: 0, phase: R() * 6, x: 0, y: 0, z: 0, h: 0, on: false, idleIn: 6 + R() * 20, look_: 0, lookT: 0 });
  }
  // how busy a pavement node is: from 0.3 in a quiet street to 1 among the shops and cafés (counted once per node)
  let busy = null;
  function busyAt(a) {
    if (!busy) { busy = new Float32Array(walks.x.length).fill(-1); }
    if (busy[a] < 0) { let n = 0; for (const s of W.shops || []) if (Math.abs(s.x - walks.x[a]) < 70 && Math.abs(s.z - walks.z[a]) < 70) n++; busy[a] = Math.min(1, 0.3 + n * 0.12); }
    return busy[a];
  }
  // pedestrian lights: a crossing within 28 m of a junction with traffic lights waits for the cars it crosses to have red
  function crossingLight(p) {
    if (!TF.lights || !TF.lights.length) return null;
    const mx = (walks.x[p.a] + walks.x[p.b]) / 2, mz = (walks.z[p.a] + walks.z[p.b]) / 2;
    let j = null, bd = 28; for (const o of TF.lights) { const d = Math.hypot(o.x - mx, o.z - mz); if (d < bd) { bd = d; j = o; } }
    if (!j) return null;
    const h = Math.atan2(-(walks.x[p.b] - walks.x[p.a]), -(walks.z[p.b] - walks.z[p.a])) + Math.PI / 2; // the cars that cross our path
    return lightState(j, h) === 'r' && lightState(j, h + Math.PI) === 'r' ? 'go' : 'stop';
  }
  function placePed(p) {
    const ps = players(); if (!ps.length || !walks.length) return false;
    p.buddy = null; p.hasBuddy = null;
    // (16 nov., backlog « piétons, suite ») one walker in four joins someone already out, side by side
    if (R() < 0.25) { const q = peds[(R() * peds.length) | 0];
      if (q && q !== p && q.on && !q.buddy && !q.hasBuddy && q.state === 'walk' && q.ek !== 1) { const d = minPlayerDist(q.x, q.z);
        if (d > 35 && d < 170) { Object.assign(p, { a: q.a, b: q.b, ek: q.ek, f: q.f, ox: q.ox, oz: q.oz, state: 'walk', timer: 0, on: true, buddy: q, speed: q.speed }); q.hasBuddy = p; return true; } } }
    for (let k = 0; k < 40; k++) {
      const a = walks.spawn[(R() * walks.spawn.length) | 0], x = walks.x[a], z = walks.z[a], d = minPlayerDist(x, z);
      if (d < 35 || d > 170) continue;
      if (R() > busyAt(a)) continue; // more people where the shops are
      const es = walks.e[a].filter(e => e[1] !== 1), e = es[(R() * es.length) | 0]; if (!e) continue;
      Object.assign(p, { a, b: e[0], ek: e[1], f: R() * 0.9, ox: 0, oz: 0, state: 'walk', timer: 0, on: true });
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
    // a companion walks beside the one it came out with, at the same pace, and stops when they stop
    if (p.buddy) { const q = p.buddy;
      if (!q.on || q.state === 'panic' || q.state === 'down' || q.state === 'flee' || p.state !== 'walk' && p.state !== 'idle' && p.state !== 'wait') { if (q.hasBuddy === p) q.hasBuddy = null; p.buddy = null; }
      else { p.a = q.a; p.b = q.b; p.ek = q.ek; p.f = q.f; p.speed = q.speed; p.state = q.state; p.timer = q.timer; p.waited = q.waited; } }
    let ax = walks.x[p.a], az = walks.z[p.a], bx = walks.x[p.b], bz = walks.z[p.b], L = Math.hypot(bx - ax, bz - az) || 1;
    let hx = (bx - ax) / L, hz = (bz - az) / L;
    const arrive = away => { pedNext(p, away); ax = walks.x[p.a]; az = walks.z[p.a]; bx = walks.x[p.b]; bz = walks.z[p.b]; L = Math.hypot(bx - ax, bz - az) || 1; hx = (bx - ax) / L; hz = (bz - az) / L; };
    let moving = 0;
    if (p.state === 'wait') { // at the kerb: looks for a gap, then crosses
      p.timer -= dt; p.waited += dt; p.h += wrapA(Math.atan2(hx, hz) - p.h) * Math.min(1, dt * 5);
      const tl = crossingLight(p); // red man: waits (40 s at most); green man: goes once the way is clear
      if (tl ? (tl === 'go' && p.waited > 0.7 && crossingClear(p)) || p.waited > 40 : p.timer <= 0 || (p.waited > 0.7 && crossingClear(p))) p.state = 'walk';
    } else if (p.state === 'walk') {
      moving = p.speed * (p.ek === 1 ? 1.3 : 1);
      // (16 nov.) everyone keeps to the right of the pavement, so walkers coming the other way pass each other; behind a
      // slower walker going the same way, one slows down
      for (const q of peds) { if (q === p || !q.on || q.a !== p.a || q.b !== p.b || q === p.buddy || q === p.hasBuddy) continue; const gap = (q.f - p.f) * L; if (gap > 0 && gap < 1.4) moving = Math.min(moving, (q.state === 'walk' ? q.speed : 0) * 0.95); }
      if (!p.buddy) { p.f += moving * dt / L; if (p.f >= 1) arrive(); } // (a companion takes the leader's place on the walk)
      { const side = 0.55 + (p.buddy ? 0.75 : 0), tx = -hz * side, tz = hx * side, ex = tx - p.ox, ez = tz - p.oz, el = Math.hypot(ex, ez);
        if (el > 0.01) { const k = Math.min(el, dt * 1.2) / el; p.ox += ex * k; p.oz += ez * k; } }
      p.h += wrapA(Math.atan2(hx, hz) - p.h) * Math.min(1, dt * 6);
      p.idleIn -= dt; if (!p.buddy && p.idleIn <= 0 && p.ek !== 1 && p.state === 'walk') { p.state = 'idle'; p.timer = 2 + R() * 4; p.idleIn = 10 + R() * 25; if (R() < 0.3) { const s = p.a; p.a = p.b; p.b = s; p.f = 1 - p.f; } }
    } else if (p.state === 'idle') { // stops, looks around, then goes on
      p.timer -= dt; if (p.timer <= 0) p.state = 'walk';
    } else if (p.state === 'flee') {
      // the dodge stops at walls (it used to carry people through the buildings) and goes 4 m at most from the pavement
      const sp = Math.hypot(p.fvx, p.fvz), step = sp * dt;
      if (sp > 0.01 && (segHit(p.x, p.z, p.fvx / sp, p.fvz / sp, step + 0.5) < step + 0.5 || Math.hypot(p.ox + p.fvx * dt, p.oz + p.fvz * dt) > 4)) { p.fvx = p.fvz = 0; }
      p.ox += p.fvx * dt; p.oz += p.fvz * dt; moving = sp > 0.01 ? 5.5 : 0; p.timer -= dt; if (sp > 0.01) p.h = Math.atan2(p.fvx, p.fvz);
      if (p.timer <= 0) p.state = 'walk';
    } else if (p.state === 'down') {
      p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; }
    } else if (p.state === 'panic') { // gunfire: runs off along the pavement, away from the shooter, arms over the head
      moving = p.run; p.f += moving * dt / L;
      if (p.f >= 1) arrive(p.fear || [p.x, p.z]);
      const ol = Math.hypot(p.ox, p.oz); if (ol > 0.01) { const k = Math.min(ol, dt * 2) / ol; p.ox -= p.ox * k; p.oz -= p.oz * k; }
      p.h += wrapA(Math.atan2(hx, hz) - p.h) * Math.min(1, dt * 10);
      p.timer -= dt; if (p.timer <= 0) { p.state = 'idle'; p.timer = 1.5 + R() * 2; p.lookTo = (R() - 0.5) * 2; }
    }
    { const f = Math.min(1, Math.max(0, p.f)); p.x = ax + (bx - ax) * f + p.ox; p.z = az + (bz - az) * f + p.oz; }
    if (p._pin) { p.x = p._pin[0]; p.z = p._pin[1]; p.h = p._pin[2] || 0; } // test hook: line people up for a capture
    // watch out for cars
    if (p.state !== 'down') for (const c of [...allPlayerCars(), ...rivals, ...npcs]) {
      if (!c.alive || c.speed < 3) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d > 14) continue;
      const vx = c.vx / c.speed, vz = c.vz / c.speed, along = dx * vx + dz * vz, lat = dx * vz - dz * vx;
      if (d < 2.3) { // too late: knocked over, gets back up a bit later
        p.state = 'down'; p.timer = 2.5 + R(); { const k = Math.max(0, Math.min(1.5, segHit(p.x, p.z, vx, vz, 2) - 0.5)); p.ox += vx * k; p.oz += vz * k; } sfx.hit();
        if (c.local) { oneStar(c, 0.45, 'La police l’a vu : piéton renversé'); shout(c, true); }
        break;
      }
      if (along > 0 && along < c.speed * 1.4 + 3 && Math.abs(lat) < 3.2 && (p.state === 'walk' || p.state === 'idle' || p.state === 'wait')) {
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
    else if (p.state === 'idle' || p.state === 'wait') { const t = performance.now() / 1000 + p.phase; P = P0(); P.sway = Math.sin(t * 0.9) * 0.04; P.thigh = [Math.sin(t * 0.9) * 0.05, -0.05]; P.arm = [0.05, -0.05]; P.look = p.look_ * 1.4; }
    else {
      p.phase += dt * (moving > 3 ? moving * 2.1 : moving * 4.2);
      const run = p.state === 'flee' || p.state === 'panic', A = run ? 1.25 : Math.min(1, 0.55 + p.speed * 0.3);
      P = walkPose(p.phase, A, run); P.look = p.look_;
      if (p.state === 'panic') { P.arm = [-2.9, -2.9]; P.elbow = [-1.6, -1.6]; P.armOut = [0.25, 0.25]; P.lean = 0.18; P.look = Math.sin(p.phase * 0.7) * 0.6; } // hands over the head, ducking
      else if (run) { P.arm = [-2.5 + Math.sin(p.phase * 2) * 0.3, -2.5 - Math.sin(p.phase * 2) * 0.3]; P.armOut = [0.4, 0.4]; P.elbow = [-0.3, -0.3]; }
    }
    p.pose = P;
  }
