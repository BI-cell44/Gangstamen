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

