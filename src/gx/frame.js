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

