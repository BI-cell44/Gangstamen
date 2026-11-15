  // ---------- pedestrians ----------
  // The pavements as a graph (Fable 5.2): nodes every 10 m on both sides of each street and along the footpaths, joined
  // at the corners, across the street at its ends and at the OpenStreetMap crossings. Edge kinds: 0 pavement, 1 crossing
  // (the walker waits for a gap in the traffic), 2 footpath. No edge goes through a wall.
  let walks = null;
  function buildWalks() {
    const X = [], Z = [], E = [], run = [], ends = [], grid = new Map(), CK = 12;
    const node = (x, z, r) => { X.push(x); Z.push(z); E.push([]); run.push(r); const k = Math.floor(x / CK) + ',' + Math.floor(z / CK); let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(X.length - 1); return X.length - 1; };
    const link = (a, b, k) => { if (a === b || E[a].some(e => e[0] === b)) return; E[a].push([b, k]); E[b].push([a, k]); };
    const ok = (x, z) => !(Math.abs(x - CX) > HX - 5 || Math.abs(z - CZ) > HZ - 5 || groundH(x, z) < WATER_Y + 1);
    const clear = (ax, az, bx, bz) => { const l = Math.hypot(bx - ax, bz - az); return l < 0.05 || segHit(ax, az, (bx - ax) / l, (bz - az) / l, l) >= l; };
    const near = (x, z, rad, fn) => { const c0 = Math.floor((x - rad) / CK), c1 = Math.floor((x + rad) / CK), d0 = Math.floor((z - rad) / CK), d1 = Math.floor((z + rad) / CK); for (let c = c0; c <= c1; c++) for (let d = d0; d <= d1; d++) { const l = grid.get(c + ',' + d); if (l) for (const j of l) { const dd = Math.hypot(X[j] - x, Z[j] - z); if (dd <= rad) fn(j, dd); } } };
    let rid = 0;
    for (const r of W.roads) {
      if (r.b || r.x) continue;
      const p = r.p, n = p.length / 2; if (n < 2) continue;
      for (const side of (r.d ? (r.w >= 5 ? [-1, 1] : []) : [0])) {
        let prev = -1; rid++;
        const put = (x, z) => {
          const on = roadEdge(x, z)[0];
          if (!ok(x, z) || (side && on < 0.6)) { if (prev >= 0) ends.push(prev); prev = -1; rid++; return; }
          const j = node(x, z, rid);
          if (prev >= 0 && clear(X[prev], Z[prev], x, z)) link(prev, j, side ? 0 : (on < 0 || roadEdge(X[prev], Z[prev])[0] < 0 ? 1 : 2)); else { if (prev >= 0) { ends.push(prev); rid++; run[j] = rid; } ends.push(j); }
          prev = j;
        };
        for (let i = 0; i < n - 1; i++) {
          const ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * i + 2], bz = p[2 * i + 3], L = Math.hypot(bx - ax, bz - az) || 1, dx = (bx - ax) / L, dz = (bz - az) / L, off = side ? r.w / 2 + 1.5 : 0, m = Math.max(1, Math.round(L / 10));
          for (let k = i ? 1 : 0; k <= m; k++) { const t = k / m; put(ax + (bx - ax) * t - dz * off * side, az + (bz - az) * t + dx * off * side); }
        }
        if (prev >= 0) ends.push(prev);
      }
    }
    // corners and crossings at the ends of the runs: the nearest node of each other run within reach
    const join = (a, rad) => { const best = new Map(); near(X[a], Z[a], rad, (j, d) => { if (run[j] === run[a]) return; const b = best.get(run[j]); if (!b || d < b[1]) best.set(run[j], [j, d]); });
      for (const [j, d] of [...best.values()].sort((u, v) => u[1] - v[1]).slice(0, 4)) { if (!clear(X[a], Z[a], X[j], Z[j])) continue; const mid = roadEdge((X[a] + X[j]) / 2, (Z[a] + Z[j]) / 2)[0]; if (mid < 0 && d > 15) continue; link(a, j, mid < 0 ? 1 : run[a] && 0); } };
    for (const a of ends) join(a, 13);
    // marked crossings in the middle of a street
    for (const o of TF.cross) { let a = -1, ad = 1e9; near(o.x, o.z, 10, (j, d) => { if (d < ad) { ad = d; a = j; } }); if (a < 0) continue;
      let b = -1, bd = 1e9; near(X[a], Z[a], 16, (j, d) => { if (run[j] !== run[a] && d < bd && roadEdge((X[a] + X[j]) / 2, (Z[a] + Z[j]) / 2)[0] < 0 && clear(X[a], Z[a], X[j], Z[j])) { bd = d; b = j; } }); if (b >= 0) link(a, b, 1); }
    // only the parts big enough to stroll on take new walkers
    const comp = new Int32Array(X.length).fill(-1), size = []; for (let s = 0; s < X.length; s++) { if (comp[s] >= 0) continue; const st = [s]; comp[s] = size.length; let c = 0; while (st.length) { const u = st.pop(); c++; for (const [v] of E[u]) if (comp[v] < 0) { comp[v] = size.length; st.push(v); } } size.push(c); }
    const spawn = []; for (let i = 0; i < X.length; i++) if (E[i].length && size[comp[i]] >= 25) spawn.push(i);
    let nc = 0, ne = 0; for (const es of E) for (const e of es) { ne++; if (e[1] === 1) nc++; }
    walks = { x: X, z: Z, e: E, spawn, length: spawn.length, stats: { nodes: X.length, edges: ne / 2, crossings: nc / 2, parts: size.filter(s => s >= 25).length, biggest: Math.max(0, ...size) } };
  }
  // where a walker goes next when reaching the node p.b: not back unless it is a dead end; `away` (a point to flee): the
  // edge that leads away from it, never a crossing if it can be avoided
  function pedNext(p, away) {
    const WN = walks, at = p.b, es = WN.e[at]; let opts = es.filter(e => e[0] !== p.a); if (!opts.length) opts = es;
    let pick = opts[0];
    if (away) { let best = -1e9; for (const e of opts) { const dx = WN.x[e[0]] - WN.x[at], dz = WN.z[e[0]] - WN.z[at], l = Math.hypot(dx, dz) || 1, s = (dx * (WN.x[at] - away[0]) + dz * (WN.z[at] - away[1])) / l - (e[1] === 1 ? 1e4 : 0); if (s > best) { best = s; pick = e; } } }
    else { let tot = 0; for (const e of opts) tot += e[1] === 1 ? 0.15 : 1; let r = R() * tot; for (const e of opts) { r -= e[1] === 1 ? 0.15 : 1; if (r <= 0) { pick = e; break; } } }
    p.a = at; p.b = pick[0]; p.f = 0; p.ek = pick[1];
    if (p.ek === 1 && !away && p.state === 'walk') { p.state = 'wait'; p.timer = 9; p.waited = 0; }
  }
  function crossingClear(p) { // no car about to drive over the crossing in front of the walker
    const WN = walks, mx = (WN.x[p.a] + WN.x[p.b]) / 2, mz = (WN.z[p.a] + WN.z[p.b]) / 2;
    for (const c of [...allPlayerCars(), ...rivals, ...npcs]) { if (!c.alive || c.speed < 2) continue; const dx = mx - c.x, dz = mz - c.z, d = Math.hypot(dx, dz); if (d < 6 || (d < 12 + c.speed * 2.2 && (dx * c.vx + dz * c.vz) / (d * c.speed) > 0.75)) return false; }
    return true;
  }
  // gunfire and blasts: everyone within earshot runs for it (pedestrians along the pavement, café customers away
  // from their table). Called for every shot fired near the players (shooter at x, z; impact at ex, ez).
  let shotLast = 0;
  function hearShot(x, z, ex = x, ez = z, loud = 1) {
    const now = performance.now(); if (now - shotLast < 120 && loud <= 1) return; shotLast = now; // a burst counts once per 0.12 s
    const R1 = 48 * loud, R2 = 16 * loud;
    carsHearShot(x, z, loud);
    for (const p of peds) {
      if (!p.on || p.state === 'down' || !walks) continue;
      const dS = Math.hypot(p.x - x, p.z - z), dI = Math.hypot(p.x - ex, p.z - ez);
      if (dS > R1 && dI > R2) continue;
      if (p.state !== 'panic') {
        // run along the pavement, in the direction that leads away from the shooter
        const dx = walks.x[p.b] - walks.x[p.a], dz = walks.z[p.b] - walks.z[p.a];
        if (dx * (p.x - x) + dz * (p.z - z) < 0) { const s = p.a; p.a = p.b; p.b = s; p.f = 1 - p.f; } // turn round
        p.fear = [x, z];
        p.run = 5.2 + R() * 1.6; p.state = 'panic'; p.timer = 0;
      }
      p.timer = Math.max(p.timer, 3 + R() * 3 + (dS < 20 ? 2 : 0));
    }
    for (const c of customers) {
      if (c.state === 'down' || !c.vis) continue;
      const px = c.x + (c.ox || 0), pz = c.z + (c.oz || 0), dS = Math.hypot(px - x, pz - z), dI = Math.hypot(px - ex, pz - ez);
      if (dS > R1 && dI > R2) continue;
      if (c.state === 'sit' || c.state === 'back' || c.state === 'scared') {
        let fx = px - x, fz = pz - z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
        c.state = 'flee'; c.timer = 1.2 + R() * 0.6; c.fvx = fx * 5.2; c.fvz = fz * 5.2; c.fleeA = Math.atan2(c.fvx, c.fvz);
      }
    }
  }
