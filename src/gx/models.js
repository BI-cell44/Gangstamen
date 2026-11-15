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
  const portCranes = [];
  function buildPortCranes() {
    for (const [sx, sz, dx, dz, name, turn] of QUAY_CRANES) {
      const bk = bankFrom(sx, sz, dx, dz); if (!bk) continue;
      const x = bk[0] - dx * 7, z = bk[1] - dz * 7; if (segHit(x, z, dx, dz, 5) < 5 || segHit(x, z, -dx, -dz, 5) < 5 || roadEdge(x, z)[0] < 1.5) continue; // not in a wall, not on a street
      const o = modelMesh(name); if (!o) return;
      const S = 2.3, sz3 = o.geometry.userData.size, gy = groundH(x, z);
      // the model: boom along -x, pedestal near +x; turn it so that the boom points to the water
      const g = new THREE.Group(); o.scale.setScalar(S); o.position.set(-(sz3[0] / 2 - 0.82) * S, sz3[1] / 2 * S, 0); g.add(o);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.6, 12), new THREE.MeshLambertMaterial({ color: hd.lin(0x8a8880) })); plinth.position.y = 0.3; plinth.userData.hdLinear = true; g.add(plinth);
      g.position.set(x, gy + 0.9, z); g.rotation.y = Math.atan2(dz, -dx) + turn; g.userData.hdLinear = true; scene.add(g); portCranes.push(g);
      gridAdd([x - 2.2, z, x + 2.2, z], 3.5); gridAdd([x, z - 2.2, x, z + 2.2], 3.5);
    }
  }
