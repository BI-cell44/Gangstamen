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
      // the dodge stops at walls (it used to carry people through the buildings) and goes 4 m at most from the pavement
      const sp = Math.hypot(p.fvx, p.fvz), step = sp * dt;
      if (sp > 0.01 && (segHit(p.x, p.z, p.fvx / sp, p.fvz / sp, step + 0.5) < step + 0.5 || Math.hypot(p.ox + p.fvx * dt, p.oz + p.fvz * dt) > 4)) { p.fvx = p.fvz = 0; }
      p.ox += p.fvx * dt; p.oz += p.fvz * dt; moving = sp > 0.01 ? 5.5 : 0; p.timer -= dt; if (sp > 0.01) p.h = Math.atan2(p.fvx, p.fvz);
      if (p.timer <= 0) p.state = 'walk';
    } else if (p.state === 'down') {
      p.timer -= dt; if (p.timer <= 0) { p.state = 'walk'; }
    } else if (p.state === 'panic') { // gunfire: runs off along the pavement, away from the shooter, arms over the head
      p.t += p.dir * p.run * dt / L; moving = p.run;
      if (p.t <= 0) { p.t = 0; p.dir = 1; } if (p.t >= n - 1) { p.t = n - 1.001; p.dir = -1; }
      const ol = Math.hypot(p.ox, p.oz); if (ol > 0.01) { const k = Math.min(ol, dt * 2) / ol; p.ox -= p.ox * k; p.oz -= p.oz * k; }
      p.h += wrapA(Math.atan2(hx, hz) - p.h) * Math.min(1, dt * 10);
      p.timer -= dt; if (p.timer <= 0) { p.state = 'idle'; p.timer = 1.5 + R() * 2; p.lookTo = (R() - 0.5) * 2; }
    }
    p.x = ax + (bx - ax) * f + p.ox; p.z = az + (bz - az) * f + p.oz;
    // watch out for cars
    if (p.state !== 'down') for (const c of [...allPlayerCars(), ...rivals, ...npcs]) {
      if (!c.alive || c.speed < 3) continue;
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d > 14) continue;
      const vx = c.vx / c.speed, vz = c.vz / c.speed, along = dx * vx + dz * vz, lat = dx * vz - dz * vx;
      if (d < 2.3) { // too late: knocked over, gets back up a bit later
        p.state = 'down'; p.timer = 2.5 + R(); { const k = Math.max(0, Math.min(1.5, segHit(p.x, p.z, vx, vz, 2) - 0.5)); p.ox += vx * k; p.oz += vz * k; } sfx.hit();
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
      const run = p.state === 'flee' || p.state === 'panic', A = run ? 1.25 : Math.min(1, 0.55 + p.speed * 0.3);
      P = walkPose(p.phase, A, run); P.look = p.look_;
      if (p.state === 'panic') { P.arm = [-2.9, -2.9]; P.elbow = [-1.6, -1.6]; P.armOut = [0.25, 0.25]; P.lean = 0.18; P.look = Math.sin(p.phase * 0.7) * 0.6; } // hands over the head, ducking
      else if (run) { P.arm = [-2.5 + Math.sin(p.phase * 2) * 0.3, -2.5 - Math.sin(p.phase * 2) * 0.3]; P.armOut = [0.4, 0.4]; P.elbow = [-0.3, -0.3]; }
    }
    p.pose = P;
  }
