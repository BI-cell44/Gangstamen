// ---------- map edges: construction barriers where the streets leave the map, and the tram line 1 to the north ----------
const TRAM = W.tram || null;
function tramZ(arr, x) { const c = (x - TRAM.x0) / TRAM.step, i = Math.max(0, Math.min(arr.length - 2, Math.floor(c))), u = Math.max(0, Math.min(1, c - i)); return arr[i] + (arr[i + 1] - arr[i]) * u; }
const tramS = x => tramZ(TRAM.s, x) - 0.72, tramN = x => tramZ(TRAM.n, x) + 0.72; // centre lines of the south (eastbound) and north (westbound) tracks
const tramWall = x => Math.max(tramZ(TRAM.s, x) - 1.6, (tramZ(TRAM.s, x) + tramZ(TRAM.n, x)) / 2); // cars may drive onto the south track, not past it
const EDGE = { x0: CX - HX, x1: CX + HX, z0: CZ - HZ, z1: CZ + HZ };
const edgeMat = (c, o = {}) => HD ? Object.assign(new THREE.MeshStandardMaterial({ color: hd.lin(c), roughness: o.r ?? 0.6, metalness: o.m || 0 }), o.x || {}) : new THREE.MeshLambertMaterial(Object.assign({ color: c }, o.x || {}));
function buildEdges() {
  // invisible walls around the play area (inside the edge), and along the tram tracks
  const m = 1.5, { x0, x1, z0, z1 } = EDGE;
  for (const s of [[x0 + m, z0, x0 + m, z1], [x0, z1 - m, x1, z1 - m], [x1 - m, z1, x1 - m, z0], [x1, z0 + m, x0, z0 + m]]) {
    const L = Math.hypot(s[2] - s[0], s[3] - s[1]), n = Math.ceil(L / 20);
    for (let k = 0; k < n; k++) gridAdd([s[0] + (s[2] - s[0]) * k / n, s[1] + (s[3] - s[1]) * k / n, s[0] + (s[2] - s[0]) * (k + 1) / n, s[1] + (s[3] - s[1]) * (k + 1) / n], 3.5);
  }
  if (TRAM) for (let x = x0 - 40; x < x1 + 40; x += 6) gridAdd([x, tramWall(x), x + 6, tramWall(x + 6)], 3.5);
  // the barriers: red and white plastic sections on little feet, a row across every street that crosses the edge
  const [bc, bg] = canvas(128, 32); for (let k = 0; k < 8; k++) { bg.fillStyle = k % 2 ? '#f3f0ea' : '#d8261c'; bg.beginPath(); bg.moveTo(k * 16 - 8, 32); bg.lineTo(k * 16 + 8, 0); bg.lineTo(k * 16 + 24, 0); bg.lineTo(k * 16 + 8, 32); bg.fill(); }
  const bt = new THREE.CanvasTexture(bc); if (HD) bt.encoding = THREE.sRGBEncoding;
  const panelM = edgeMat(0xffffff, { r: 0.5, x: { map: bt } }), footM = edgeMat(0xd8261c, { r: 0.6 }), lampM = HD ? new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 4, 0.3) }) : new THREE.MeshBasicMaterial({ color: 0xffb000 });
  const spots = [];
  const crossAt = (ax, az, bx, bz) => { // where a street segment leaves the play area (west, south and east edges; the north side is the tram)
    const out = [];
    for (const [k, v, axis] of [['x', x0 + m + 1.2, 0], ['x', x1 - m - 1.2, 0], ['z', z1 - m - 1.2, 1]]) {
      const a = axis ? az : ax, b = axis ? bz : bx; if ((a - v) * (b - v) > 0 || a === b) continue;
      const t = (v - a) / (b - a), px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      if (px < x0 - 1 || px > x1 + 1 || pz < z0 - 1 || pz > z1 + 1) continue;
      out.push([px, pz, axis ? 1 : 0, 0]);
    }
    return out;
  };
  for (const r of W.roads) {
    if (!r.d) continue;
    for (let i = 0; i + 3 < r.p.length; i += 2) for (const s of crossAt(r.p[i], r.p[i + 1], r.p[i + 2], r.p[i + 3])) { s[3] = r.w; spots.push(s); }
    if (TRAM) { // a street that runs into the tram line: barriers past the far track, across where it carried on
      const ends = [[r.p[0], r.p[1], r.p[2], r.p[3]], [r.p[r.p.length - 2], r.p[r.p.length - 1], r.p[r.p.length - 4], r.p[r.p.length - 3]]];
      for (const [ex, ez] of ends) if (ex > x0 && ex < x1 && Math.abs(ez - tramZ(TRAM.s, ex)) < 4) spots.push([ex, tramN(ex) - 2.6, 2, r.w]);
    }
  }
  // merge rows that overlap (two carriageways, a street that zigzags across the edge)
  const rows = [];
  for (const s of spots) { const o = rows.find(q => q[2] === s[2] && Math.hypot(q[0] - s[0], q[1] - s[1]) < (q[3] + s[3]) / 2 + 2); if (o) { o[3] = Math.max(o[3], s[3] + Math.hypot(o[0] - s[0], o[1] - s[1])); } else rows.push(s.slice()); }
  const elems = []; // [x, z, rotation]
  for (const [px, pz, axis, w] of rows) {
    const len = Math.min(26, w + 3), n = Math.max(2, Math.round(len / 1.25));
    for (let k = 0; k < n; k++) {
      const o = (k - (n - 1) / 2) * 1.25;
      if (axis === 0) elems.push([px, pz + o, Math.PI / 2]); else if (axis === 1) elems.push([px + o, pz, 0]);
      else { const x = px + o; elems.push([x, tramN(x) - 2.6, Math.atan2(-(tramN(x + 1) - tramN(x - 1)), 2) + 0]); }
    }
  }
  const N = elems.length; if (!N) return;
  const panel = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.5, 0.06).translate(0, 0.78, 0), panelM, N);
  const low = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.18, 0.06).translate(0, 0.3, 0), panelM, N);
  const foot = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.12, 0.7).translate(0, 0.06, 0), footM, N * 2);
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1.05, 0.06).translate(0, 0.52, 0), footM, N * 2);
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6).translate(0, 1.14, 0), lampM, Math.ceil(N / 3));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  let nl = 0;
  elems.forEach(([x, z, ry], i) => {
    const y = surfaceH(x, z); q.setFromAxisAngle(Y, ry);
    m4.compose(v.set(x, y, z), q, one); panel.setMatrixAt(i, m4); low.setMatrixAt(i, m4);
    for (const s of [-1, 1]) { const dx = Math.cos(ry) * 0.56 * s, dz = -Math.sin(ry) * 0.56 * s; m4.compose(v.set(x + dx, y, z + dz), q, one); foot.setMatrixAt(i * 2 + (s > 0), m4); post.setMatrixAt(i * 2 + (s > 0), m4); }
    if (i % 3 === 0 && nl < lamp.count) { m4.compose(v.set(x + Math.cos(ry) * 0.56, y, z - Math.sin(ry) * 0.56), q, one); lamp.setMatrixAt(nl++, m4); }
  });
  lamp.count = nl;
  for (const o of [panel, low, foot, post, lamp]) { o.castShadow = o !== lamp; o.userData.hdLinear = true; scene.add(o); }
  edges.barriers = N; edges.lamps = lampM; edges.rows = rows;
}
const edges = { barriers: 0 };

// the tram line 1: two articulated trams, one each way, stopping at the real stations (Égalité, Du Chaffault, Gare Maritime)
const TRAM_STOPS = [104, 616, 1215];
const trams = [];
function buildTrams() {
  if (!TRAM) return;
  const white = edgeMat(0xe9ecee, { r: 0.35, m: 0.1 }), glass = edgeMat(0x1c2630, { r: 0.1, m: 0.3 }), stripe = edgeMat(0x1a9a8a, { r: 0.4 }), grey = edgeMat(0x3a3d44, { r: 0.6 }), lightM = HD ? new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.5, 4) }) : new THREE.MeshBasicMaterial({ color: 0xfff4d0 }), tailM = HD ? new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.2, 0.1) }) : new THREE.MeshBasicMaterial({ color: 0xff2010 });
  const SEG = 9.4, NSEG = 4;
  // (Fable 5.2, user feedback: the tram was a stack of boxes.) The Nantes tram of 1996, in the spirit of the first French
  // standard tram: white body with a green waistband, rounded roof, big windows between thin pillars, double doors,
  // a raked cab with a wide windscreen, bogies under the floor, bellows between the sections, a pantograph.
  const doorM = edgeMat(0x157a6e, { r: 0.45 }), roofM = edgeMat(0xbfc4c8, { r: 0.7 }), dark = edgeMat(0x17181b, { r: 0.8 }), steel = edgeMat(0x6b6f76, { r: 0.45, m: 0.6 });
  const dest = HD ? new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 0.3) }) : new THREE.MeshBasicMaterial({ color: 0xffb020 });
  const MATS = [white, glass, stripe, grey, doorM, roofM];
  const PROF = [[0.32, 1.06], [0.72, 1.2], [1.28, 1.22], [1.56, 1.22], [2.8, 1.2], [3.02, 1.14], [3.26, 0.9], [3.4, 0.5], [3.45, 0]];
  const section = (cab) => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const add = (geo, mt, x, y, z, cast = true) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); o.castShadow = cast; body.add(o); return o; };
    const len = SEG - 0.55, zb = -len / 2, zf = len / 2, noseL = cab ? 1.9 : 0;
    // doors (double leaf, 1.3 m) and window pillars every 1.75 m
    const doors = cab ? [[-2.9, -1.6], [0.6, 1.9]] : [[-3.2, -1.9], [1.9, 3.2]], cuts = [];
    for (const [a, b] of doors) cuts.push(a, b, (a + b) / 2 - 0.03, (a + b) / 2 + 0.03);
    const pillars = []; for (let z = zb + 0.35; z < zf - noseL - 0.3; z += 1.75) { if (doors.some(([a, b]) => z + 0.2 > a - 0.05 && z < b + 0.05)) continue; pillars.push([z, z + 0.2]); cuts.push(z, z + 0.2); }
    const inR = (z, list) => list.some(([a, b]) => z > a && z < b);
    const paint = (z, y, t, side, end) => {
      if (y > 3.1) return 5;                                   // roof
      if (y < 0.72) return 3;                                  // skirt
      if (end === 'f') { if (y > 1.56 && y < 2.8 && t > 0.12) return 1; return y > 1.28 && y < 1.56 ? 2 : 0; } // cab: windscreen, band
      if (inR(z, doors)) { if (Math.abs(z - (doors.find(([a, b]) => z > a && z < b)[0] + doors.find(([a, b]) => z > a && z < b)[1]) / 2) < 0.03) return 3; return y > 1.56 && y < 2.8 ? 1 : 4; }
      if (y > 1.28 && y < 1.56) return 2;                       // green waistband
      if (y > 1.56 && y < 2.8) return inR(z, pillars) || z < zb + 0.3 || z > zf - noseL - 0.25 ? 0 : 1; // windows
      return 0;
    };
    const shell = loftBody({ len, prof: PROF, front: cab ? { len: noseL, taper: 0.3, rake: 0.5, y0: 1.3, round: true } : null, back: null, cuts, paint, mats: MATS, capMat: 3 });
    body.add(shell);
    // bellows towards the next section, bogie and its wheels, roof equipment
    add(new THREE.BoxGeometry(2.05, 2.75, 0.7), dark, 0, 1.8, zb - 0.26);
    for (const zz of cab ? [1.6] : [0]) {
      add(new THREE.BoxGeometry(1.9, 0.34, 2.3), dark, 0, 0.36, zz);
      for (const sx of [-1, 1]) for (const dz of [-0.75, 0.75]) { const w = add(new THREE.CylinderGeometry(0.33, 0.33, 0.14, 14), steel, sx * 0.78, 0.33, zz + dz); w.rotation.z = Math.PI / 2; }
    }
    add(new THREE.BoxGeometry(1.5, 0.26, cab ? 2.6 : 3.4), grey, 0, 3.55, cab ? -1.2 : 0);
    if (cab) {
      add(new THREE.BoxGeometry(1.25, 0.24, 0.06), dest, 0, 2.93, zf - 0.93);                 // destination display over the windscreen
      for (const s of [-1, 1]) {
        add(new THREE.BoxGeometry(0.3, 0.13, 0.08), lightM, s * 0.55, 1.02, zf + 0.03, false);
        const mir = add(new THREE.BoxGeometry(0.07, 0.3, 0.16), dark, s * 1.22, 2.3, zf - 1.75); mir.rotation.y = s * 0.3;
      }
      add(new THREE.BoxGeometry(1.5, 0.12, 0.1), dark, 0, 0.5, zf + 0.03);                    // bumper
      g.userData.tail = [-1, 1].map(s => add(new THREE.BoxGeometry(0.2, 0.11, 0.08), tailM, s * 0.3, 1.02, zf + 0.04, false));
    }
    g.userData.body = body;
    return g;
  };
  const pantograph = g => { // diamond frame up to the wire (6.3 m above the rail)
    const bar = (x0, y0, z0, x1, y1, z1) => { const d = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0), o = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, d.length(), 5), dark); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.userData.body.add(o); };
    for (const s of [-0.35, 0.35]) { bar(s, 3.68, -0.9, s, 4.95, 0.1); bar(s, 4.95, 0.1, s, 6.2, -0.75); }
    bar(-0.35, 4.95, 0.1, 0.35, 4.95, 0.1); bar(-0.75, 6.22, -0.75, 0.75, 6.22, -0.75);
  };
  for (const dir of [1, -1]) {
    const segs = [];
    for (let k = 0; k < NSEG; k++) { const s = section(k === 0 || k === NSEG - 1); if (k === NSEG - 1) s.userData.body.rotation.y = Math.PI; if (k === 1) pantograph(s); s.traverse(o => { o.userData.hdLinear = true; }); if (HD) hd.linearize(s); scene.add(s); segs.push(s); }
    // catenary pantograph on the second section
    trams.push({ dir, x: dir > 0 ? EDGE.x0 - 60 : EDGE.x1 + 60, v: 9, segs, SEG, wait: 0, stopAt: null, hitCd: 0, bellCd: 0, sleep: dir > 0 ? 0 : 25 });
  }
  // overhead line poles between the tracks
  const poles = []; for (let x = EDGE.x0 - 30; x < EDGE.x1 + 30; x += 32) poles.push(x);
  const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.13, 7, 8).translate(0, 3.5, 0), grey, poles.length), arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 6).translate(0, 6.6, 0), grey, poles.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  poles.forEach((x, i) => { const z = (tramS(x) + tramN(x)) / 2, a = Math.atan2(1, -(tramS(x + 1) - tramS(x - 1)) / 2); q.setFromAxisAngle(Y, a + Math.PI / 2); m4.compose(v.set(x, surfaceH(x, z), z), q, one); pm.setMatrixAt(i, m4); arm.setMatrixAt(i, m4); });
  for (const o of [pm, arm]) { o.castShadow = true; o.userData.hdLinear = true; scene.add(o); }
  const wire = new Float32Array(2 * 3 * 2 * Math.ceil((EDGE.x1 - EDGE.x0 + 120) / 8)); let wi = 0;
  for (const f of [tramS, tramN]) for (let x = EDGE.x0 - 60; x + 8 <= EDGE.x1 + 60; x += 8) { for (const xx of [x, x + 8]) { wire[wi++] = xx; wire[wi++] = surfaceH(xx, f(xx)) + 6.3; wire[wi++] = f(xx); } }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wire.subarray(0, wi), 3));
  scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x202024 })));
}
function tramStep(dt) {
  for (const T of trams) {
    if (T.sleep > 0) { T.sleep -= dt; for (const s of T.segs) s.visible = false; continue; }
    const track = T.dir > 0 ? tramS : tramN;
    // stations: brake, wait, go
    const next = TRAM_STOPS.filter(x => (x - T.x) * T.dir > 0).sort((a, b) => (a - T.x) * T.dir - (b - T.x) * T.dir)[0];
    const toStop = next !== undefined ? (next - T.x) * T.dir : 1e9;
    if (T.wait > 0) { T.wait -= dt; T.v = 0; if (T.wait <= 0) T.left = next; }
    else {
      const target = toStop < 60 && T.left !== next ? Math.max(1.2, Math.sqrt(2 * 0.9 * toStop)) : 12;
      T.v += Math.max(-2.5 * dt, Math.min(1.1 * dt, target - T.v));
      if (toStop < 0.8 && T.left !== next) { T.wait = 14; T.v = 0; }
    }
    T.x += T.v * T.dir * dt;
    if ((T.dir > 0 && T.x > EDGE.x1 + 90) || (T.dir < 0 && T.x < EDGE.x0 - 90)) { T.x = T.dir > 0 ? EDGE.x0 - 90 : EDGE.x1 + 90; T.sleep = 20 + Math.random() * 25; T.left = null; continue; }
    // place the sections along the track (each one follows the rails)
    for (let k = 0; k < T.segs.length; k++) {
      const s = T.segs[k], xa = T.x - T.dir * (k * T.SEG), xb = xa - T.dir * T.SEG, za = track(xa), zb = track(xb);
      const mx = (xa + xb) / 2, mz = (za + zb) / 2; s.visible = true;
      s.position.set(mx, surfaceH(mx, mz) + 0.05, mz); s.rotation.y = Math.atan2(xa - xb, za - zb);
      if (k === 0 && s.userData.tail) s.userData.tail.forEach(o => { o.visible = false; });
      if (k === T.segs.length - 1 && s.userData.tail) s.userData.tail.forEach(o => { o.visible = true; });
    }
    // anything on its track is swept aside (only the south track can be reached)
    T.hitCd -= dt; T.bellCd -= dt;
    if (T.dir < 0) continue;
    const head = T.x, tail = T.x - T.segs.length * T.SEG;
    const cars = [...allPlayerCars(), ...rivals, ...(gx ? gx.cars() : [])];
    for (const c of cars) {
      if (!c.alive || c.x < tail - 2 || c.x > head + 2.5) continue;
      const tz = tramS(c.x), d = c.z - tz;
      if (d < 3.2 && d > -2.5) {
        if (c.x > head - 1 && T.v > 1 && T.bellCd <= 0) { T.bellCd = 2.5; if (c.local || Math.random() < 0.3) sfx.bell(); }
        if (d < 2.4) { // contact: shoved off the rails, and one knock per pass if the tram was moving
          c.z = tz + 3; c.vz = Math.max(c.vz, 5 + T.v * 0.4); c.vx += T.v * 0.5;
          T.hit = T.hit || new Set();
          if (T.v > 2 && !T.hit.has(c) && !c.remote && !c.proxy) { T.hit.add(c); setTimeout(() => T.hit.delete(c), 4000); spawnFx(c.x, 1, c.z - 1, 0.6, 0xffe28a, 0.2, 2, 2); damage(c, 10 + T.v * 1.2); if (c.local) { sfx.hit(); rumbleFor(c.owner, 0.8, 0.6, 250); flashFor(c.owner, 'Le tram !', 'Il ne s’arrête pas pour toi'); } }
        }
      }
    }
  }
}

