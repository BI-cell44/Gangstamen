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
