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
        const pl = walks[p.w], i = Math.max(0, Math.min(pl.length / 2 - 2, Math.floor(p.t)));
        const dx = pl[2 * i + 2] - pl[2 * i], dz = pl[2 * i + 3] - pl[2 * i + 1];
        p.dir = (dx * (p.x - x) + dz * (p.z - z)) >= 0 ? 1 : -1;
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
