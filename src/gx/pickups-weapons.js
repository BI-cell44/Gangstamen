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
    explode(x, z); hearShot(x, z, x, z, 1.8);
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
  // (cycle 9) an energy field rather than a plain ball: bright rim (fresnel), clear centre, a honeycomb that shimmers and
  // scrolls up, a ripple where it is hit, a flicker in the last two seconds
  const bubbleGeo = new THREE.SphereGeometry(1, 40, 24); bubbleGeo.userData.shared = true;
  const bubbleShader = {
    // (the renderer uses a logarithmic depth buffer: a custom shader must write the same depth, or it hides behind everything)
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vN, vV, vP; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vP = position; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp;
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <logdepthbuf_pars_fragment>
      uniform float uT, uHit, uFade; uniform vec3 uCol, uHitP; varying vec3 vN, vV, vP;
      float hex(vec2 p){ p.x *= 1.1547; p.y += mod(floor(p.x), 2.0) * 0.5; p = abs(fract(p) - 0.5); return abs(max(p.x * 1.5 + p.y, p.y * 2.0) - 1.0); }
      void main(){
        #include <logdepthbuf_fragment>
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
        vec2 uv = vec2(atan(vP.x, vP.z) * 3.0, vP.y * 5.0 - uT * 0.6);
        float h = smoothstep(0.08, 0.0, hex(uv * 1.6)) * (0.35 + 0.65 * (0.5 + 0.5 * sin(uT * 3.0 + vP.y * 6.0 + vP.x * 4.0)));
        float band = smoothstep(0.06, 0.0, abs(fract(vP.y * 0.5 - uT * 0.35) - 0.5) - 0.44);
        float rip = uHit * smoothstep(0.35, 0.0, abs(distance(vP, uHitP) - (1.0 - uHit) * 1.6));
        float a = (f * 0.9 + h * (0.12 + f * 0.5) + band * 0.12 + rip * 0.9) * uFade;
        gl_FragColor = vec4(uCol * a + vec3(1.0) * rip * 0.6 * uFade, 1.0);
      }`,
  };
  function makeBubbleMat() {
    return new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uHit: { value: 0 }, uFade: { value: 1 }, uCol: { value: new THREE.Color(0.45, 0.4, 2.2) }, uHitP: { value: new THREE.Vector3(0, 0, 1) } },
      vertexShader: bubbleShader.vertexShader, fragmentShader: bubbleShader.fragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  }
  function shieldHit(c, from) { // the field ripples where the shot lands
    if (!c.bubble) return; const u = c.bubble.material.uniforms, [fx, fz] = c.fwd, dx = (from ? from.x : c.x + fx) - c.x, dz = (from ? from.z : c.z + fz) - c.z, L = Math.hypot(dx, dz) || 1;
    const lx = (dx * -fz + dz * fx) / L, lz = -(dx * fx + dz * fz) / L; u.uHitP.value.set(lx, 0.1, lz).normalize(); u.uHit.value = 1;
  }
  function shieldStep(dt) {
    for (const c of [...allPlayerCars(), ...rivals, ...extras]) {
      if (c.shield > 0) {
        c.shield -= dt;
        if (!c.bubble) { c.bubble = new THREE.Mesh(bubbleGeo, makeBubbleMat()); c.bubble.scale.set(1.6, 1.15, 2.8); c.bubble.userData.hdLinear = true; c.bubble.renderOrder = 22; scene.add(c.bubble); }
        const u = c.bubble.material.uniforms; u.uT.value += dt; u.uHit.value = Math.max(0, u.uHit.value - dt * 2.2);
        u.uFade.value = Math.min(1, u.uT.value * 4) * (c.shield > 2 ? 1 : 0.45 + 0.55 * ((performance.now() / 110 | 0) % 2)); // grows in, flickers out
        c.bubble.position.set(c.x, c.mesh.position.y + 0.8, c.z); c.bubble.rotation.y = c.h;
      } else if (c.bubble) { scene.remove(c.bubble); c.bubble.material.dispose(); c.bubble = null; }
    }
  }

