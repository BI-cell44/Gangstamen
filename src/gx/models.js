  // =====================================================================================
  // Downloaded models baked by tools/assets/bake_model.js (W.models): decoding shared by the port cranes, the pontoons
  // and whatever comes next. The boats keep their own decoder (water line, bow direction).
  // =====================================================================================
  const _modelGeo = {}; let _modelMat = null;
  // -> geometry in model units, centred on its box (m.size gives the box); grey: colours turned to their brightness
  function modelGeo(name, grey) {
    const key = name + (grey ? ':g' : ''); if (_modelGeo[key]) return _modelGeo[key];
    const m = (W.models || {})[name]; if (!m) return null;
    const bin = (s, T) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
    const pq = bin(m.p, Int16Array), cq = bin(m.c, Uint8Array), k = Math.max(...m.size) / 32767, pos = new Float32Array(pq.length), col = new Float32Array(cq.length), c = new THREE.Color();
    for (let i = 0; i < pq.length; i += 3) {
      pos[i] = pq[i] * k; pos[i + 1] = pq[i + 1] * k; pos[i + 2] = pq[i + 2] * k;
      let r = cq[i] / 255, g = cq[i + 1] / 255, b = cq[i + 2] / 255; if (grey) { const l = 0.25 + (r * 0.5 + g * 0.4 + b * 0.1) * 0.62; r = l * 0.96; g = l; b = l * 1.04; }
      c.setRGB(r, g, b).convertSRGBToLinear(); col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(bin(m.i, m.n > 65535 ? Uint32Array : Uint16Array), 1)); g.computeVertexNormals(); g.userData.shared = true; g.userData.size = m.size;
    return _modelGeo[key] = g;
  }
  function modelMesh(name, grey) {
    const g = modelGeo(name, grey); if (!g) return null;
    if (!_modelMat) { _modelMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide, flatShading: true, envMapIntensity: 0.4 }); _modelMat.userData.shared = true; }
    const o = new THREE.Mesh(g, _modelMat); o.castShadow = true; o.userData.hdLinear = true; o.userData.shared = true; return o;
  }
  // from a point on land, walk towards the water: -> [x, z] of the bank, or null (no water within reach, or the point is in the water)
  function bankFrom(x, z, dx, dz, reach = 160) {
    if (groundH(x, z) < WATER_Y + 0.6) return null;
    for (let s = 2; s <= reach; s += 2) if (groundH(x + dx * s, z + dz * s) < WATER_Y + 0.5) return [x + dx * (s - 2), z + dz * (s - 2)];
    return null;
  }
  // Port cranes on their pedestal along the quays (the downloaded crane is of this kind): the boom over the water.
  // seeds: [x, z, towards the water x, z, model, turn of the boom in radians]
  const QUAY_CRANES = [[1480, 330, 0, 1, 'grue_vieille', 0.25], [1610, 330, 0, 1, 'grue_peinte', -0.3], [1740, 330, 0, 1, 'grue_vieille', 0.1], [1900, 330, 0, 1, 'grue_vieille', -0.15],
    [640, 400, 0.5, 0.87, 'grue_vieille', 0.3], [720, 350, 0.5, 0.87, 'grue_peinte', -0.2]];
  // Open halls (b.o, set by make_belt.py: the Nefs): steel columns under the roof, round the edge and on a grid inside;
  // each stops a car, the rest of the hall is free to drive through.
  const hallColumns = [];
  function buildHalls() {
    const inside = (x, z, p) => { let c = false; for (let i = 0, n = p.length / 2, j = n - 1; i < n; j = i++) { const xi = p[2 * i], zi = p[2 * i + 1], xj = p[2 * j], zj = p[2 * j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const pts = [];
    for (const b of W.buildings) {
      if (!b.o || !b.u) continue; const p = b.p, n = p.length / 2; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, gmax = -1e9;
      for (let i = 0; i < n; i++) { x0 = Math.min(x0, p[2 * i]); x1 = Math.max(x1, p[2 * i]); z0 = Math.min(z0, p[2 * i + 1]); z1 = Math.max(z1, p[2 * i + 1]); gmax = Math.max(gmax, groundH(p[2 * i], p[2 * i + 1])); }
      const top = b._roofY != null ? b._roofY : Math.max(gmax, b.b != null ? b.b : gmax) + b.u, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; // (16 nov.) up to the roof: they stopped where the walls of an ordinary building start
      for (let i = 0; i < n; i++) { // round the edge, a little inside
        const ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * ((i + 1) % n)], bz = p[2 * ((i + 1) % n) + 1], L = Math.hypot(bx - ax, bz - az); if (L < 4) continue;
        const m = Math.max(1, Math.round(L / 15)); for (let k = 0; k < m; k++) { const t = (k + 0.5) / m; let x = ax + (bx - ax) * t, z = az + (bz - az) * t; const d = Math.hypot(cx - x, cz - z) || 1; x += (cx - x) / d * 1.2; z += (cz - z) / d * 1.2; if (inside(x, z, p)) pts.push([x, z, top]); }
      }
      for (let x = x0 + 11; x < x1; x += 22) for (let z = z0 + 11; z < z1; z += 22) if (inside(x, z, p) && inside(x + 3, z, p) && inside(x - 3, z, p) && inside(x, z + 3, p) && inside(x, z - 3, p) && roadEdge(x, z)[0] > 2) pts.push([x, z, top]);
    }
    if (!pts.length) return;
    // (16 nov., user) the roofs of the Nefs are not flat: each column goes up to the roof found straight above it
    { const rc = new THREE.Raycaster(), up = new THREE.Vector3(0, 1, 0), meshes = []; scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh) meshes.push(o); }); rc.far = 14;
      for (const P of pts) { rc.set(new THREE.Vector3(P[0], P[2] - 0.3, P[1]), up); const h = rc.intersectObjects(meshes, false)[0]; if (h) P[2] = h.point.y + 0.05; } }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 1, 0.8), new THREE.MeshStandardMaterial({ color: hd.lin(0x55625f), roughness: 0.7, metalness: 0.35 }), pts.length), M = new THREE.Matrix4();
    pts.forEach(([x, z, top], i) => { const g = groundH(x, z) - 0.3, h = top - g; M.makeScale(1, h, 1); M.setPosition(x, g + h / 2, z); im.setMatrixAt(i, M); gridAdd([x - 0.6, z, x + 0.6, z], 3.5); gridAdd([x, z - 0.6, x, z + 0.6], 3.5); hallColumns.push([x, z, top]); });
    im.castShadow = true; im.receiveShadow = true; im.userData.hdLinear = true; im.frustumCulled = false; scene.add(im);
  }
  const portCranes = [];
  function buildPortCranes() {
    for (const [sx, sz, dx, dz, name, turn] of QUAY_CRANES) {
      const bk = bankFrom(sx, sz, dx, dz); if (!bk) continue;
      // (16 nov., user) back from the edge until the ground under the plinth is flat: on the slope of the quay part of it
      // stood in the air
      const ring = (x, z) => { let lo = 1e9, hi = -1e9; for (let k = 0; k < 12; k++) { const h = groundH(x + Math.cos(k * 0.5236) * 2.9, z + Math.sin(k * 0.5236) * 2.9); lo = Math.min(lo, h); hi = Math.max(hi, h); } return [lo, hi]; };
      let x = 0, z = 0, ok = false;
      for (let back = 7; back <= 34 && !ok; back += 1.5) { x = bk[0] - dx * back; z = bk[1] - dz * back; const [lo, hi] = ring(x, z);
        ok = hi - lo < 0.4 && !(segHit(x, z, dx, dz, 5) < 5 || segHit(x, z, -dx, -dz, 5) < 5 || roadEdge(x, z)[0] < 1.5); } // not in a wall, not on a street
      if (!ok) continue;
      const o = modelMesh(name); if (!o) return;
      const S = 2.3, sz3 = o.geometry.userData.size, gy = Math.max(...ring(x, z));
      // the model: boom along -x, pedestal near +x; turn it so that the boom points to the water
      const g = new THREE.Group(); o.scale.setScalar(S); o.position.set(-(sz3[0] / 2 - 0.82) * S, sz3[1] / 2 * S, 0); g.add(o);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 2.4, 12), new THREE.MeshLambertMaterial({ color: hd.lin(0x8a8880) })); plinth.position.y = -0.1; // goes 1.3 m into the ground plinth.userData.hdLinear = true; g.add(plinth);
      g.position.set(x, gy + 0.9, z); g.rotation.y = Math.atan2(dz, -dx) + turn; g.userData.hdLinear = true; scene.add(g); portCranes.push(g);
      gridAdd([x - 2.2, z, x + 2.2, z], 3.5); gridAdd([x, z - 2.2, x, z + 2.2], 3.5);
    }
  }
