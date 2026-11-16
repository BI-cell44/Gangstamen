  // =====================================================================================
  // hand-made landmarks: Saint-Martin's bell tower, the Loire quays, the Misery quarry, the yellow Titan crane
  // =====================================================================================
  const LM = {};
  const stdM = (c, r = 0.8, m = 0, extra = {}) => Object.assign(new THREE.MeshStandardMaterial({ color: hd.lin(c), roughness: r, metalness: m }), extra);
  function stoneTex(w, h, rows, tint) { // ashlar courses for the church and the quay walls
    const [c, g] = canvas(w, h); g.fillStyle = tint; g.fillRect(0, 0, w, h);
    const rh = h / rows;
    for (let r = 0; r < rows; r++) { let x = -(r % 2) * 18; while (x < w) { const bw = 26 + Math.random() * 22, l = 0.85 + Math.random() * 0.25;
      g.fillStyle = `rgba(${l > 1 ? 255 : 0},${l > 1 ? 255 : 0},${l > 1 ? 255 : 0},${Math.abs(l - 1) * 0.5})`; g.fillRect(x + 1, r * rh + 1, bw - 2, rh - 2);
      g.fillStyle = 'rgba(40,30,25,.45)'; g.fillRect(x, r * rh, bw, 1.5); g.fillRect(x, r * rh, 1.5, rh); x += bw; } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  function church() { // Saint-Martin de Chantenay: west bell tower with a slate spire over the place du Bourg
    let b = null, bi = -1; W.buildings.forEach((x, i) => { if (x.k === 6) { const n = x.p.length / 2; let cx = 0, cz = 0; for (let k = 0; k < n; k++) { cx += x.p[2 * k]; cz += x.p[2 * k + 1]; } cx /= n; cz /= n; if (Math.hypot(cx + 205, cz - 350) < 40) { b = x; bi = i; } } });
    if (!b) return;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let k = 0; k < b.p.length; k += 2) { x0 = Math.min(x0, b.p[k]); x1 = Math.max(x1, b.p[k]); z0 = Math.min(z0, b.p[k + 1]); z1 = Math.max(z1, b.p[k + 1]); }
    const tx = x0 - 1.5, tz = (z0 + z1) / 2, base = Math.min(groundH(tx, tz), b.b != null ? b.b : 1e9) - 0.5, top = base + 26;
    const st = stoneTex(512, 512, 16, '#cfc5b0'); st.repeat.set(1, 3);
    const stone = stdM(0xffffff, 0.85, 0, { map: st }), slate = stdM(0x3c4250, 0.55, 0.2), dark = stdM(0x141418, 0.9), gold = stdM(0xd8a43c, 0.3, 1);
    const g = new THREE.Group(); g.position.set(tx, 0, tz);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(7, top - base, 7), stone, 0, (top + base) / 2, 0);                    // tower shaft
    add(new THREE.BoxGeometry(7.6, 0.6, 7.6), stone, 0, base + 10, 0); add(new THREE.BoxGeometry(7.6, 0.6, 7.6), stone, 0, top - 0.3, 0); // string courses
    for (const [sx, sz, ry] of [[0, 3.52, 0], [0, -3.52, 0], [3.52, 0, Math.PI / 2], [-3.52, 0, Math.PI / 2]]) {
      const o = add(new THREE.BoxGeometry(1.6, 4, 0.1), dark, sx, top - 4, sz); o.rotation.y = ry;          // belfry openings
      const w = add(new THREE.BoxGeometry(1.2, 2.6, 0.1), dark, sx * 0.995, base + 5.5, sz * 0.995); w.rotation.y = ry; // tall windows
    }
    // west portal facing the place du Bourg
    const door = add(new THREE.BoxGeometry(0.2, 4.5, 2.6), stdM(0x3a2416, 0.7), -3.55, base + 2.25 + 0.5, 0);
    const arch = add(new THREE.CylinderGeometry(1.3, 1.3, 0.22, 16, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), stdM(0x3a2416, 0.7), -3.55, base + 5, 0); arch.rotation.z = 0;
    // clock faces, lit at night
    const [cc, cg] = canvas(128, 128); cg.fillStyle = '#efe6cf'; cg.beginPath(); cg.arc(64, 64, 60, 0, 6.283); cg.fill(); cg.strokeStyle = '#222'; cg.lineWidth = 5; cg.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; cg.fillStyle = '#222'; cg.fillRect(64 + Math.cos(a) * 48 - 3, 64 + Math.sin(a) * 48 - 3, 6, 6); }
    cg.lineWidth = 6; cg.beginPath(); cg.moveTo(64, 64); cg.lineTo(64, 26); cg.moveTo(64, 64); cg.lineTo(92, 74); cg.stroke();
    const ct = new THREE.CanvasTexture(cc); ct.encoding = THREE.sRGBEncoding;
    const clockM = new THREE.MeshStandardMaterial({ map: ct, emissive: 0xffffff, emissiveMap: ct, emissiveIntensity: 0.15, roughness: 0.4 }); LM.clockM = clockM;
    for (const [sx, sz, ry] of [[0, 3.56, 0], [0, -3.56, Math.PI], [3.56, 0, Math.PI / 2], [-3.56, 0, -Math.PI / 2]]) { const o = add(new THREE.CircleGeometry(1.2, 24), clockM, sx, base + 13.5, sz); o.rotation.y = ry; }
    // pinnacles and the octagonal spire
    for (const sx of [-3.2, 3.2]) for (const sz of [-3.2, 3.2]) add(new THREE.ConeGeometry(0.5, 3.4, 4), stone, sx, top + 1.7, sz);
    add(new THREE.CylinderGeometry(3.2, 3.6, 1.2, 8), stone, 0, top + 0.6, 0);
    add(new THREE.ConeGeometry(3.1, 17, 8), slate, 0, top + 1.2 + 8.5, 0);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; const d = add(new THREE.BoxGeometry(0.7, 1.4, 0.7), slate, Math.cos(a) * 2.6, top + 3.2, Math.sin(a) * 2.6); d.rotation.y = -a; } // lucarnes
    add(new THREE.BoxGeometry(0.12, 2, 0.12), gold, 0, top + 19.1, 0); add(new THREE.BoxGeometry(0.12, 0.12, 1.1), gold, 0, top + 19.5, 0); // cross
    add(new THREE.SphereGeometry(0.25, 10, 8), gold, 0, top + 18.2, 0);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g);
    for (const [ax, az, bx, bz] of [[tx - 3.5, tz - 3.5, tx + 3.5, tz - 3.5], [tx + 3.5, tz - 3.5, tx + 3.5, tz + 3.5], [tx + 3.5, tz + 3.5, tx - 3.5, tz + 3.5], [tx - 3.5, tz + 3.5, tx - 3.5, tz - 3.5]]) gridAdd([ax, az, bx, bz], 0);
  }
  // Sainte-Anne (1846-1872), on the top of the butte: granite nave and transept, round apse, slate roofs,
  // the bell tower with its spire on the side of the avenue Sainte-Anne, which runs down to the stairs and the Loire
  function stAnne() {
    const L_ = landmarks.find(o => o.k === 'stAnne'); if (!L_) return;
    const p = L_.b.p, n = p.length / 2;
    let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += p[2 * i]; cz += p[2 * i + 1]; } cx /= n; cz /= n;
    // main axis of the footprint (principal component); the tower end is the one facing the stairs
    let sxx = 0, szz = 0, sxz = 0; for (let i = 0; i < n; i++) { const dx = p[2 * i] - cx, dz = p[2 * i + 1] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
    const th = 0.5 * Math.atan2(2 * sxz, sxx - szz); let ux = Math.cos(th), uz = Math.sin(th);
    if ((940 - cx) * ux + (100 - cz) * uz < 0) { ux = -ux; uz = -uz; }
    const vx = -uz, vz = ux;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (let i = 0; i < n; i++) { const dx = p[2 * i] - cx, dz = p[2 * i + 1] - cz, a = dx * ux + dz * uz, b = dx * vx + dz * vz; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    const len = a1 - a0, wid = b1 - b0, base = L_.base - 0.3;
    const st = stoneTex(512, 512, 18, '#bdb3a2'); st.repeat.set(2, 2);
    const stone = stdM(0xffffff, 0.85, 0, { map: st }), light = stdM(0xd9cfbb, 0.8), slate = stdM(0x3a404c, 0.5, 0.25), glass = stdM(0x223044, 0.2, 0.3, { emissive: new THREE.Color(0.9, 0.55, 0.25), emissiveIntensity: 0 }), gold = stdM(0xd8a43c, 0.3, 1), wood = stdM(0x3a2416, 0.7);
    LM.stAnneGlass = glass;
    const g = new THREE.Group(); g.position.set(cx, base, cz); g.rotation.y = Math.atan2(ux, uz); // local +z = towards the stairs
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const roof = (w, l, h, y, x, z) => { // a pitched roof: a triangular prism along local z
      const s = new THREE.Shape(); s.moveTo(-w / 2 - 0.4, 0); s.lineTo(w / 2 + 0.4, 0); s.lineTo(0, h); s.lineTo(-w / 2 - 0.4, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false }); geo.translate(0, 0, -l / 2); return add(geo, slate, x, y, z);
    };
    const mid = (a0 + a1) / 2, tower = 7.5, naveW = Math.min(14, wid * 0.42), naveL = len - tower - 6, naveZ = a0 + 6 + naveL / 2, eaves = 13;
    add(new THREE.BoxGeometry(naveW, eaves, naveL), stone, 0, eaves / 2, naveZ);          // nave
    roof(naveW, naveL, 7, eaves, 0, naveZ);
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(wid * 0.22, 8, naveL - 4), stone, s * (naveW / 2 + wid * 0.11), 4, naveZ); } // aisles
    const trZ = a0 + 6 + naveL * 0.3, trW = Math.min(wid - 1, naveW * 2.4);                // transept
    add(new THREE.BoxGeometry(trW, eaves, 9), stone, 0, eaves / 2, trZ);
    { const s = new THREE.Shape(); s.moveTo(-4.9, 0); s.lineTo(4.9, 0); s.lineTo(0, 6.5); s.lineTo(-4.9, 0); const geo = new THREE.ExtrudeGeometry(s, { depth: trW, bevelEnabled: false }); geo.translate(0, 0, -trW / 2); geo.rotateY(Math.PI / 2); add(geo, slate, 0, eaves, trZ); }
    const ap = add(new THREE.CylinderGeometry(naveW / 2, naveW / 2, eaves - 1, 18, 1, false, Math.PI / 2, Math.PI), stone, 0, (eaves - 1) / 2, a0 + 6); ap.rotation.y = Math.PI; // apse, at the back
    add(new THREE.SphereGeometry(naveW / 2 + 0.3, 18, 8, Math.PI / 2, Math.PI, 0, Math.PI / 2), slate, 0, eaves - 1, a0 + 6).rotation.y = Math.PI;
    // tall windows along the nave, round-headed, glowing at night
    for (let k = 0; k < 6; k++) { const z = a0 + 9 + k * (naveL - 6) / 5; for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.15, 4.6, 1.5), glass, s * (naveW / 2 + 0.05), 8.2, z); }
    for (const s of [-1, 1]) add(new THREE.CircleGeometry(2.4, 24), glass, s * (trW / 2 + 0.06), 8.5, trZ, s * Math.PI / 2); // transept roses
    // the bell tower on the facade: square shaft, belfry, pinnacles, octagonal spire with a gilded cross
    const tz = a1 - tower / 2, tw = 7.6, shaft = 27;
    add(new THREE.BoxGeometry(tw, shaft, tw), stone, 0, shaft / 2, tz);
    for (const y of [9, 18, shaft]) add(new THREE.BoxGeometry(tw + 0.6, 0.6, tw + 0.6), light, 0, y, tz);
    for (const [sx, sz, ry] of [[0, tw / 2 + 0.03, 0], [0, -tw / 2 - 0.03, 0], [tw / 2 + 0.03, 0, Math.PI / 2], [-tw / 2 - 0.03, 0, Math.PI / 2]]) {
      for (const dx of [-1.3, 1.3]) add(new THREE.BoxGeometry(1.4, 5.2, 0.1), stdM(0x101014, 0.9), sx + (ry ? 0 : dx), shaft - 4, tz + sz + (ry ? dx : 0), ry); // twin belfry openings
      add(new THREE.CircleGeometry(1.1, 20), stdM(0xefe6cf, 0.4), sx, 14, tz + sz, ry + (sz < 0 ? Math.PI : 0) + (sx < 0 ? Math.PI : 0));
    }
    add(new THREE.BoxGeometry(3.4, 6.5, 0.4), wood, 0, 3.6, tz + tw / 2 + 0.1);             // portal
    add(new THREE.CylinderGeometry(1.7, 1.7, 0.5, 18, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), light, 0, 6.85, tz + tw / 2 + 0.15);
    add(new THREE.CircleGeometry(1.5, 24), glass, 0, 11.5, tz + tw / 2 + 0.06);              // rose above the portal
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.ConeGeometry(0.55, 4, 4), light, sx * (tw / 2 - 0.4), shaft + 2, tz + sz * (tw / 2 - 0.4), Math.PI / 4);
    add(new THREE.CylinderGeometry(3.3, 3.7, 1.4, 8), light, 0, shaft + 0.7, tz);
    add(new THREE.ConeGeometry(3.3, 21, 8), slate, 0, shaft + 1.4 + 10.5, tz);
    add(new THREE.BoxGeometry(0.15, 2.4, 0.15), gold, 0, shaft + 23.5, tz); add(new THREE.BoxGeometry(1.3, 0.15, 0.15), gold, 0, shaft + 23.9, tz);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.stAnne = g;
  }
  // the Sainte-Anne stairs (1851): the double flight from the statue down to the quai Marquis d'Aiguillon (OpenStreetMap ways)
  const STAIRS = [[939.5, 101.8, 945, 106.9, 25], [946.4, 108.3, 952, 113.4, 25], [953.5, 114.8, 959.1, 119.9, 25], [960.5, 121.3, 963.4, 123.9, 15],
    [942.4, 98.9, 947.9, 104, 25], [949.3, 105.3, 954.9, 110.5, 25], [956.4, 111.9, 962, 117, 25], [963.4, 118.3, 966.2, 120.9, 15],
    [969.8, 122.1, 972.4, 119.2, 15], [974, 117.5, 976.5, 114.8, 14], [964.9, 127.5, 962.3, 130.3, 15], [960.8, 132, 958.2, 134.7, 14]];
  // (16 nov.) « Route barrée » across the start of the pont des Trois-Continents: red and white barriers, a sign, a wall
  function bridgeClosed() {
    const ax = 2146, az = 340, bx = 2111, bz = 624, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux, half = 7.5;
    const x0 = ax + ux * 4, z0 = az + uz * 4, y0 = surfaceH(x0, z0), g = new THREE.Group();
    const [cv, cg] = canvas(256, 32); for (let i = 0; i < 8; i++) { cg.fillStyle = i % 2 ? '#ffffff' : '#d42a2a'; cg.fillRect(i * 32, 0, 32, 32); }
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding; tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(3, 1);
    const bar = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 }), leg = new THREE.MeshStandardMaterial({ color: hd.lin(0xdddddd), roughness: 0.7 });
    for (const row of [0, 2.2]) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.3, 0.08), bar); bm.position.set(x0 + ux * row, y0 + 1.0, z0 + uz * row); bm.rotation.y = Math.atan2(nx, nz) + Math.PI / 2; g.add(bm);
      for (let k = -half; k <= half + 0.01; k += 2.5) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.5), leg); l.position.set(x0 + ux * row + nx * k, y0 + 0.55, z0 + uz * row + nz * k); l.rotation.y = Math.atan2(nx, nz); g.add(l); }
    }
    const [sc, sg] = canvas(256, 128); sg.fillStyle = '#ffffff'; sg.fillRect(0, 0, 256, 128); sg.strokeStyle = '#d42a2a'; sg.lineWidth = 14; sg.strokeRect(7, 7, 242, 114);
    sg.fillStyle = '#1a1a1a'; sg.font = 'bold 40px Arial, sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText('ROUTE', 128, 46); sg.fillText('BARRÉE', 128, 90);
    const st = new THREE.CanvasTexture(sc); st.encoding = THREE.sRGBEncoding;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: st, roughness: 0.6, side: THREE.DoubleSide })); sign.position.set(x0 - ux * 0.1, y0 + 1.75, z0 - uz * 0.1); sign.rotation.y = Math.atan2(-ux, -uz); g.add(sign);
    g.traverse(o => { o.userData.hdLinear = true; o.castShadow = true; }); scene.add(g);
    gridAdd([x0 + nx * (half + 2), z0 + nz * (half + 2), x0 - nx * (half + 2), z0 - nz * (half + 2)], 3.5);
  }
  function stairs() {
    const st = stoneTex(256, 256, 8, '#c9c0ae'), stepM = stdM(0xffffff, 0.9, 0, { map: st }), wallM = stdM(0xcbc2b0, 0.85), capM = stdM(0xe2dacb, 0.75), rail = stdM(0x1c1d22, 0.5, 0.7);
    const total = STAIRS.reduce((s, f) => s + f[4], 0), steps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stepM, total), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    // heights: the flights follow each other down the slope; the terrain sets the top and the quay the bottom
    const top = groundH(940, 100), bot = Math.max(WATER_Y + 1.5, Math.min(groundH(978, 112), groundH(955, 138)));
    const drop = top - bot, perStep = drop / 119; // 90 steps on each upper flight, then 29 on each lower one
    let k = 0; const g = new THREE.Group();
    const flightTop = i => top - [0, 25, 50, 75, 0, 25, 50, 75, 90, 105, 90, 105][i] * perStep;
    STAIRS.forEach(([ax, az, bx, bz, cnt], i) => {
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L, y0 = flightTop(i), d = L / cnt, W = 2.6;
      q.setFromAxisAngle(up, Math.atan2(dx, dz));
      for (let s = 0; s < cnt; s++) {
        const y = y0 - s * perStep, h = Math.max(0.3, y - (bot - 2)), cxs = ax + dx * (s + 0.5) * d, czs = az + dz * (s + 0.5) * d;
        m4.compose(new THREE.Vector3(cxs, y - h / 2, czs), q, new THREE.Vector3(W, h, d + 0.02)); steps.setMatrixAt(k++, m4);
      }
      const yEnd = y0 - cnt * perStep, slope = Math.atan2(y0 - yEnd, L);
      for (const side of [-1, 1]) { // parapet and handrail along the flight
        const ox = -dz * side * (W / 2 + 0.2), oz = dx * side * (W / 2 + 0.2), mx = (ax + bx) / 2 + ox, mz = (az + bz) / 2 + oz, my = (y0 + yEnd) / 2;
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, L / Math.cos(slope) + 0.4), wallM); w.position.set(mx, my + 0.2, mz); w.rotation.set(0, Math.atan2(dx, dz), 0, 'YXZ'); w.rotateX(slope); w.castShadow = w.receiveShadow = true; g.add(w);
        const cp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, L / Math.cos(slope) + 0.5), capM); cp.position.set(mx, my + 0.76, mz); cp.rotation.set(0, Math.atan2(dx, dz), 0, 'YXZ'); cp.rotateX(slope); g.add(cp); // coping stone
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, L / Math.cos(slope), 6), rail); r.position.set(mx - ox * 0.5, my + 1.0, mz - oz * 0.5); r.rotation.set(0, Math.atan2(dx, dz), 0, 'YXZ'); r.rotateX(Math.PI / 2 + slope); g.add(r);
      }
    });
    steps.count = k; steps.castShadow = steps.receiveShadow = true; g.add(steps);
    // (15 nov., the user found the stairs unconvincing) landings between the flights, the terrace where the two upper
    // flights meet and the side flights start, all on a solid stone base down to the quay, so it reads as one monument
    const W2 = 2.6, slab = (x0, z0, x1, z1, y, wid, m = stepM, pad = 0.6) => { // a level slab from (x0, z0) to (x1, z1), top at y
      const L = Math.hypot(x1 - x0, z1 - z0) || 0.01, h = Math.max(0.4, y - (bot - 2));
      const o = new THREE.Mesh(new THREE.BoxGeometry(wid, h, L + pad), m); o.position.set((x0 + x1) / 2, y - h / 2, (z0 + z1) / 2); o.rotation.y = Math.atan2(x1 - x0, z1 - z0);
      o.castShadow = o.receiveShadow = true; g.add(o); return o;
    };
    const flightEnd = i => flightTop(i) - STAIRS[i][4] * perStep;
    for (const chain of [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9], [10, 11]]) for (let j = 0; j + 1 < chain.length; j++) {
      const a = STAIRS[chain[j]], b = STAIRS[chain[j + 1]]; slab(a[2], a[3], b[0], b[1], flightEnd(chain[j]), W2);
    }
    for (let i = 0; i < 4; i++) { // the strip between the two upper flights: one wide stair instead of two separate ones
      const a = STAIRS[i], b = STAIRS[i + 4], y0 = flightTop(i), y1 = flightEnd(i), mx = (a[0] + a[2] + b[0] + b[2]) / 4, mz = (a[1] + a[3] + b[1] + b[3]) / 4;
      const L = Math.hypot(a[2] - a[0], a[3] - a[1]), dx = (a[2] - a[0]) / L, dz = (a[3] - a[1]) / L, slope = Math.atan2(y0 - y1, L);
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, L / Math.cos(slope) + 0.6), wallM); c.position.set(mx, (y0 + y1) / 2 + 0.2, mz); c.rotation.set(0, Math.atan2(dx, dz), 0, 'YXZ'); c.rotateX(slope); c.castShadow = true; g.add(c);
      const cp = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, L / Math.cos(slope) + 0.7), capM); cp.position.set(mx, (y0 + y1) / 2 + 0.81, mz); cp.rotation.set(0, Math.atan2(dx, dz), 0, 'YXZ'); cp.rotateX(slope); g.add(cp);
    }
    { // terrace at the foot of the upper flights, from which the four side flights leave
      const ux = 0.733, uz = 0.68, vx = -uz, vz = ux, pts = [STAIRS[3].slice(2, 4), STAIRS[7].slice(2, 4), STAIRS[8].slice(0, 2), STAIRS[10].slice(0, 2)];
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (const [x, z] of pts) { const u = x * ux + z * uz, v = x * vx + z * vz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      u0 -= 0.3; u1 += 1.6; v0 -= 1.6; v1 += 1.6; const um = (u0 + u1) / 2, y = flightEnd(3);
      const p = (u, v) => [u * ux + v * vx, u * uz + v * vz];
      const [ax, az] = p(um, v0), [bx, bz] = p(um, v1); slab(ax, az, bx, bz, y, u1 - u0, stepM, 0);
      const [fx, fz] = p(u1 + 0.2, v0), [gx2, gz] = p(u1 + 0.2, v1); slab(fx, fz, gx2, gz, y + 0.95, 0.4, stepM, 0); // parapet on the Loire side, the face of the terrace below it
      const cp = slab(fx, fz, gx2, gz, y + 1.07, 0.55, capM, 0.1); cp.scale.y = 0.12 / cp.geometry.parameters.height; cp.position.y = y + 1.01;
    }
    { // (15 nov.) collision: cars went through the foot of the stairs. Walls around every flight and the terrace
      const box4 = (x0, z0, x1, z1, wid) => { const L = Math.hypot(x1 - x0, z1 - z0) || 1, ux = (x1 - x0) / L, uz = (z1 - z0) / L, h = wid / 2, P = [[x0 - uz * h, z0 + ux * h], [x1 - uz * h, z1 + ux * h], [x1 + uz * h, z1 - ux * h], [x0 + uz * h, z0 - ux * h]];
        for (let q = 0; q < 4; q++) gridAdd([...P[q], ...P[(q + 1) % 4]], 3.5); };
      for (const f of STAIRS) box4(f[0], f[1], f[2], f[3], 3.4);
      const ux = 0.733, uz = 0.68, pts = [STAIRS[3].slice(2, 4), STAIRS[7].slice(2, 4), STAIRS[8].slice(0, 2), STAIRS[10].slice(0, 2)];
      const mx = pts.reduce((a, p) => a + p[0], 0) / 4, mz = pts.reduce((a, p) => a + p[1], 0) / 4;
      box4(mx - ux * 2.5, mz - uz * 2.5, mx + ux * 3, mz + uz * 3, 11); // the terrace (as built above, give or take)
    }
    // the statue of Sainte-Anne (Amédée Ménard, 1871) on its column at the top, looking over the Loire
    const sx = 939.6, sz = 99.5, sy = groundH(sx, sz), white = stdM(0xe6dfd0, 0.7), lamp = stdM(0x1c1d22, 0.5, 0.7);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(2.6, 1.2, 2.6), wallM, sx, sy + 0.6, sz); add(new THREE.CylinderGeometry(0.75, 0.9, 5.5, 12), white, sx, sy + 3.95, sz);
    add(new THREE.BoxGeometry(1.8, 0.5, 1.8), white, sx, sy + 6.95, sz);
    const fig = new THREE.Group(); fig.position.set(sx, sy + 7.2, sz); fig.rotation.y = Math.atan2(0.74, 0.67); g.add(fig);
    const f = (geo, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, white); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; fig.add(o); };
    f(new THREE.CylinderGeometry(0.35, 0.75, 2.3, 14), 0, 1.15, 0); f(new THREE.SphereGeometry(0.3, 12, 10), 0, 2.55, 0); f(new THREE.ConeGeometry(0.42, 0.7, 12), 0, 2.75, -0.04);
    f(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 8), 0.35, 1.7, 0.25, -0.9); f(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 10), 0.25, 1.35, 0.4); f(new THREE.SphereGeometry(0.15, 10, 8), 0.25, 1.85, 0.4); // the child Mary at her side
    f(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 8), -0.45, 2.1, 0.35, -1.9); // arm raised towards the river
    for (const [lx, lz] of [[sx - 2.5, sz + 2.5], [sx + 2.5, sz - 2.5]]) { add(new THREE.CylinderGeometry(0.08, 0.12, 4, 8), lamp, lx, sy + 2, lz); const gl = add(new THREE.SphereGeometry(0.28, 10, 8), stdM(0xfff2cc, 0.3, 0, { emissive: new THREE.Color(1, 0.8, 0.5), emissiveIntensity: 0 }), lx, sy + 4.2, lz); (LM.stLamps = LM.stLamps || []).push(gl.material); }
    gridAdd([sx - 1.3, sz - 1.3, sx + 1.3, sz + 1.3], 0); gridAdd([sx + 1.3, sz - 1.3, sx - 1.3, sz + 1.3], 0);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.stairs = g;
  }
  // quays: a stone wall along the Loire, traced on the terrain (marching squares on the height grid)
  function quays() {
    const D = DEM, lvl = (WATER_Y + 1.0) * 10, H = (i, j) => D.h[Math.max(0, Math.min(D.nz - 1, j)) * D.nx + Math.max(0, Math.min(D.nx - 1, i))];
    const segs = [];
    for (let j = 0; j < D.nz - 1; j++) for (let i = 0; i < D.nx - 1; i++) {
      const v = [H(i, j), H(i + 1, j), H(i + 1, j + 1), H(i, j + 1)], P_ = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], pts = [];
      for (let e = 0; e < 4; e++) { const a = v[e], b2 = v[(e + 1) % 4]; if ((a < lvl) !== (b2 < lvl)) { const t = (lvl - a) / (b2 - a), [ai, aj] = P_[e], [bi, bj] = P_[(e + 1) % 4]; pts.push([D.x0 + (ai + (bi - ai) * t) * D.step, D.z0 + (aj + (bj - aj) * t) * D.step]); } }
      if (pts.length === 2) segs.push([...pts[0], ...pts[1]]); else if (pts.length === 4) { segs.push([...pts[0], ...pts[1]]); segs.push([...pts[2], ...pts[3]]); }
    }
    if (!segs.length) return;
    const st = stoneTex(512, 256, 8, '#9a9184'); const wallM = stdM(0xffffff, 0.9, 0, { map: st }), copeM = stdM(0xb8b0a2, 0.75);
    const pos = [], uv = [], cpos = [], bollards = [];
    let acc = 0;
    for (const [ax, az, bx, bz] of segs) {
      const L = Math.hypot(bx - ax, bz - az); if (L < 0.01) continue;
      const yt = Math.max(groundH(ax, az), groundH(bx, bz), WATER_Y + 1.3) + 0.15, yb = WATER_Y - 2.5;
      pos.push(ax, yb, az, bx, yb, bz, bx, yt, bz, ax, yb, az, bx, yt, bz, ax, yt, az);
      uv.push(acc / 6, 0, (acc + L) / 6, 0, (acc + L) / 6, (yt - yb) / 3, acc / 6, 0, (acc + L) / 6, (yt - yb) / 3, acc / 6, (yt - yb) / 3);
      const nx = -(bz - az) / L * 0.35, nz = (bx - ax) / L * 0.35;
      cpos.push(ax - nx, yt, az - nz, bx - nx, yt, bz - nz, bx + nx, yt, bz + nz, ax - nx, yt, az - nz, bx + nx, yt, bz + nz, ax + nx, yt, az + nz);
      acc += L; if (acc % 22 < L && Math.abs(ax - CX) < HX + 140) bollards.push([ax, az, yt]);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const wall = new THREE.Mesh(geo, wallM); wall.material.side = THREE.DoubleSide; wall.receiveShadow = true;
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); cg.computeVertexNormals();
    const cope = new THREE.Mesh(cg, copeM); cope.material.side = THREE.DoubleSide; cope.receiveShadow = true;
    const bm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.24, 0.6, 10).translate(0, 0.3, 0), stdM(0x1c1c20, 0.5, 0.6), bollards.length);
    const m4 = new THREE.Matrix4(); bollards.forEach(([x, z, y], i) => { m4.makeTranslation(x, y, z); bm.setMatrixAt(i, m4); }); bm.castShadow = true;
    const g = new THREE.Group(); g.add(wall, cope, bm); hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g);
    LM.quay = segs;
    // a moored barge and the yellow Titan crane at the far end of the quays, towards the Île de Nantes
    let east = null; for (const sg of segs) if (sg[1] > 480 && (!east || sg[0] > east[0])) east = sg;
    let mid = null; for (const sg of segs) if (sg[1] > 520 && Math.abs(sg[0] - 250) < (mid ? Math.abs(mid[0] - 250) : 1e9)) mid = sg;
    if (mid) barge(mid); titan(); titan(1218, 366, 0x8d949a, Math.PI / 2 + 0.25, 'titanGrise');
  }
  function barge(sg) {
    const [ax, az, bx, bz] = sg, L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L;
    let nx = -uz, nz = ux; if (groundH(ax + nx * 8, az + nz * 8) > groundH(ax - nx * 8, az - nz * 8)) { nx = -nx; nz = -nz; } // towards the water
    const g = new THREE.Group(), hull = stdM(0x1f2a36, 0.6, 0.2), red = stdM(0x8a1d1d, 0.6), cream = stdM(0xe8e2d0, 0.6);
    const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    add(new THREE.BoxGeometry(5.2, 1.6, 30), hull, 0, 0.2, 0); add(new THREE.BoxGeometry(5.3, 0.25, 30.1), red, 0, 1.05, 0);
    add(new THREE.BoxGeometry(3.8, 2.4, 5), cream, 0, 2.2, 11); add(new THREE.BoxGeometry(4, 0.2, 5.4), red, 0, 3.5, 11);
    add(new THREE.BoxGeometry(3.6, 0.7, 18), stdM(0x3a3020, 0.8), 0, 1.4, -3);
    g.position.set(ax + nx * 6, WATER_Y - 0.1, az + nz * 6); g.rotation.y = Math.atan2(ux, uz);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.barge = g;
  }
  // The two Titan cranes of the île de Nantes, where OpenStreetMap puts them: the yellow one (1954) on the quay facing the
  // quai de la Fosse, the grey one (1966) at the western tip, by the Hangar à Bananes, where the ferry lands.
  function titan(x = 1528, z = -288, paint = 0xf2b705, turn = 0.4, key = 'titan') {
    const yel = stdM(paint, 0.45, 0.35), dark = stdM(0x2a2a2e, 0.6, 0.5), g = new THREE.Group();
    const add = (geo, m, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
    // portal legs with cross-bracing
    for (const lx of [-5, 5]) for (const lz of [-5, 5]) add(new THREE.BoxGeometry(0.8, 26, 0.8), yel, lx, 13, lz);
    for (const y of [6, 13, 20, 26]) { add(new THREE.BoxGeometry(11, 0.6, 0.6), yel, 0, y, -5); add(new THREE.BoxGeometry(11, 0.6, 0.6), yel, 0, y, 5); add(new THREE.BoxGeometry(0.6, 0.6, 11), yel, -5, y, 0); add(new THREE.BoxGeometry(0.6, 0.6, 11), yel, 5, y, 0); }
    for (const y of [3, 10, 17]) { add(new THREE.BoxGeometry(0.35, 9.5, 0.35), yel, 0, y + 3.5, -5, 0, 0, 0.9); add(new THREE.BoxGeometry(0.35, 9.5, 0.35), yel, 0, y + 3.5, 5, 0, 0, -0.9); }
    add(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 20), dark, 0, 27, 0);
    const up = modelMesh('grue_peinte', paint !== 0xf2b705); // the downloaded crane for the upper works: the yellow one as it is, the other one greyed
    if (up) { const K = 4.6, sz = up.geometry.userData.size; up.scale.setScalar(K); up.rotation.y = -Math.PI / 2; up.position.set(0, 27.6 + (sz[1] / 2 - 1.3) * K, -(sz[0] / 2 - 0.82) * K); g.add(up); // the pedestal stands on the slewing ring (the hook and the ladders hang lower)
      add(new THREE.BoxGeometry(1.2, 1.2, 16), yel, 0, 36, 11); add(new THREE.BoxGeometry(4.5, 4, 5), dark, 0, 34, 18); } // counter-jib and counterweight of a Titan
    else {
    add(new THREE.BoxGeometry(7, 6, 7), yel, 0, 31, 0);                                  // machinery house
    add(new THREE.BoxGeometry(2.6, 2.4, 2.4), stdM(0x9ab0c0, 0.1, 0.2), 4.6, 30, 0);     // cabin
    add(new THREE.BoxGeometry(4, 12, 4), yel, 0, 40, 0);                                 // A-frame mast
    add(new THREE.BoxGeometry(1.4, 1.6, 62), yel, 0, 34.5, -24);                         // the boom over the water
    add(new THREE.BoxGeometry(1.2, 1.2, 18), yel, 0, 35, 14);                            // counter-jib
    add(new THREE.BoxGeometry(4.5, 4, 5), dark, 0, 33, 21);                              // counterweight
    add(new THREE.CylinderGeometry(0.05, 0.05, 46, 4), dark, 0, 40, -18, 1.2, 0, 0); add(new THREE.CylinderGeometry(0.05, 0.05, 22, 4), dark, 0, 40, 10, -1.0, 0, 0);
    add(new THREE.CylinderGeometry(0.04, 0.04, 20, 4), dark, 0, 24, -52); add(new THREE.BoxGeometry(1.2, 1.4, 1.2), dark, 0, 14, -52);
    }
    const redL = LM.titanLights || (LM.titanLights = new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.3, 0.2) }));
    for (const p of [[0, 46.2, 0], [0, 35.6, -55], [0, 35.6, 22]]) add(new THREE.SphereGeometry(0.35, 8, 6), redL, ...p);
    g.position.set(x, Math.max(groundH(x, z), WATER_Y + 1.2), z); g.rotation.y = turn; g.scale.setScalar(1.15);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM[key] = g;
    for (const [lx, lz] of [[-5, -5], [5, -5], [5, 5], [-5, 5]]) { const c = Math.cos(turn), s = Math.sin(turn), px = x + (lx * c + lz * s) * 1.15, pz = z + (-lx * s + lz * c) * 1.15; gridAdd([px - 0.5, pz, px + 0.5, pz], 3.5); gridAdd([px, pz - 0.5, px, pz + 0.5], 3.5); } // the legs stop a car, one drives under the portal
  }
  // the Misery quarry: the granite cliff face of the old quarry, just east of the district
  function misery() {
    const x = HX + 75, z0 = 180, z1 = 380, g = new THREE.Group();
    const [c, cg] = canvas(512, 256); cg.fillStyle = '#7d7468'; cg.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 900; i++) { const l = 80 + Math.random() * 90; cg.fillStyle = `rgba(${l},${l - 6},${l - 14},.5)`; const w = 6 + Math.random() * 40; cg.fillRect(Math.random() * 512, Math.random() * 256, w, 2 + Math.random() * 10); }
    for (let i = 0; i < 40; i++) { cg.strokeStyle = 'rgba(30,26,22,.55)'; cg.lineWidth = 1 + Math.random() * 2; cg.beginPath(); const sx = Math.random() * 512; cg.moveTo(sx, 0); cg.lineTo(sx + (Math.random() - 0.5) * 60, 256); cg.stroke(); }
    for (let i = 0; i < 160; i++) { cg.fillStyle = `rgba(${40 + Math.random() * 40},${80 + Math.random() * 50},${30},.6)`; cg.beginPath(); cg.arc(Math.random() * 512, Math.random() < 0.6 ? Math.random() * 40 : Math.random() * 256, 3 + Math.random() * 9, 0, 6.283); cg.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.repeat.set(3, 1);
    const n = 40, geo = new THREE.PlaneGeometry(z1 - z0, 30, n, 8), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i); p.setZ(i, Math.sin(u * 0.13) * 3 + Math.sin(u * 0.41 + v * 0.3) * 1.6 + (Math.random() - 0.5) * 1.2 + (v + 15) * 0.25); }
    geo.computeVertexNormals();
    const face = new THREE.Mesh(geo, stdM(0xffffff, 0.95, 0, { map: t })); face.rotation.y = -Math.PI / 2; face.position.set(x, groundH(x - 30, (z0 + z1) / 2) + 14, (z0 + z1) / 2); face.receiveShadow = face.castShadow = true;
    g.add(face);
    // the top of the cliff: trees
    const crown = new THREE.InstancedMesh(hd.crownGeo(), stdM(0x3c6a2a, 0.9), 26), m4 = new THREE.Matrix4();
    for (let i = 0; i < 26; i++) { const zz = z0 + Math.random() * (z1 - z0); m4.compose(new THREE.Vector3(x + 4 + Math.random() * 14, face.position.y + 15 + Math.random() * 2, zz), new THREE.Quaternion(), new THREE.Vector3().setScalar(1.4 + Math.random())); crown.setMatrixAt(i, m4); }
    g.add(crown);
    hd.linearize(g); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g); LM.misery = g;
  }
