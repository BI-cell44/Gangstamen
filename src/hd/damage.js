  // ---------- visible damage: crumpled panels, a popped bonnet, a flat tyre ----------
  function dentHash(x, y, z) { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return v - Math.floor(v); }
  function damageLook(c) {
    const ud = c.mesh.userData; if (!ud.shell) return;
    const lvl = c.alive ? Math.max(0, Math.min(4, Math.floor((100 - c.hp) / 18))) : 4;
    if (lvl === ud.dent) return;
    ud.dent = lvl;
    const pos = ud.shell.attributes.position, a = pos.array, o = ud.shellPos0;
    if (lvl === 0) { a.set(o); ud.shell.attributes.normal.array.set(ud.shellNrm0); ud.shell.attributes.normal.needsUpdate = true; pos.needsUpdate = true; }
    else {
      const k = lvl / 4, front = -ud.s1, rear = -ud.s0, side = c._dside || (c._dside = Math.random() < 0.5 ? 1 : -1);
      for (let i = 0; i < a.length; i += 3) {
        const x = o[i], y = o[i + 1], z = o[i + 2];
        const n = dentHash(Math.round(x * 4), Math.round(y * 4), Math.round(z * 4)), n2 = dentHash(Math.round(x * 9) + 3, Math.round(y * 9), Math.round(z * 9));
        const fr = Math.max(0, 1 - (z - front) / 1.1), rr = Math.max(0, 1 - (rear - z) / 0.8) * 0.6, sd = Math.max(0, x * side / 0.9 - 0.4);
        const d = (fr + rr) * k;
        a[i] = x - Math.sign(x) * (n * 0.07 * d + sd * n2 * 0.06 * k);
        a[i + 1] = y - n * 0.06 * d * (y > 0.7 ? 1 : 0.3) + (fr > 0.3 && y > 0.85 && lvl >= 3 ? 0.06 * n2 : 0); // the bonnet buckles up
        a[i + 2] = z + fr * (0.08 + n * 0.12) * k - rr * (0.05 + n * 0.08) * k;
      }
      pos.needsUpdate = true; ud.shell.computeVertexNormals(); // faceted normals read as crumpled metal
    }
    // a flat tyre when badly hurt
    const want = c.alive && lvl >= 3 ? (c._flatW ?? (c._flatW = (Math.random() * 4) | 0)) : -1;
    if (want !== ud.flat) {
      if (ud.flat >= 0) { const w = ud.wheels[ud.flat].parent; w.scale.set(1, 1, 1); w.position.y = w.userData.y0; }
      if (want >= 0) { const w = ud.wheels[want].parent; w.userData.y0 = w.userData.y0 ?? w.position.y; w.scale.set(1, 0.8, 1); w.position.y = w.userData.y0 - 0.07; }
      ud.flat = want;
    }
    if (lvl === 0) c._flatW = undefined;
  }

