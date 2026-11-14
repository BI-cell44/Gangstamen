  // ---------- cars: lofted bodies ----------
  const CARS = {
    saloon: {
      yb: [[-2.27, 0.93], [-2.15, 0.99], [-1.32, 1.03], [0.92, 1.01], [1.95, 0.89], [2.2, 0.8], [2.27, 0.77]],
      hc: [[-1.5, 0], [-1.32, 0.02], [-0.72, 0.42], [0.32, 0.44], [0.94, 0.02], [1.1, 0]],
      wb: [[-2.27, 0.8], [-2.12, 0.85], [-1.0, 0.87], [1.0, 0.87], [1.9, 0.85], [2.15, 0.82], [2.27, 0.77]],
      y0: [[-2.27, 0.3], [-2.12, 0.22], [-1.9, 0.2], [1.9, 0.2], [2.12, 0.22], [2.27, 0.3]],
      glass: [-1.22, 0.86], pillar: [[-0.27, -0.19]], ramps: [[-1.32, -0.72], [0.32, 0.94]], doors: [0.9, -0.23, -1.25],
    },
    hatch: {
      yb: [[-1.97, 0.95], [-1.88, 1.0], [-1.7, 1.04], [0.72, 1.0], [1.75, 0.86], [1.94, 0.78], [2.0, 0.75]],
      hc: [[-1.97, 0], [-1.88, 0.03], [-1.62, 0.42], [0.12, 0.46], [0.74, 0.02], [0.9, 0]],
      wb: [[-1.97, 0.79], [-1.85, 0.83], [-0.9, 0.85], [0.9, 0.85], [1.65, 0.83], [1.9, 0.8], [2.0, 0.75]],
      y0: [[-1.97, 0.3], [-1.84, 0.22], [-1.65, 0.2], [1.7, 0.2], [1.86, 0.22], [2.0, 0.3]],
      glass: [-1.6, 0.66], pillar: [[-0.66, -0.58]], ramps: [[-1.88, -1.62], [0.12, 0.74]], doors: [0.7, -0.62],
    },
    r5: { // Renault 5: upright tailgate, short sloping bonnet
      yb: [[-1.76, 0.95], [-1.7, 0.99], [-1.5, 1.0], [0.6, 0.97], [1.5, 0.84], [1.72, 0.76], [1.76, 0.72]],
      hc: [[-1.72, 0], [-1.66, 0.04], [-1.5, 0.44], [0.05, 0.47], [0.62, 0.02], [0.78, 0]],
      wb: [[-1.76, 0.71], [-1.66, 0.75], [-0.8, 0.765], [0.8, 0.765], [1.5, 0.74], [1.7, 0.71], [1.76, 0.67]],
      y0: [[-1.76, 0.3], [-1.62, 0.22], [-1.45, 0.2], [1.45, 0.2], [1.62, 0.22], [1.76, 0.3]],
      glass: [-1.45, 0.58], pillar: [[-0.55, -0.45]], ramps: [[-1.66, -1.5], [0.05, 0.62]], doors: [0.6, -0.5],
    },
    p205: { // Peugeot 205: raked hatch, low nose
      yb: [[-1.85, 0.92], [-1.78, 0.97], [-1.55, 1.0], [0.65, 0.96], [1.6, 0.82], [1.8, 0.73], [1.85, 0.69]],
      hc: [[-1.8, 0], [-1.72, 0.03], [-1.35, 0.42], [0.1, 0.45], [0.72, 0.02], [0.88, 0]],
      wb: [[-1.85, 0.73], [-1.72, 0.77], [-0.85, 0.785], [0.85, 0.785], [1.6, 0.76], [1.8, 0.73], [1.85, 0.69]],
      y0: [[-1.85, 0.3], [-1.7, 0.22], [-1.5, 0.2], [1.5, 0.2], [1.7, 0.22], [1.85, 0.3]],
      glass: [-1.35, 0.66], pillar: [[-0.5, -0.4]], ramps: [[-1.72, -1.35], [0.1, 0.72]], doors: [0.65, -0.48],
    },
    twingo: { // Renault Twingo (1993): one-box, tall rounded roof, stubby nose
      yb: [[-1.71, 0.95], [-1.65, 1.0], [-1.4, 1.02], [0.9, 0.98], [1.5, 0.86], [1.68, 0.78], [1.71, 0.74]],
      hc: [[-1.68, 0], [-1.6, 0.05], [-1.45, 0.6], [-0.2, 0.66], [0.3, 0.6], [1.2, 0.04], [1.35, 0]],
      wb: [[-1.71, 0.77], [-1.6, 0.8], [-0.8, 0.815], [0.8, 0.815], [1.5, 0.79], [1.66, 0.76], [1.71, 0.72]],
      y0: [[-1.71, 0.3], [-1.58, 0.22], [-1.4, 0.2], [1.4, 0.2], [1.58, 0.22], [1.71, 0.3]],
      glass: [-1.4, 0.8], pillar: [[-0.7, -0.6]], ramps: [[-1.6, -1.45], [0.3, 1.2]], doors: [0.75, -0.55],
    },
  };
  const kf = (pts, s) => { if (s <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (s <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * (s - a) / (b - a); } return pts[pts.length - 1][1]; };
  const NK = 13; // ring points per side, from the centre of the floor to the centre of the roof
  function sections(style, st) {
    const C = CARS[style], s0 = C.yb[0][0], s1 = C.yb[C.yb.length - 1][0], N = 110, S = [];
    for (let i = 0; i <= N; i++) { const s = s0 + (s1 - s0) * i / N; S.push({ s, yb: kf(C.yb, s), hc: Math.max(0.03, kf(C.hc, s)), wb: kf(C.wb, s) }); }
    for (let it = 0; it < 3; it++) for (const k of ['yb', 'hc', 'wb']) { const a = S.map(o => o[k]); for (let i = 1; i < N; i++) S[i][k] = (a[i - 1] + 2 * a[i] + a[i + 1]) / 4; }
    const R = st.wr + 0.085;
    for (const o of S) {
      const yB = kf(C.y0, o.s); let y0 = yB;
      for (const ax of [st.wb, -st.wb]) { const d = o.s - ax; if (Math.abs(d) < R) y0 = Math.max(y0, st.wr - 0.12 + Math.sqrt(R * R - d * d)); }
      o.y0 = y0;
      const H = o.yb - yB, wB = o.wb, wC = wB * 0.9 - 0.02, wR = wB * 0.74, top = o.yb + o.hc, up = (f, k) => Math.max(yB + H * f, y0 + 0.012 * k);
      o.ring = [[0, y0], [wB - 0.1, y0], [wB - 0.015, y0 + 0.045], [wB, up(0.42, 5)], [wB, up(0.6, 6)], [wB - 0.003, up(0.68, 7)], [wB - 0.02, o.yb - 0.035], [wB - 0.07, o.yb],
        [wC, o.yb + 0.008], [wR + 0.03, o.yb + o.hc * 0.93], [wR - 0.08, top], [0.17, top + 0.02], [0, top + 0.024]];
    }
    return { S, C, s0, s1 };
  }
  function shellGeo(style, st, paintC, stripeC) {
    const { S, C, s0, s1 } = sections(style, st), N = S.length, RN = 2 * NK - 2; // ring vertices (centre points shared)
    const pos = new Float32Array(N * RN * 3);
    S.forEach((o, i) => { for (let k = 0; k < RN; k++) { const r = k < NK ? o.ring[k] : o.ring[2 * NK - 2 - k], sx = k < NK ? 1 : -1, j = (i * RN + k) * 3; pos[j] = r[0] * sx; pos[j + 1] = r[1]; pos[j + 2] = -o.s; } });
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < RN; k++) { const a = i * RN + k, b = i * RN + (k + 1) % RN, c = a + RN, d = b + RN; idx.push(a, c, b, b, c, d); }
    const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g0.setIndex(idx); g0.computeVertexNormals();
    const nrm = g0.attributes.normal.array;
    // emit per-material triangle soups with smooth normals and per-quad colours
    const out = [[], [], [], []], outN = [[], [], [], []], outC = [];
    const inR = (s, r) => s >= r[0] && s <= r[1];
    for (let i = 0; i < N - 1; i++) {
      const sm = (S[i].s + S[i + 1].s) / 2, hc = (S[i].hc + S[i + 1].hc) / 2;
      const ramp = C.ramps.some(r => inR(sm, r)), sideGlass = inR(sm, C.glass) && hc > 0.1 && !C.pillar.some(r => inR(sm, r));
      const bumper = sm > s1 - 0.2 || sm < s0 + 0.2;
      for (let k = 0; k < RN; k++) {
        const kk = k < NK - 1 ? k : RN - 1 - k; // segment index on the right-hand ring (0..NK-2)
        let mat = 0, col = paintC;
        if (kk === 0) mat = 3; else if (kk === 1) mat = 2;
        else if (kk === 4 && stripeC && !bumper) col = stripeC;
        else if (kk === 8 && sideGlass) mat = 1;
        else if ((kk === 10 || kk === 11) && ramp && hc > 0.07) mat = 1;
        else if (kk === 11 && stripeC) col = stripeC;
        const a = i * RN + k, b = i * RN + (k + 1) % RN, c = a + RN, d = b + RN;
        for (const v of [a, c, b, b, c, d]) { out[mat].push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); outN[mat].push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]); if (mat === 0) outC.push(col.r, col.g, col.b); }
      }
    }
    // end caps (bumper faces)
    for (const [i, flip] of [[0, false], [N - 1, true]]) {
      const o = S[i], cy = (o.y0 + o.yb) / 2 + 0.03, cz = -o.s + (flip ? -0.02 : 0.02);
      for (let k = 0; k < RN; k++) {
        const a = (i * RN + k) * 3, b = (i * RN + (k + 1) % RN) * 3;
        const tri = flip ? [[0, cy, cz], [pos[b], pos[b + 1], pos[b + 2]], [pos[a], pos[a + 1], pos[a + 2]]] : [[0, cy, cz], [pos[a], pos[a + 1], pos[a + 2]], [pos[b], pos[b + 1], pos[b + 2]]];
        for (const p of tri) { out[0].push(...p); outN[0].push(0, 0.1, flip ? -1 : 1); outC.push(paintC.r, paintC.g, paintC.b); }
      }
    }
    const P_ = [], N_ = [], groups = []; let off = 0;
    for (let m = 0; m < 4; m++) { groups.push([off, out[m].length / 3, m]); off += out[m].length / 3; P_.push(...out[m]); N_.push(...outN[m]); }
    const colors = new Float32Array(P_.length).fill(1); colors.set(outC, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P_, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N_, 3)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    groups.forEach(([a, n, m]) => g.addGroup(a, n, m));
    g0.dispose();
    return { g, S, C, s0, s1 };
  }
  const shared = {};
  function sharedMats() {
    if (shared.glass) return shared;
    shared.glass = new THREE.MeshPhysicalMaterial({ color: lin(0x0b1218), roughness: 0.04, metalness: 0.85, envMapIntensity: 1.7, clearcoat: 1, clearcoatRoughness: 0.02 });
    shared.trim = new THREE.MeshStandardMaterial({ color: lin(0x1c1c20), roughness: 0.62, metalness: 0.1 });
    shared.under = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.95 });
    shared.rubber = new THREE.MeshStandardMaterial({ color: lin(0x121214), roughness: 0.88 });
    shared.chrome = new THREE.MeshStandardMaterial({ color: lin(0xe6e8ec), roughness: 0.12, metalness: 1, envMapIntensity: 1.4 });
    shared.alloy = new THREE.MeshStandardMaterial({ color: lin(0xb9bcc4), roughness: 0.28, metalness: 1 });
    shared.gold = new THREE.MeshStandardMaterial({ color: lin(0xd8a43c), roughness: 0.25, metalness: 1 });
    shared.gun = new THREE.MeshStandardMaterial({ color: lin(0x26272b), roughness: 0.38, metalness: 0.9 });
    shared.disc = new THREE.MeshStandardMaterial({ color: lin(0x55585e), roughness: 0.45, metalness: 0.9 });
    shared.ind = new THREE.MeshStandardMaterial({ color: lin(0xff8a14), emissive: lin(0xff7a10), emissiveIntensity: 0.5, roughness: 0.3 });
    shared.seam = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    Object.values(shared).forEach(m => { done.add(m); m.userData.shared = true; });
    return shared;
  }
  function wheelGeos(R) {
    const w = 0.215, pr = [[R * 0.6, -w / 2], [R * 0.9, -w / 2], [R * 0.985, -w / 2 + 0.022], [R, -w / 2 + 0.05], [R, w / 2 - 0.05], [R * 0.985, w / 2 - 0.022], [R * 0.9, w / 2], [R * 0.6, w / 2]].map(p => new THREE.Vector2(p[0], p[1]));
    const tyre = new THREE.LatheGeometry(pr, 28).rotateZ(Math.PI / 2);
    const barrel = new THREE.CylinderGeometry(R * 0.62, R * 0.62, w * 0.96, 28, 1, true).rotateZ(Math.PI / 2);
    const lip = new THREE.TorusGeometry(R * 0.615, 0.014, 6, 28).rotateY(Math.PI / 2);
    const spoke = new THREE.BoxGeometry(0.03, R * 0.6, 0.066).translate(0, R * 0.3, 0);
    const hub = new THREE.CylinderGeometry(R * 0.17, R * 0.2, 0.05, 14).rotateZ(Math.PI / 2);
    const disc = new THREE.CylinderGeometry(R * 0.52, R * 0.52, 0.03, 22).rotateZ(Math.PI / 2);
    for (const g of [tyre, barrel, lip, spoke, hub, disc]) g.userData.shared = true;
    return { tyre, barrel, lip, spoke, hub, disc, w };
  }
  const wheelCache = {};
  function makeCar(paint, stripe, isPlayer, styleName, opts = {}) {
    const style = styleName || (isPlayer ? 'saloon' : 'hatch'), st = CAR_STYLES[style], M = sharedMats();
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const paintC = lin(paint), stripeC = stripe ? lin(stripe) : null;
    const { g: shell, S, C, s0, s1 } = shellGeo(style, st, paintC, stripeC);
    const mPaint = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.36, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.95 });
    done.add(mPaint);
    const sm = new THREE.Mesh(shell, [mPaint, M.glass, M.trim, M.under]); sm.castShadow = true; body.add(sm);
    const shellPos0 = shell.attributes.position.array.slice(), shellNrm0 = shell.attributes.normal.array.slice();
    const add = (geo, m, x, y, z, cast = false) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; body.add(o); return o; };
    const box = (w, h, d, m, x, y, z) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
    const at = s => { let b = S[0]; for (const o of S) if (Math.abs(o.s - s) < Math.abs(b.s - s)) b = o; return b; };
    const W_ = st.W, hl = Math.max(-s0, s1);
    // floor pan and wheel-arch liners hide the hollow shell
    box(W_ - 0.36, 0.34, s1 - s0 - 0.5, M.under, 0, 0.45, -(s0 + s1) / 2);
    // lights: emissive lenses under clear covers
    const headM = new THREE.MeshStandardMaterial({ color: lin(0xfff4d6), emissive: lin(0xffe9b0), emissiveIntensity: 1.6, roughness: 0.2 });
    const tailM = new THREE.MeshStandardMaterial({ color: lin(0x8a0a0a), emissive: lin(0xff1408), emissiveIntensity: 0.7, roughness: 0.25 });
    done.add(headM); done.add(tailM);
    const fo = S[S.length - 1], ro = S[0], zf = -s1, zr = -s0;
    for (const sx of [-1, 1]) {
      box(0.36, 0.125, 0.07, headM, sx * (fo.wb - 0.25), fo.yb - 0.115, zf - 0.008);
      box(0.09, 0.115, 0.1, M.ind, sx * (fo.wb - 0.035), fo.yb - 0.12, zf + 0.01);
      box(0.4, 0.15, 0.07, tailM, sx * (ro.wb - 0.25), ro.yb - 0.135, zr + 0.008);
      box(0.09, 0.14, 0.1, M.ind, sx * (ro.wb - 0.035), ro.yb - 0.135, zr - 0.012);
      // mirrors
      const ms = C.ramps[1][1] - 0.1, mo = at(ms);
      box(0.17, 0.1, 0.09, M.trim, sx * (mo.wb + 0.04), mo.yb + 0.07, -ms);
      // door seams and handles follow the body surface
      for (const ds of C.doors) {
        const o = at(ds), pts = [];
        for (let k = 2; k <= 7; k++) pts.push(new THREE.Vector3(sx * (o.ring[k][0] + 0.004), o.ring[k][1], -ds + (o.ring[k][1] - o.y0) * 0.03));
        const sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.006, 4, false);
        body.add(new THREE.Mesh(sg, M.seam));
      }
      for (let d = 0; d < C.doors.length - 1; d++) { const hs = C.doors[d + 1] + 0.16, o = at(hs); box(0.02, 0.03, 0.15, M.trim, sx * (o.wb + 0.004), o.yb - 0.13, -hs); }
    }
    box(2 * (fo.wb - 0.44), 0.1, 0.05, M.under, 0, fo.yb - 0.115, zf - 0.004);            // grille
    box(2 * (fo.wb - 0.44), 0.014, 0.06, M.chrome, 0, fo.yb - 0.058, zf - 0.006);
    box(2 * (ro.wb - 0.46), 0.13, 0.05, M.trim, 0, ro.yb - 0.135, zr + 0.004);            // panel between the tail lights
    box(2 * fo.wb + 0.05, 0.17, 0.22, M.trim, 0, fo.y0 + 0.15, zf + 0.05);                // bumpers
    box(2 * ro.wb + 0.05, 0.17, 0.22, M.trim, 0, ro.y0 + 0.15, zr - 0.05);
    box(2 * fo.wb - 0.5, 0.07, 0.05, M.under, 0, fo.y0 + 0.02, zf + 0.02);                // air intake
    // plates
    const pn = (isPlayer ? '1996 GS 44' : (4100 + (plateNo++) * 37) + ' RB 44');
    const pf = add(new THREE.PlaneGeometry(0.5, 0.115), new THREE.MeshStandardMaterial({ map: plateTexture(pn, false), roughness: 0.5 }), 0, fo.y0 + 0.15, zf - 0.066); pf.rotation.y = Math.PI;
    const pb = add(new THREE.PlaneGeometry(0.5, 0.115), new THREE.MeshStandardMaterial({ map: plateTexture(pn, true), roughness: 0.5 }), 0, ro.y0 + 0.15, zr + 0.066);
    linMat(pf.material); linMat(pb.material);
    // exhaust, aerial, spoiler
    add(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 10).rotateX(Math.PI / 2), M.chrome, W_ / 2 - 0.36, 0.24, zr + 0.08);
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.75, 4), M.under, -W_ / 2 + 0.24, 1.38, -(s0 + 0.75));
    if (st.spoiler) { const o = at(C.ramps[0][1] - 0.05); const sp = new THREE.Mesh(new THREE.BoxGeometry(o.wb * 1.5, 0.035, 0.26), mPaint); sp.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(72).map((_, i) => [paintC.r, paintC.g, paintC.b][i % 3]), 3)); sp.position.set(0, o.yb + o.hc + 0.05, -(C.ramps[0][1] - 0.2)); body.add(sp); }
    // twin machine guns on the bonnet
    const go = at(C.ramps[1][1] + 0.5), muzzles = [];
    if (opts.police) { // light bar on the roof, POLICE on the doors
      const ro = at((C.ramps[0][1] + C.ramps[1][0]) / 2), top = ro.yb + ro.hc + 0.02;
      box(1.0, 0.07, 0.24, M.trim, 0, top + 0.035, -ro.s);
      const bl = new THREE.MeshStandardMaterial({ color: lin(0x0a2cff), emissive: lin(0x1a3cff), emissiveIntensity: 0.3, roughness: 0.2 }); done.add(bl);
      const br = new THREE.MeshStandardMaterial({ color: lin(0x0a2cff), emissive: lin(0x1a3cff), emissiveIntensity: 0.3, roughness: 0.2 }); done.add(br);
      box(0.4, 0.11, 0.22, bl, -0.27, top + 0.11, -ro.s); box(0.4, 0.11, 0.22, br, 0.27, top + 0.11, -ro.s);
      g.userData.siren = [bl, br];
      const [pc, pg] = canvas(256, 48); pg.fillStyle = '#ffffff'; pg.font = 'bold 40px Arial, sans-serif'; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.fillText('POLICE', 128, 26);
      const pt = new THREE.CanvasTexture(pc); pt.encoding = THREE.sRGBEncoding; done.add(pt);
      const dm = new THREE.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false, color: lin(0x1b2f8a) }); done.add(dm);
      for (const sx of [-1, 1]) { const o = at(0), pl = add(new THREE.PlaneGeometry(1.1, 0.2), dm, sx * (o.wb + 0.012), (o.y0 + o.yb) / 2 + 0.04, -o.s); pl.rotation.y = sx * Math.PI / 2; }
    }
    for (const sx of (opts.guns === false ? [] : [-0.4, 0.4])) {
      box(0.15, 0.11, 0.44, M.gun, sx, go.yb + 0.085, -(go.s));
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 10).rotateX(Math.PI / 2), M.gun, sx, go.yb + 0.1, -(go.s + 0.55), true);
      add(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 10).rotateX(Math.PI / 2), M.gun, sx, go.yb + 0.1, -(go.s + 0.92));
      const mz = new THREE.Object3D(); mz.position.set(sx, go.yb + 0.1, -(go.s + 0.99)); body.add(mz); muzzles.push(mz); // follows the body roll and pitch
    }
    // wheels
    const WG = wheelCache[st.wr] || (wheelCache[st.wr] = wheelGeos(st.wr));
    const wheels = [], steer = [], rimM = isPlayer ? M.gold : M.alloy;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * (W_ / 2 - 0.13), st.wr, sz * st.wb); g.add(pivot);
      const spin = new THREE.Group(); pivot.add(spin);
      const ty = new THREE.Mesh(WG.tyre, M.rubber); ty.castShadow = true; spin.add(ty);
      const br = new THREE.Mesh(WG.barrel, M.disc); br.material.side = THREE.DoubleSide; spin.add(br);
      const dc = new THREE.Mesh(WG.disc, M.disc); dc.position.x = sx * 0.02; spin.add(dc);
      const face = sx * (WG.w / 2 - 0.02);
      const lp = new THREE.Mesh(WG.lip, rimM); lp.position.x = face; spin.add(lp);
      const hb = new THREE.Mesh(WG.hub, rimM); hb.position.x = face; spin.add(hb);
      for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(WG.spoke, rimM); sp.position.x = face; sp.rotation.x = k * Math.PI * 2 / 5; spin.add(sp); }
      wheels.push(spin); if (sz < 0) steer.push(pivot);
    }
    if (isPlayer || opts.lights) {
      const spot = new THREE.SpotLight(0xffe9c0, 0, 95, 0.52, 0.6, 1.1);
      spot.color.convertSRGBToLinear(); spot.position.set(0, 0.85, -hl); spot.target.position.set(0, -0.6, -24);
      g.add(spot, spot.target); g.userData.spot = spot;
    }
    const noop = { emissive: { setHex() { } } };
    Object.assign(g.userData, { wheels, steer, mBody: mPaint, mPaint: { color: { setHex() { } } }, base: 0xffffff, paint, tail: noop, head: noop,
      tailM, headM, bodyG: body, muzzles, wb: st.wb, hw: W_ / 2 - 0.13, hl, hdLinear: true, shell, shellPos0, shellNrm0, s0, s1, dent: 0, flat: -1 });
    g.traverse(o => { o.userData.hdLinear = true; });
    scene.add(g);
    return g;
  }

  function world() { buildLamps(); linearize(scene); }
  // drop one quality level when the machine cannot hold ~25 images per second. Measured on the median frame of
  // 5 s windows (loading hitches and shader compiles are single long frames: they do not move the median), only
  // during play, after a 15 s grace period at every start, resume and quality change, and only after two slow windows
  // in a row. The player can switch it off (settings.autoQ).
  let pfLast = 0, pfT = 0, pfGrace = 0, pfSlow = 0, pfWasOn = false; const pfD = [];
  const stats = { fps: 0, ms: 0, worst: 0 };
  function perf(now) {
    if (!pfLast) { pfLast = now; return; }
    const d = now - pfLast; pfLast = now; if (d > 500) { pfD.length = 0; pfT = 0; return; } // tab was hidden
    const on = started && !paused && !(typeof Intro !== 'undefined' && Intro.state !== 'off');
    if (on && !pfWasOn) pfGrace = now + 15000; pfWasOn = on;
    pfD.push(d); pfT += d;
    if (pfT < 5000) return;
    const s = pfD.slice().sort((a, b) => a - b), med = s[s.length >> 1];
    stats.fps = Math.round(1000 / med); stats.ms = +med.toFixed(1); stats.worst = Math.round(s[s.length - 1]);
    pfD.length = 0; pfT = 0;
    if (!on || now < pfGrace || settings.autoQ === false) { pfSlow = 0; return; }
    pfSlow = stats.fps < 25 ? pfSlow + 1 : 0;
    if (pfSlow >= 2 && qi > 0) {
      setQuality(qi - 1); pfSlow = 0; pfGrace = now + 15000; settings.hdq = qi; saveSettings();
      feed('Qualité graphique réduite : ' + q.name + ' (réglable dans Son et options)');
      document.querySelectorAll('#hdSeg button').forEach(x => x.classList.toggle('on', +x.dataset.q === qi));
    }
  }
  addEventListener('resize', resize);
  return { QUAL, setQuality, perf, perfStats: stats, get quality() { return qi; }, render, frame, setTime, setTod, setRain, setDistance, amb, wetPatch, emit, smoke, spark, fire, flashAt, world, linearize, makeCar, fx, explode: explodeAt, muzzle, roadMat, waterMat, crownGeo, wallMat, wallSet, shopSet, townHall, groundMat, footMat, roofMat, shake, lin, linHex, get floatRT() { return floatRT; } };
})();
// <<< HD MODULE
