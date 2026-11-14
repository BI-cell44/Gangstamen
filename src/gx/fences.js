  // ---------- breakable fences, hedges, garden walls and gates along the properties (cycle 8) ----------
  // Panels from data/fences.json (OpenStreetMap barriers and the street fronts of the cadastre parcels). Each 250 m tile
  // bakes its panels into one mesh per material (4 draw calls a tile, tiles beyond 320 m hidden); a panel that breaks has
  // its vertices folded away and a few pieces fly off; the council puts it back a minute later, out of sight.
  const Fences = (() => {
    const TILE = 250, CELL = 8, panels = [], tiles = new Map(), grid = new Map(), debris = [];
    let mats = null, built = false, visT = 0;
    // kind -> boxes [material, w(along, as a share of the length), h, d, x(share), y, z]
    const SHAPES = [
      [['wood', 0.03, 1.25, 0.08, -0.48, 0.62, 0], ['wood', 0.03, 1.25, 0.08, 0.48, 0.62, 0], ['wood', 1, 0.12, 0.03, 0, 0.35, 0], ['wood', 1, 0.12, 0.03, 0, 0.7, 0], ['wood', 1, 0.12, 0.03, 0, 1.05, 0]], // wood fence
      [['stone', 1, 0.55, 0.26, 0, 0.27, 0], ['metal', 1, 0.04, 0.04, 0, 1.25, 0], ['metal', 0.012, 0.7, 0.02, -0.4, 0.9, 0], ['metal', 0.012, 0.7, 0.02, -0.2, 0.9, 0], ['metal', 0.012, 0.7, 0.02, 0, 0.9, 0], ['metal', 0.012, 0.7, 0.02, 0.2, 0.9, 0], ['metal', 0.012, 0.7, 0.02, 0.4, 0.9, 0]], // low wall and railing
      [['hedge', 1, 1.3, 0.7, 0, 0.65, 0]], // hedge
      [['stone', 0.11, 1.7, 0.36, -0.5, 0.85, 0], ['stone', 0.11, 1.7, 0.36, 0.5, 0.85, 0], ['metal', 0.9, 0.05, 0.04, 0, 1.4, 0], ['metal', 0.9, 0.05, 0.04, 0, 0.3, 0], ['metal', 0.9, 1.1, 0.015, 0, 0.85, 0]], // gate
      [['stone', 1, 1.6, 0.3, 0, 0.8, 0], ['stone', 1.02, 0.08, 0.36, 0, 1.64, 0]], // garden wall
    ];
    const STRONG = [3, 6, 3, 4, 7]; // m/s under which the car bounces off instead of breaking through
    function box(out, w, h, d, cx, cy, cz, ca, sa, ox, oy, oz) { // 36 vertices of a box turned by angle a, at (ox, oy, oz)
      const P = [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]];
      const F = [[0, 1, 2, 3, 0, 0, 1], [5, 4, 7, 6, 0, 0, -1], [4, 0, 3, 7, -1, 0, 0], [1, 5, 6, 2, 1, 0, 0], [3, 2, 6, 7, 0, 1, 0], [4, 5, 1, 0, 0, -1, 0]];
      for (const [a, b, c, e, nx, ny, nz] of F) for (const i of [a, b, c, a, c, e]) {
        const lx = cx + P[i][0] * w / 2, ly = cy + P[i][1] * h / 2, lz = cz + P[i][2] * d / 2;
        out.p.push(ox + lx * ca - lz * sa, oy + ly, oz + lx * sa + lz * ca);
        out.n.push(nx * ca - nz * sa, ny, nx * sa + nz * ca);
      }
    }
    function build() {
      if (built) return; built = true;
      const D = W.fences || { panels: [] };
      mats = {
        wood: new THREE.MeshStandardMaterial({ color: hd.lin(0x8a6a48), roughness: 0.85 }),
        stone: new THREE.MeshStandardMaterial({ color: hd.lin(0xb9ad98), roughness: 0.9 }),
        metal: new THREE.MeshStandardMaterial({ color: hd.lin(0x23262a), roughness: 0.45, metalness: 0.6 }),
        hedge: new THREE.MeshStandardMaterial({ color: hd.lin(0x3f6b2e), roughness: 1 }),
      };
      const acc = new Map();
      for (const [xi, zi, ai, kind, li] of D.panels) {
        const x = xi / 10, z = zi / 10, a = ai / 1000, L = li / 10, ca = Math.cos(a), sa = Math.sin(a), y = surfaceH(x, z) - 0.05;
        const tk = Math.floor(x / TILE) + ',' + Math.floor(z / TILE);
        let T = acc.get(tk); if (!T) acc.set(tk, T = { cx: (Math.floor(x / TILE) + 0.5) * TILE, cz: (Math.floor(z / TILE) + 0.5) * TILE, g: {} });
        const pn = { x, z, a, L, kind, ca, sa, tile: tk, ranges: [], broken: false, t: 0, hk: 0.85 + ((xi * 7 + zi * 13) % 30) / 100 };
        const byMat = {};
        for (const [m, w, h, d, sx, sy, sz] of SHAPES[kind]) { (byMat[m] = byMat[m] || []).push([w * L, h * (kind === 2 ? pn.hk : 1), d, sx * L, sy * (kind === 2 ? pn.hk : 1), sz]); }
        for (const m in byMat) {
          const G_ = T.g[m] || (T.g[m] = { p: [], n: [] }), start = G_.p.length / 3;
          for (const [w, h, d, sx, sy, sz] of byMat[m]) box(G_, kind === 0 && w < 0.2 ? 0.08 : kind === 1 && w < 0.2 ? 0.02 : kind === 3 && w < 0.5 ? 0.36 : w, h, d, sx, sy, sz, ca, sa, x, y, z);
          pn.ranges.push([m, start, G_.p.length / 3 - start]);
        }
        panels.push(pn);
        const ck = Math.floor(x / CELL) * 10000 + Math.floor(z / CELL); if (!grid.has(ck)) grid.set(ck, []); grid.get(ck).push(pn);
      }
      for (const [tk, T] of acc) {
        const t = { cx: T.cx, cz: T.cz, meshes: {} };
        for (const m in T.g) {
          const geo = new THREE.BufferGeometry(), pos = new Float32Array(T.g[m].p);
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(T.g[m].n), 3));
          geo.computeBoundingSphere();
          const mesh = new THREE.Mesh(geo, mats[m]); mesh.castShadow = m === 'hedge' || m === 'stone'; mesh.receiveShadow = true; mesh.userData.hdLinear = true; mesh.matrixAutoUpdate = false;
          mesh.userData.orig = pos.slice(); scene.add(mesh); t.meshes[m] = mesh;
        }
        tiles.set(tk, t);
      }
      // a few reusable pieces for the breaks
      for (let i = 0; i < 36; i++) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.08), mats.wood); o.visible = false; o.userData.hdLinear = true; o.castShadow = true; scene.add(o); debris.push({ o, t: 9, v: [0, 0, 0], w: [0, 0] }); }
    }
    function setPanel(pn, hidden) {
      const t = tiles.get(pn.tile);
      for (const [m, start, count] of pn.ranges) {
        const mesh = t.meshes[m], a = mesh.geometry.attributes.position, arr = a.array, o = mesh.userData.orig;
        for (let i = start * 3; i < (start + count) * 3; i += 3) {
          if (hidden) { arr[i] = pn.x; arr[i + 1] = -50; arr[i + 2] = pn.z; } else { arr[i] = o[i]; arr[i + 1] = o[i + 1]; arr[i + 2] = o[i + 2]; }
        }
        a.needsUpdate = true;
      }
    }
    function breakPanel(pn, c) {
      pn.broken = true; pn.t = 0; setPanel(pn, true);
      const y = surfaceH(pn.x, pn.z), sp = Math.max(5, c.speed), dirx = c.vx / (c.speed || 1), dirz = c.vz / (c.speed || 1);
      const mat = mats[SHAPES[pn.kind][0][0]];
      for (let k = 0; k < (pn.kind === 2 ? 2 : 4); k++) {
        const d = debris.find(q => q.t > 3); if (!d) break;
        d.t = 0; d.o.material = mat; d.o.visible = true; d.o.position.set(pn.x + (R() - 0.5) * pn.L * pn.ca, y + 0.5 + R() * 0.6, pn.z + (R() - 0.5) * pn.L * pn.sa); d.o.rotation.set(R() * 3, pn.a, R() * 3);
        d.v = [dirx * sp * (0.4 + R() * 0.5) + (R() - 0.5) * 3, 2 + R() * 4, dirz * sp * (0.4 + R() * 0.5) + (R() - 0.5) * 3]; d.w = [(R() - 0.5) * 12, (R() - 0.5) * 12];
      }
      if (pn.kind === 2) for (let k = 0; k < 6; k++) hd.spark(pn.x, y + 0.8, pn.z, (R() - 0.5) * 5 + dirx * 4, 1 + R() * 3, (R() - 0.5) * 5 + dirz * 4, 0.4);
      if (c.local) { sfx.impact(pn.kind === 4 || pn.kind === 1 ? 9 : 4); L_resp(c, 1); addHeat(c, 0.03); }
    }
    function step(dt) {
      if (!built) return;
      const cars = allPlayerCars().concat(rivals, npcs, extras);
      for (const c of cars) {
        if (!c.alive || c.remote || c.proxy || (c.air || 0) > 1.4) continue;
        const sp = c.speed; if (sp < 0.5) continue;
        const i0 = Math.floor(c.x / CELL), j0 = Math.floor(c.z / CELL);
        for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) {
          const list = grid.get(i * 10000 + j); if (!list) continue;
          for (const pn of list) {
            if (pn.broken) continue;
            const ux = pn.ca, uz = pn.sa, dx = c.x - pn.x, dz = c.z - pn.z, along = dx * ux + dz * uz;
            if (Math.abs(along) > pn.L / 2 + 0.9) continue;
            const off = dx * -uz + dz * ux; if (Math.abs(off) > 1.5) continue;
            const vn = c.vx * -uz + c.vz * ux; // speed across the panel
            if (Math.abs(vn) < STRONG[pn.kind] && sp < STRONG[pn.kind] * 1.6) { // too slow: it holds, the car bounces off
              if (vn * off < 0) { const s = Math.sign(off) || 1, push = 1.5 - Math.abs(off); c.x += -uz * s * push; c.z += ux * s * push; c.vx -= -uz * vn * 1.3; c.vz -= ux * vn * 1.3; } // out of the panel, normal speed reversed
              continue;
            }
            breakPanel(pn, c); const k = pn.kind === 4 ? 0.7 : pn.kind === 1 ? 0.8 : 0.93; c.vx *= k; c.vz *= k;
            if (pn.kind === 4 || pn.kind === 1) damage(c, 2 + sp * 0.15);
          }
        }
      }
      for (const d of debris) {
        if (d.t > 3) continue; d.t += dt; d.v[1] -= 18 * dt;
        d.o.position.x += d.v[0] * dt; d.o.position.y += d.v[1] * dt; d.o.position.z += d.v[2] * dt; d.o.rotation.x += d.w[0] * dt; d.o.rotation.z += d.w[1] * dt;
        const g = surfaceH(d.o.position.x, d.o.position.z) + 0.06; if (d.o.position.y < g) { d.o.position.y = g; d.v[0] *= 0.6; d.v[2] *= 0.6; d.v[1] = Math.abs(d.v[1]) * 0.25; d.w[0] *= 0.5; d.w[1] *= 0.5; }
        if (d.t > 3) d.o.visible = false;
      }
      visT -= dt;
      if (visT <= 0) {
        visT = 0.5; const cams = locals.map(L => L.cam);
        for (const t of tiles.values()) { const v = cams.some(cm => Math.hypot(cm.position.x - t.cx, cm.position.z - t.cz) < 320); for (const m in t.meshes) t.meshes[m].visible = v; }
        for (const pn of panels) if (pn.broken && (pn.t += 0.5) > 60 && minPlayerDist(pn.x, pn.z) > 50) { pn.broken = false; setPanel(pn, false); }
      }
    }
    return { build, step, get count() { return panels.length; }, get broken() { return panels.filter(p => p.broken).length; }, panels, tiles };
  })();
