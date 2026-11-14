  // ---------- civilian traffic v2 (cycle 7) ----------
  // Cars keep to the right of the street, follow one-way streets (OSM), prefer real streets to narrow lanes, stop at the
  // red lights of the real junctions (OSM traffic_signals), at stop signs, give way, let pedestrians cross, signal their
  // turns, overtake a car that will not move, flee and honk when shots ring out. Buses of the TAN run their lines.
  // Density follows the hour of the day.
  const TF = { lights: [], stops: [], cross: [], buses: [], busT: 4, t: 0, grid: new Map(), ready: false };
  const tfKey = (x, z) => Math.floor(x / 40) * 1000 + Math.floor(z / 40);
  function tfAdd(o) { const k = tfKey(o.x, o.z); if (!TF.grid.has(k)) TF.grid.set(k, []); TF.grid.get(k).push(o); }
  function tfNear(x, z) { const out = [], i0 = Math.floor(x / 40), j0 = Math.floor(z / 40); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) { const a = TF.grid.get(i * 1000 + j); if (a) out.push(...a); } return out; }
  // light cycle (s): axis A green, amber, all red, axis B green, amber, all red
  const TLC_ = [15, 3, 1.5, 15, 3, 1.5], TLC_T = TLC_.reduce((a, b) => a + b, 0);
  function lightState(j, h) { // 'g', 'a' or 'r' for a car with heading h at junction j
    let t = (TF.t + j.ph) % TLC_T, i = 0; while (t >= TLC_[i]) { t -= TLC_[i]; i++; }
    const axisA = Math.abs(Math.sin(h - j.ax)) < 0.7071;
    if (axisA) return i === 0 ? 'g' : i === 1 ? 'a' : 'r';
    return i === 3 ? 'g' : i === 4 ? 'a' : 'r';
  }
  function trafficSetup() {
    if (TF.ready) return; TF.ready = true;
    const T = W.traffic || { signals: [], bus: [], stops: [] };
    for (const [x, z, k] of T.signals) {
      if (k === 0) { // signal nodes of one junction merged
        const j = TF.lights.find(o => Math.hypot(o.x - x, o.z - z) < 30);
        if (j) { j.n++; j.x += (x - j.x) / j.n; j.z += (z - j.z) / j.n; } else TF.lights.push({ x, z, n: 1, kind: 'light' });
      } else if (k === 1 || k === 2) TF.stops.push({ x, z, kind: k === 1 ? 'stop' : 'yield', id: TF.stops.length });
      else TF.cross.push({ x, z, kind: 'cross' });
    }
    TF.lights.forEach((j, i) => { // reference axis: the widest street at the junction; each junction its own phase
      let n = -1, bd = 1e9; for (let q = 0; q < G.x.length; q++) { const d = Math.hypot(G.x[q] - j.x, G.z[q] - j.z); if (d < bd && G.adj[q].length > 1) { bd = d; n = q; } }
      let ax = 0, bw = -1; if (n >= 0) for (const m of G.adj[n]) { const w = edgeW(n, m); if (w > bw) { bw = w; ax = Math.atan2(-(G.x[m] - G.x[n]), -(G.z[m] - G.z[n])); } }
      j.ax = ax; j.ph = (i * 13.7) % TLC_T; j.id = i;
    });
    for (const o of [...TF.lights, ...TF.stops, ...TF.cross]) tfAdd(o);
    buildLights();
    TF.busLines = (T.bus || []).map(b => { const p = []; for (let i = 0; i < b.p.length; i += 2) p.push([b.p[i], b.p[i + 1]]); return { ref: b.ref, p }; });
    TF.busStops = T.stops || [];
  }
  // the traffic lights you can see: a pole per corner, heads with three lamps; lamps are instances whose colour changes
  let lampIM = null, lampRefs = [];
  function buildLights() {
    if (!TF.lights.length) return;
    const poles = [], heads = [];
    for (const j of TF.lights) for (let q = 0; q < 4; q++) {
      const a = j.ax + q * Math.PI / 2, fx = -Math.sin(a), fz = -Math.cos(a); // heading of the traffic this head faces
      // pole at the right-hand corner before the junction for that traffic
      const x = j.x - fx * 8 - fz * 6.5, z = j.z - fz * 8 + fx * 6.5;
      if (segHit(j.x, j.z, (x - j.x) / 10.3, (z - j.z) / 10.3, 10.3) < 10) continue; // inside a building
      poles.push([x, z]); heads.push({ x, z, h: a, j, axisA: q % 2 === 0 });
    }
    const grey = new THREE.MeshLambertMaterial({ color: 0x2c2f33 });
    const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 6).translate(0, 1.7, 0), grey, poles.length);
    const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.95, 0.24).translate(0, 3.3, 0), grey, heads.length);
    lampIM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), heads.length * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    poles.forEach(([x, z], i) => { m4.compose(v.set(x, surfaceH(x, z), z), q.identity(), one); pm.setMatrixAt(i, m4); });
    heads.forEach((hd_, i) => {
      const y = surfaceH(hd_.x, hd_.z); q.setFromAxisAngle(Y, hd_.h); m4.compose(v.set(hd_.x, y, hd_.z), q, one); hm.setMatrixAt(i, m4);
      const fx = -Math.sin(hd_.h), fz = -Math.cos(hd_.h); // lamps on the side facing the oncoming cars
      for (let k = 0; k < 3; k++) { m4.compose(v.set(hd_.x - fx * 0.13, y + 3.62 - k * 0.3, hd_.z - fz * 0.13), q, one); lampIM.setMatrixAt(i * 3 + k, m4); lampIM.setColorAt(i * 3 + k, new THREE.Color(0x111111)); }
      lampRefs.push(hd_);
    });
    for (const o of [pm, hm, lampIM]) { o.userData.hdLinear = true; o.frustumCulled = false; scene.add(o); }
    pm.castShadow = true;
  }
  const LAMP = { r: new THREE.Color(5, 0.15, 0.05), a: new THREE.Color(5, 2.2, 0.05), g: new THREE.Color(0.1, 4, 1.2), off: new THREE.Color(0.06, 0.06, 0.06) };
  let lampAcc = 0;
  function lightsTick(dt) {
    TF.t += dt; lampAcc += dt; if (!lampIM || lampAcc < 0.25) return; lampAcc = 0;
    lampRefs.forEach((hd_, i) => {
      const st = lightState(hd_.j, hd_.h + Math.PI); // the traffic facing this head drives towards it: heading h + pi
      lampIM.setColorAt(i * 3, st === 'r' ? LAMP.r : LAMP.off); lampIM.setColorAt(i * 3 + 1, st === 'a' ? LAMP.a : LAMP.off); lampIM.setColorAt(i * 3 + 2, st === 'g' ? LAMP.g : LAMP.off);
    });
    lampIM.instanceColor.needsUpdate = true;
  }
  // traffic density by the hour (same clock as the bells): quiet at night, busy at the rush hours
  function densityNow() {
    const h = Soundscape.hourNow();
    return h < 6 ? 0.3 : h < 7 ? 0.6 : h < 10 ? 1.25 : h < 17 ? 0.9 : h < 20 ? 1.25 : h < 23 ? 0.7 : 0.45;
  }
  function laneTarget(a, b, lane = 1.7) { // a point on the right-hand side of the street, towards node b
    const ax = G.x[a], az = G.z[a], bx = G.x[b], bz = G.z[b], L = Math.hypot(bx - ax, bz - az) || 1;
    const ux = (bx - ax) / L, uz = (bz - az) / L; // France drives on the right: right of travel is (-uz, ux)
    lane = lane > 0 ? Math.min(lane, edgeW(a, b) / 4) : lane;
    return [bx - uz * lane, bz + ux * lane];
  }
  // next node after b coming from a: legal direction, real streets first, no U-turn unless it is a dead end
  function nextNode(a, b) {
    let opts = G.out[b].filter(n => n !== a && nodeOk(n));
    const wide = opts.filter(n => edgeW(b, n) >= 6); if (wide.length) opts = wide;
    if (!opts.length && G.out[b].includes(a)) return a; // dead end: turn round, if that way is legal
    if (!opts.length) opts = G.adj[b].filter(n => n !== a && nodeOk(n)); // a one-way trap (data): leave anyway
    return opts.length ? opts[(R() * opts.length) | 0] : a;
  }
  function spawnNode(minD, maxD) {
    const ps = players(); if (!ps.length) return -1;
    for (let k = 0; k < 80; k++) {
      const n = (R() * G.x.length) | 0; if (!nodeOk(n) || !G.out[n].some(m => edgeW(n, m) >= 6 && nodeOk(m))) continue;
      const x = G.x[n], z = G.z[n];
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
    if (kind === 'civ') addBlinkers(c);
    return c;
  }
  // indicators: four small amber lamps that share two materials (on, off)
  const BLINK = { on: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.6, 0.1) }), off: new THREE.MeshLambertMaterial({ color: 0x6a4a10 }), geo: new THREE.BoxGeometry(0.16, 0.1, 0.12) };
  BLINK.on.userData.shared = BLINK.off.userData.shared = BLINK.geo.userData.shared = true;
  function addBlinkers(c) {
    const hl = c.mesh.userData.hl || 2.1, L = [], Rr = [];
    for (const [side, arr] of [[1, L], [-1, Rr]]) for (const end of [1, -1]) {
      const m = new THREE.Mesh(BLINK.geo, BLINK.off); m.position.set(side * -0.78, 0.62, -end * (hl - 0.12)); m.userData.hdLinear = true; c.mesh.add(m); arr.push(m);
    }
    c.blink = { L, R: Rr, side: null };
  }
  function setBlink(c, side, on) {
    if (!c.blink) return;
    for (const s of ['L', 'R']) { const lit = s === side && on; for (const m of c.blink[s]) if ((m.material === BLINK.on) !== lit) m.material = lit ? BLINK.on : BLINK.off; }
  }
  function placeOnGraph(c, n) {
    const nb = G.out[n].find(m => edgeW(n, m) >= 6 && nodeOk(m)) ?? G.adj[n][(R() * G.adj[n].length) | 0];
    c.place(G.x[n], G.z[n], heading(G.x[n], G.z[n], G.x[nb], G.z[nb]));
    c.ai = null; c.nav = { a: n, b: nb, c: nextNode(n, nb), wait: 0, honk: 0, panic: 0, stuck: 0, back: 0, lane: 1.7, pass: 0, hold: 0, stopDone: -1 };
    c.alive = true; c.dead = 0; c.mesh.visible = true;
  }
  function spawnCiv() {
    const n = spawnNode(90, 260); if (n < 0) return;
    const c = makeNpc('civ'); placeOnGraph(c, n); npcs.push(c);
  }
  function removeNpc(c) { // free what belongs to this car only (wheels and common materials are shared)
    const i = npcs.indexOf(c); if (i >= 0) npcs.splice(i, 1); scene.remove(c.mesh);
    if (c._hl) { scene.remove(c._hl); c._hl.geometry.dispose(); c._hl = null; } // headlight pool (cycle 8, laid on the ground)
    c.mesh.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) if (!m.userData.shared) { if (m.map) m.map.dispose(); m.dispose(); }
    });
  }
  function blockedAhead(c, range, lat = 2.4) { // nearest car (or pedestrian on the road) in a narrow cone ahead
    const [fx, fz] = c.fwd; let best = 1e9, who = null;
    for (const o of [...allPlayerCars(), ...rivals, ...npcs]) {
      if (o === c || !o.mesh.visible) continue;
      const dx = o.x - c.x, dz = o.z - c.z, along = dx * fx + dz * fz; if (along < 0 || along > range + (o.long || 0)) continue;
      if (Math.abs(dx * fz - dz * fx) < lat + (o.long ? 0.6 : 0) && along - (o.long || 0) < best) { best = Math.max(0, along - (o.long || 0)); who = o; }
    }
    for (const p of peds) {
      if (!p.on || p.state === 'down') continue;
      const dx = p.x - c.x, dz = p.z - c.z, along = dx * fx + dz * fz; if (along < 0 || along > Math.min(range, 14)) continue;
      if (Math.abs(dx * fz - dz * fx) < 1.6 && along < best) { best = along; who = p; }
    }
    c._blk = who; return best;
  }
  // what the road ahead asks for: the distance to stop at (red or amber light, stop sign, crossing in use), or a slow-down
  function roadRules(c, vf) {
    const [fx, fz] = c.fwd, nv = c.nav; let stopAt = 1e9, slow = 1e9;
    for (const o of tfNear(c.x, c.z)) {
      const dx = o.x - c.x, dz = o.z - c.z, along = dx * fx + dz * fz, lat = Math.abs(dx * fz - dz * fx);
      if (along < 2 || along > 40) continue;
      if (o.kind === 'light' && lat < 14) {
        const st = lightState(o, c.h), line = along - 10;
        if (line > -1 && (st === 'r' || (st === 'a' && line > vf * vf / 9 + 1))) stopAt = Math.min(stopAt, Math.max(0, line));
      } else if (o.kind === 'stop' && lat < 6 && nv.stopDone !== o.id) {
        stopAt = Math.min(stopAt, Math.max(0, along - 3));
        if (along < 5 && vf < 0.6) { nv.hold += 1 / 30; if (nv.hold > 1.2) { nv.stopDone = o.id; nv.hold = 0; } }
      } else if (o.kind === 'yield' && lat < 6 && along < 16) {
        slow = Math.min(slow, 4);
        if (crossTraffic(c, o) && (nv.yieldT = (nv.yieldT || 0) + 1 / 30) < 8) stopAt = Math.min(stopAt, Math.max(0, along - 3)); // after 8 s, go anyway
      } else if (o.kind === 'cross' && lat < 5 && along < 18) {
        if (peds.some(p => p.on && p.state !== 'down' && Math.hypot(p.x - o.x, p.z - o.z) < 4.5)) stopAt = Math.min(stopAt, Math.max(0, along - 4));
      }
    }
    return { stopAt, slow };
  }
  function crossTraffic(c, o) { // another moving car close to the junction, not going our way
    for (const q of [...npcs, ...allPlayerCars(), ...rivals]) {
      if (q === c || !q.alive || q.speed < 2) continue;
      if (Math.hypot(q.x - o.x, q.z - o.z) < 18 && Math.abs(Math.sin(q.h - c.h)) > 0.5) return true;
    }
    return false;
  }
  function civInput(c, dt) {
    const nv = c.nav;
    if (nv.c === undefined) nv.c = nextNode(nv.a, nv.b);
    let [tx, tz] = laneTarget(nv.a, nv.b, nv.lane);
    if (Math.hypot(tx - c.x, tz - c.z) < 6) {
      nv.a = nv.b; nv.b = nv.c; nv.c = nextNode(nv.a, nv.b); nv.yieldT = 0; [tx, tz] = laneTarget(nv.a, nv.b, nv.lane);
    }
    // indicators: when the next turn is sharp and close
    const dB = Math.hypot(G.x[nv.b] - c.x, G.z[nv.b] - c.z);
    const turn = wrapA(heading(G.x[nv.b], G.z[nv.b], G.x[nv.c], G.z[nv.c]) - heading(G.x[nv.a], G.z[nv.a], G.x[nv.b], G.z[nv.b]));
    const side = dB < 35 && Math.abs(turn) > 0.45 ? (turn > 0 ? 'L' : 'R') : nv.pass > 0 ? 'L' : null;
    setBlink(c, side, (performance.now() / 380 | 0) % 2 === 0);
    const want = heading(c.x, c.z, tx, tz), diff = wrapA(want - c.h), vf = c.vx * c.fwd[0] + c.vz * c.fwd[1];
    let s = Math.max(-1, Math.min(1, diff * 2)), cruise = nv.panic > 0 ? 15 : 10.5;
    if (Math.abs(diff) > 0.6) cruise = 5;
    if (dB < 20 && Math.abs(turn) > 0.6) cruise = Math.min(cruise, 6); // slow down before a turn
    const rules = nv.panic > 0 ? { stopAt: 1e9, slow: 1e9 } : roadRules(c, vf); // fleeing drivers run the lights
    cruise = Math.min(cruise, rules.slow);
    const blk = blockedAhead(c, 11 + vf * 0.6);
    let t = vf < cruise ? 0.7 : 0;
    const need = Math.min(blk - (4 + vf * 0.4), rules.stopAt);
    if (need < vf * vf / 8 + 0.5) { t = vf > 0.8 ? -1 : 0; if (blk < 5 + vf * 0.5) nv.wait += dt; } else nv.wait = 0;
    // overtaking: a car that does not move (not a queue at a light) on a two-way street wide enough, nobody coming
    const o = c._blk;
    if (nv.pass <= 0 && nv.wait > 3 && o && o.speed !== undefined && o.speed < 0.5 && rules.stopAt > 30 && edgeW(nv.a, nv.b) >= 6.5 && G.out[nv.b].includes(nv.a) && !oncoming(c)) { nv.pass = 6; nv.lane = -1.7; nv.wait = 0; }
    if (nv.pass > 0) { nv.pass -= dt; if (nv.pass <= 0 || (o && ((o.x - c.x) * c.fwd[0] + (o.z - c.z) * c.fwd[1]) < -7)) { nv.pass = 0; nv.lane = 1.7; } if (nv.pass > 0) t = Math.max(t, 0.6); }
    if (nv.wait > 2.5 && nv.honk <= 0 && minPlayerDist(c.x, c.z) < 40 && rules.stopAt > 30) { sfx.horn && sfx.horn(); nv.honk = 4 + R() * 3; }
    nv.honk -= dt; nv.panic -= dt;
    if (nv.back > 0) { nv.back -= dt; return { t: -1, s: -s, hb: false }; }
    if (t > 0 && c.speed < 0.8) { nv.stuck += dt; if (nv.stuck > 2.5) { nv.back = 1.2; nv.stuck = 0; const nb = unstickFar(c, nv); if (nb !== false) { const n0 = nearestNode(c.x, c.z); nv.a = n0; nv.b = nb; nv.c = nextNode(n0, nb); nv.back = 0; } } } else nv.stuck = 0;
    return { t, s, hb: false };
  }
  function oncoming(c) {
    const [fx, fz] = c.fwd;
    for (const q of [...npcs, ...allPlayerCars(), ...rivals]) {
      if (q === c || !q.alive) continue; const dx = q.x - c.x, dz = q.z - c.z, along = dx * fx + dz * fz, lat = dx * fz - dz * fx;
      if (along > 0 && along < 45 && lat > 0.5 && lat < 6) return true; // in the left lane ahead (lat > 0: to our left)
    }
    return false;
  }
  // shots: the drivers nearby panic (faster, horn, run the lights)
  function carsHearShot(x, z, loud = 1) {
    for (const c of npcs) if (c.npc === 'civ' && c.alive && c.nav && Math.hypot(c.x - x, c.z - z) < 45 * loud) { if (c.nav.panic <= 0 && R() < 0.4 && minPlayerDist(c.x, c.z) < 60) sfx.horn && sfx.horn(); c.nav.panic = 6; }
  }

  // ---------- TAN buses on their real lines (OSM route=bus) ----------
  function makeBus() {
    const c = makeNpc('civ'); c.style = 'bus';
    for (const ch of c.mesh.children) ch.visible = false;
    const g = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 }), green = new THREE.MeshStandardMaterial({ color: 0x00965e, roughness: 0.5 }), glass = new THREE.MeshStandardMaterial({ color: 0x1c2a33, roughness: 0.15, metalness: 0.3 }), tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    box(2.5, 2.6, 11.8, body, 0, 1.75, 0); box(2.52, 0.5, 11.82, green, 0, 0.75, 0); box(2.54, 1.0, 10.4, glass, 0, 2.2, 0.3); box(2.3, 1.1, 0.06, glass, 0, 2.15, -5.92);
    box(2.0, 0.3, 0.08, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 0.2) }), 0, 2.95, -5.93); // route display
    for (const [x, z] of [[-1.15, -3.8], [1.15, -3.8], [-1.15, 3.6], [1.15, 3.6]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14), tyre); w.rotation.z = Math.PI / 2; w.position.set(x, 0.16, z); g.add(w); }
    g.position.y = -0.34; g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize && hd.linearize(g); c.mesh.add(g);
    c.mesh.userData.hl = 5.6; c.long = 4.2; c.maxV = 11; c.hp = 160; c.bus = true; c.blink = null;
    return c;
  }
  function busTick(dt) {
    if (!TF.busLines || !TF.busLines.length) return;
    TF.busT -= dt;
    const live = npcs.filter(c => c.bus);
    if (live.length < Math.min(2, Math.round(2 * densityNow())) && TF.busT <= 0) {
      TF.busT = 12;
      // a line passing near a player; start out of sight, 140 to 260 m away along it
      const lines = TF.busLines.filter(l => l.p.some(([x, z]) => minPlayerDist(x, z) < 200));
      const L = lines[(R() * lines.length) | 0];
      if (L) {
        const ok = L.p.map((q, i) => i).filter(i => { const d = minPlayerDist(L.p[i][0], L.p[i][1]); return d > 140 && d < 260 && i < L.p.length - 3; });
        if (ok.length) {
          const i = ok[(R() * ok.length) | 0], c = makeBus(), [x, z] = L.p[i], [x2, z2] = L.p[i + 1];
          c.place(x, z, heading(x, z, x2, z2)); c.alive = true; c.mesh.visible = true; c.line = L; c.li = i + 1; c.halt = 0; c.lastStop = null; c.nav = { a: 0, b: 0, panic: 0, stuck: 0, back: 0, wait: 0, honk: 0, lane: 1.7, pass: 0 };
          npcs.push(c);
        }
      }
    }
  }
  function busInput(c, dt) {
    const P = c.line.p;
    if (c.li >= P.length) { c.alive = false; c.dead = 99; return { t: 0, s: 0, hb: true }; } // end of the run: removed by the frame
    const [ax, az] = P[Math.max(0, c.li - 1)], [bx, bz] = P[c.li], L = Math.hypot(bx - ax, bz - az) || 1, tx = bx - (bz - az) / L * 1.8, tz = bz + (bx - ax) / L * 1.8;
    if (Math.hypot(tx - c.x, tz - c.z) < 8) c.li++;
    const diff = wrapA(heading(c.x, c.z, tx, tz) - c.h), vf = c.vx * c.fwd[0] + c.vz * c.fwd[1];
    let cruise = Math.abs(diff) > 0.5 ? 4 : 9;
    // bus stops: halt 10 s at a stop close to the line
    if (c.halt > 0) { c.halt -= dt; return { t: vf > 0.3 ? -1 : 0, s: 0, hb: false }; }
    for (const st of TF.busStops) { const d = Math.hypot(st[0] - c.x, st[1] - c.z); if (d < 9 && c.lastStop !== st) { c.lastStop = st; c.halt = 10; } }
    const rules = roadRules(c, vf), blk = blockedAhead(c, 14 + vf * 0.6, 2.8);
    let t = vf < cruise ? 0.6 : 0;
    if (Math.min(blk - (6 + vf * 0.4), rules.stopAt) < vf * vf / 6 + 0.5) t = vf > 0.8 ? -1 : 0;
    return { t, s: Math.max(-1, Math.min(1, diff * 1.8)), hb: false };
  }
