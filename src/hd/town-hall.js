  // ---------- the town hall of Chantenay (1903): brick and stone, tall first-floor windows with balustrades,
  // a columned porch under a balcony, a clock gable, a steep slate roof with dormers and tall chimneys ----------
  let clockMat = null;
  function mairieTextures(bays) {
    const S = bays * 256, SH = 1024, [c, g] = canvas(S, SH), [ce, ge] = canvas(S, SH), [ch, gh] = canvas(S, SH), [cr, gr] = canvas(S, SH), R = Math.random;
    ge.fillStyle = '#000'; ge.fillRect(0, 0, S, SH); gr.fillStyle = 'rgb(0,235,0)'; gr.fillRect(0, 0, S, SH);
    const H = (v, x, y, w, h) => { gh.fillStyle = `rgb(${v},${v},${v})`; gh.fillRect(x, y, w, h); };
    const stone = (x, y, w, h, hv, tone = 0) => { const v = Math.min(240, 212 + tone + (R() * 8 | 0)); g.fillStyle = `rgb(${v},${v - 14},${v - 40})`; g.fillRect(x, y, w, h); H(hv, x, y, w, h); g.fillStyle = 'rgba(70,55,35,.22)'; g.fillRect(x, y + h - 3, w, 3); g.fillRect(x + w - 2, y, 2, h); };
    // white limestone in courses of dressed blocks
    H(140, 0, 0, S, SH);
    for (let y = 0, row = 0; y < SH; y += 34, row++) {
      for (let x = (row % 2) * -40; x < S; x += 80) { const v = R(); g.fillStyle = `rgb(${232 + v * 14 | 0},${228 + v * 13 | 0},${216 + v * 12 | 0})`; g.fillRect(x, y, 79, 33); }
      g.fillStyle = 'rgba(120,112,98,.45)'; g.fillRect(0, y + 33, S, 1); H(118, 0, y + 33, S, 1);
      for (let x = (row % 2) * -40; x < S; x += 80) { g.fillStyle = 'rgba(120,112,98,.4)'; g.fillRect(x + 79, y, 1, 33); H(118, x + 79, y, 1, 33); }
    }
    for (let i = 0; i < 30 * S / 256; i++) { const x = R() * S, y = R() * SH; const lg = g.createLinearGradient(0, y, 0, y + 160); lg.addColorStop(0, 'rgba(90,85,75,.08)'); lg.addColorStop(1, 'rgba(90,85,75,0)'); g.fillStyle = lg; g.fillRect(x, y, 6 + R() * 20, 160); } // weathering streaks
    for (let b = 0; b < bays; b++) {
      const x0 = b * 256, win = bays > 1;
      // rusticated stone pilasters on both sides of the bay
      for (const px of [x0, x0 + 234]) for (let y = 0; y < SH; y += 34) { const wide = (y / 34 | 0) % 2; stone(px + (px === x0 ? 0 : wide ? -10 : 0), y, 22 + (wide ? 10 : 0), 32, 176, 18); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px - 10, y + 31, 42, 3); }
      // granite plinth, string course between the floors, entablature with dentils under the eaves
      for (let x = x0; x < x0 + 256; x += 64) { g.fillStyle = `rgb(${140 + R() * 14 | 0},${136 + R() * 12 | 0},${130 + R() * 12 | 0})`; g.fillRect(x, SH - 84, 63, 84); } H(182, x0, SH - 84, 256, 84);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x0, SH - 86, 256, 3);
      stone(x0, 500, 256, 26, 215, 8); g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect(x0, 526, 256, 5);
      stone(x0, 0, 256, 46, 205, 8); for (let x = x0 + 4; x < x0 + 256; x += 16) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 30, 8, 12); } g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x0, 46, 256, 5);
      if (!win) continue;
      // first floor: tall small-paned window in a stone frame with a cornice, above a balustrade
      const wx = x0 + 78, wy = 122, ww = 100, wh = 292;
      stone(wx - 18, wy - 16, ww + 36, wh + 30, 172, 4); stone(wx - 30, wy - 40, ww + 60, 24, 205, 10); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(wx - 30, wy - 16, ww + 60, 4);
      stone(wx + ww / 2 - 11, wy - 30, 22, 30, 215, 14); // keystone
      let lg = g.createLinearGradient(0, wy, 0, wy + wh); lg.addColorStop(0, '#8fa5bd'); lg.addColorStop(0.45, '#4a5d73'); lg.addColorStop(1, '#232f3c'); g.fillStyle = lg; g.fillRect(wx, wy, ww, wh);
      H(70, wx, wy, ww, wh); gr.fillStyle = 'rgb(0,24,165)'; gr.fillRect(wx, wy, ww, wh);
      if (R() < 0.6) { const le = ge.createLinearGradient(0, wy, 0, wy + wh); le.addColorStop(0, '#ffdc98'); le.addColorStop(1, '#c58c3c'); ge.fillStyle = le; ge.fillRect(wx, wy, ww, wh); }
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(wx, wy, ww, 8); g.fillRect(wx, wy, 5, wh);
      g.fillStyle = '#f1efe8'; g.fillRect(wx + ww / 2 - 3, wy, 6, wh); for (let k = 1; k < 5; k++) g.fillRect(wx, wy + wh * k / 5 - 1, ww, 3); g.strokeStyle = '#f1efe8'; g.lineWidth = 5; g.strokeRect(wx + 2, wy + 2, ww - 4, wh - 4);
      ge.fillStyle = '#000'; ge.fillRect(wx + ww / 2 - 3, wy, 6, wh); for (let k = 1; k < 5; k++) ge.fillRect(wx, wy + wh * k / 5 - 1, ww, 3);
      const by = wy + wh + 14; // balustrade
      stone(wx - 34, by, ww + 68, 12, 222, 10); stone(wx - 34, by + 58, ww + 68, 14, 222, 6);
      g.fillStyle = '#3a2f2a'; g.fillRect(wx - 28, by + 12, ww + 56, 46); H(96, wx - 28, by + 12, ww + 56, 46);
      for (let x = wx - 24; x < wx + ww + 24; x += 15) { stone(x, by + 12, 9, 46, 205, 6); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x + 7, by + 12, 2, 46); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(wx - 34, by + 72, ww + 68, 5);
      // ground floor: window in a stone frame, most with the white blinds down
      const gx = x0 + 80, gyy = 628, gw = 96, ghh = 236;
      stone(gx - 16, gyy - 14, gw + 32, ghh + 28, 172, 2); stone(gx + gw / 2 - 10, gyy - 26, 20, 26, 212, 12);
      lg = g.createLinearGradient(0, gyy, 0, gyy + ghh); lg.addColorStop(0, '#7f95ab'); lg.addColorStop(0.5, '#42546a'); lg.addColorStop(1, '#1e2833'); g.fillStyle = lg; g.fillRect(gx, gyy, gw, ghh);
      H(70, gx, gyy, gw, ghh); gr.fillStyle = 'rgb(0,24,165)'; gr.fillRect(gx, gyy, gw, ghh);
      if (R() < 0.5) { const le = ge.createLinearGradient(0, gyy, 0, gyy + ghh); le.addColorStop(0, '#ffdc98'); le.addColorStop(1, '#c58c3c'); ge.fillStyle = le; ge.fillRect(gx, gyy, gw, ghh); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(gx, gyy, 5, ghh);
      g.fillStyle = '#f1efe8'; g.fillRect(gx + gw / 2 - 3, gyy, 6, ghh); for (let k = 1; k < 4; k++) g.fillRect(gx, gyy + ghh * k / 4 - 1, gw, 3); g.strokeStyle = '#f1efe8'; g.lineWidth = 5; g.strokeRect(gx + 2, gyy + 2, gw - 4, ghh - 4);
      ge.fillStyle = '#000'; ge.fillRect(gx + gw / 2 - 3, gyy, 6, ghh); for (let k = 1; k < 4; k++) ge.fillRect(gx, gyy + ghh * k / 4 - 1, gw, 3);
      g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(gx, gyy, gw, 7);
      stone(gx - 22, gyy + ghh + 14, gw + 44, 12, 215, 10); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(gx - 22, gyy + ghh + 26, gw + 44, 5);
    }
    const im = g.getImageData(0, 0, S, SH), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
    const S2 = S / 2, SH2 = SH / 2, half = cv => { const [c2, g2] = canvas(S2, SH2); g2.drawImage(cv, 0, 0, S2, SH2); return c2; };
    const hb = half(ch).getContext('2d').getImageData(0, 0, S2, SH2).data, hf = new Float32Array(S2 * SH2); for (let i = 0; i < S2 * SH2; i++) hf[i] = hb[i * 4] / 255 * 6;
    const mk = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }, rm = mk(half(cr));
    return new THREE.MeshStandardMaterial({ map: mk(c), emissive: 0xffffff, emissiveMap: mk(half(ce)), emissiveIntensity: 0, normalMap: heightToNormal(hf, S2, 1, SH2), normalScale: new THREE.Vector2(1, 1), roughness: 1, metalness: 1, roughnessMap: rm, metalnessMap: rm, envMapIntensity: 0.9 });
  }
  function townHall(b, base, y0, sa) {
    const p = b.p, n = p.length / 2, gy = base + 0.3, top = gy + 9.6, WH = 9.6;
    const main = new Buf(), plain = new Buf(), st = new Buf(), roof = new Buf();
    const cStone = col('#ddd0b4'), cGran = col('#8f8a84'), cBrick = col('#d8d2c2'), cDark = col('#141a22'), cWood = col('#3a2416'), cPink = col('#b08a7c');
    // oriented box: along t (centre cx,cz, half length hl), from depth d0 to d1 along nrm, between ya and yb
    const obox = (bf, cx, cz, tx, tz, hl, nx, nz, d0, d1, ya, yb, c) => {
      const P = (a, d, y) => [cx + tx * a + nx * d, y, cz + tz * a + nz * d];
      const q = (A, B, C, D, nn) => { bf.tri(A, B, C, nn, null, null, null, c); bf.tri(A, C, D, nn, null, null, null, c); };
      q(P(-hl, d1, ya), P(hl, d1, ya), P(hl, d1, yb), P(-hl, d1, yb), [nx, 0, nz]); q(P(-hl, d0, ya), P(hl, d0, ya), P(hl, d0, yb), P(-hl, d0, yb), [-nx, 0, -nz]);
      q(P(hl, d0, ya), P(hl, d1, ya), P(hl, d1, yb), P(hl, d0, yb), [tx, 0, tz]); q(P(-hl, d0, ya), P(-hl, d1, ya), P(-hl, d1, yb), P(-hl, d0, yb), [-tx, 0, -tz]);
      q(P(-hl, d0, yb), P(hl, d0, yb), P(hl, d1, yb), P(-hl, d1, yb), [0, 1, 0]); q(P(-hl, d0, ya), P(hl, d0, ya), P(hl, d1, ya), P(-hl, d1, ya), [0, -1, 0]);
    };
    const prism = (cx, cz, r, ya, yb, c, sides = 12) => { for (let k = 0; k < sides; k++) { const a0 = k / sides * 6.2832, a1 = (k + 1) / sides * 6.2832, am = (a0 + a1) / 2; const A = [cx + Math.cos(a0) * r, ya, cz + Math.sin(a0) * r], B = [cx + Math.cos(a1) * r, ya, cz + Math.sin(a1) * r], C = [B[0], yb, B[2]], D = [A[0], yb, A[2]], nn = [Math.cos(am), 0, Math.sin(am)]; st.tri(A, B, C, nn, null, null, null, c); st.tri(A, C, D, nn, null, null, null, c); } };
    const wq = (bf, ax, az, bx, bz, ya, yb, ua, ub, va, vb, nn) => { const a0 = [ax, ya, az], b0 = [bx, ya, bz], b1 = [bx, yb, bz], a1 = [ax, yb, az]; bf.tri(a0, b0, b1, nn, [ua, va], [ub, va], [ub, vb]); bf.tri(a0, b1, a1, nn, [ua, va], [ub, vb], [ua, vb]); };
    // gable roof on a little stone house: used for the dormers and the clock gable
    const pediment = (cx, cz, tx, tz, hl, nx, nz, d0, d1, ya, rise, c) => {
      const P = (a, d, y) => [cx + tx * a + nx * d, y, cz + tz * a + nz * d];
      st.tri(P(-hl, d1, ya), P(hl, d1, ya), P(0, d1, ya + rise), [nx, 0, nz], null, null, null, c); st.tri(P(-hl, d0, ya), P(hl, d0, ya), P(0, d0, ya + rise), [-nx, 0, -nz], null, null, null, c);
      for (const sg of [-1, 1]) { const l = Math.hypot(rise, hl), nn = [tx * sg * rise / l, hl / l, tz * sg * rise / l]; st.tri(P(sg * hl, d0, ya), P(sg * hl, d1, ya), P(0, d1, ya + rise), nn, null, null, null, cDarkSlate); st.tri(P(sg * hl, d0, ya), P(0, d1, ya + rise), P(0, d0, ya + rise), nn, null, null, null, cDarkSlate); }
    };
    const cDarkSlate = col('#39424e');
    // the main front is the longest straight run of wall: its middle carries the porch and the clock
    let fc = null, fl = 0;
    const E = [];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * j], bz = p[2 * j + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); E.push({ ax, az, bx, bz, L, tx: dx / L, tz: dz / L, nx: (sa > 0 ? dz : -dz) / L, nz: (sa > 0 ? -dx : dx) / L }); }
    for (let i = 0; i < n; i++) { // merge collinear neighbours
      const a = E[i], c2 = E[(i + 1) % n], straight = a.tx * c2.tx + a.tz * c2.tz > 0.995, len = a.L + (straight ? c2.L : 0);
      if (len > fl) { fl = len; const mid = len / 2; fc = { x: a.ax + a.tx * mid, z: a.az + a.tz * mid, tx: a.tx, tz: a.tz, nx: a.nx, nz: a.nz, len }; }
    }
    const nearCentre = (x, z, r) => Math.hypot(x - fc.x, z - fc.z) < r && (fc.nx * (x - fc.x) + fc.nz * (z - fc.z)) > -1;
    for (const e of E) {
      const nn = [e.nx, 0, e.nz], mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
      if (gy > y0) wq(plain, e.ax, e.az, e.bx, e.bz, y0, gy, 0, e.L / 3.9, 0, 0.08, nn);
      const nb = Math.round(e.L / 3.9);
      if (e.L >= 3 && nb >= 1) wq(main, e.ax, e.az, e.bx, e.bz, gy, top, 0, nb / 4, 0, 1, nn); else wq(plain, e.ax, e.az, e.bx, e.bz, gy, top, 0, Math.max(0.5, e.L / 3.9), 0, 1, nn);
      obox(st, mx, mz, e.tx, e.tz, e.L / 2 + 0.1, e.nx, e.nz, -0.05, 0.12, gy - 0.4, gy + 0.85, cGran);   // plinth
      obox(st, mx, mz, e.tx, e.tz, e.L / 2 + 0.16, e.nx, e.nz, -0.05, 0.18, gy + 4.62, gy + 4.9, cStone);  // string course
      obox(st, mx, mz, e.tx, e.tz, e.L / 2 + 0.4, e.nx, e.nz, -0.05, 0.42, top - 0.28, top + 0.15, cStone); // eaves cornice
      if (e.L > 8) for (let k = 0; k < nb; k++) { // stone dormers in the slate roof, one above each bay
        const a = (k + 0.5) * e.L / nb, x = e.ax + e.tx * a, z = e.az + e.tz * a; if (nearCentre(x, z, 3.4)) continue;
        obox(st, x, z, e.tx, e.tz, 0.78, e.nx, e.nz, -1.5, -0.3, top + 0.15, top + 2.05, cStone);
        obox(st, x, z, e.tx, e.tz, 0.46, e.nx, e.nz, -0.31, -0.27, top + 0.45, top + 1.8, cDark);
        pediment(x, z, e.tx, e.tz, 0.92, e.nx, e.nz, -1.6, -0.2, top + 2.05, 0.6, cStone);
      }
    }
    // slate mansard roof
    const eave = top + 0.15, rise = 4.2;
    const inner = insetPoly(p, 2.4, sa) || insetPoly(p, 1.5, sa);
    if (inner) {
      const nq = inner.length / 2, rc = col('#46505e');
      for (let i = 0; i < nq; i++) {
        const j = (i + 1) % nq, A = [p[2 * i], eave, p[2 * i + 1]], B = [p[2 * j], eave, p[2 * j + 1]], C = [inner[2 * j], eave + rise, inner[2 * j + 1]], D = [inner[2 * i], eave + rise, inner[2 * i + 1]];
        const e1 = [B[0] - A[0], 0, B[2] - A[2]], e2 = [D[0] - A[0], rise, D[2] - A[2]]; let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
        const l = Math.hypot(nx, ny, nz) || 1; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        roof.tri(A, B, C, [nx / l, ny / l, nz / l], null, null, null, rc); roof.tri(A, C, D, [nx / l, ny / l, nz / l], null, null, null, rc);
      }
      const [, tr] = triangulate(inner);
      for (const [a, b2, c2] of tr) roof.tri([inner[2 * a], eave + rise, inner[2 * a + 1]], [inner[2 * b2], eave + rise, inner[2 * b2 + 1]], [inner[2 * c2], eave + rise, inner[2 * c2 + 1]], [0, 1, 0], null, null, null, rc);
    } else { const [, tr] = triangulate(p); for (const [a, b2, c2] of tr) roof.tri([p[2 * a], eave, p[2 * a + 1]], [p[2 * b2], eave, p[2 * b2 + 1]], [p[2 * c2], eave, p[2 * c2 + 1]], [0, 1, 0], null, null, null, col('#46505e')); }
    // ---- centre of the main front
    const { x: cx, z: cz, tx, tz, nx, nz } = fc, F = (a, d) => [cx + tx * a + nx * d, cz + tz * a + nz * d];
    {
      // projecting bay: plain brick and stone below, one tall window above
      const [lx, lz] = F(-2.6, 0.5), [rx, rz] = F(2.6, 0.5), nn = [nx, 0, nz];
      wq(plain, lx, lz, rx, rz, gy, gy + 4.8, 0, 1, 0, 0.5, nn); wq(main, lx, lz, rx, rz, gy + 4.8, top, 0, 0.25, 0.5, 1, nn);
      for (const sg of [-1, 1]) { const [qx, qz] = F(sg * 2.6, 0), [fx2, fz2] = F(sg * 2.6, 0.5); wq(plain, qx, qz, fx2, fz2, gy, top, 0, 0.12, 0, 1, [tx * sg, 0, tz * sg]); }
      obox(st, cx, cz, tx, tz, 3.0, nx, nz, 0.4, 0.95, top - 0.28, top + 0.15, cStone);
      // doorway
      obox(st, cx, cz, tx, tz, 1.5, nx, nz, 0.5, 0.56, gy, gy + 3.75, cStone); obox(st, cx, cz, tx, tz, 1.15, nx, nz, 0.56, 0.6, gy + 0.25, gy + 3.4, cWood);
      obox(st, cx, cz, tx, tz, 0.03, nx, nz, 0.6, 0.62, gy + 0.25, gy + 3.4, cDark);
      // porch: steps, four pink granite columns, entablature, balcony parapet
      obox(st, cx, cz, tx, tz, 3.6, nx, nz, 0.5, 3.7, gy - 0.5, gy + 0.08, cGran); obox(st, cx, cz, tx, tz, 3.2, nx, nz, 0.5, 3.3, gy - 0.5, gy + 0.25, cStone);
      for (const a of [-2.6, -1.0, 1.0, 2.6]) { const [x, z] = F(a, 2.85); prism(x, z, 0.26, gy + 0.45, gy + 3.7, cPink); obox(st, x, z, tx, tz, 0.3, nx, nz, -0.3, 0.3, gy + 0.25, gy + 0.45, cStone); obox(st, x, z, tx, tz, 0.3, nx, nz, -0.3, 0.3, gy + 3.7, gy + 3.9, cStone); }
      obox(st, cx, cz, tx, tz, 3.1, nx, nz, 0.5, 3.25, gy + 3.9, gy + 4.5, cStone);
      obox(st, cx, cz, tx, tz, 3.2, nx, nz, 3.2, 3.35, gy + 4.5, gy + 5.4, cStone);
      for (const sg of [-1, 1]) { const [x, z] = F(sg * 3.12, 1.9); obox(st, x, z, nx, nz, 1.4, tx * sg, tz * sg, -0.08, 0.08, gy + 4.5, gy + 5.4, cStone); }
      // clock gable above the cornice, flag on top
      obox(st, cx, cz, tx, tz, 2.1, nx, nz, -1.0, 0.7, top + 0.15, top + 3.2, cStone);
      obox(st, cx, cz, tx, tz, 2.35, nx, nz, -1.05, 0.82, top + 3.2, top + 3.45, cStone);
      pediment(cx, cz, tx, tz, 2.35, nx, nz, -1.05, 0.82, top + 3.45, 1.25, cStone);
      const [px, pz] = F(0, -0.1); prism(px, pz, 0.045, top + 4.7, top + 8.2, cGran, 6);
      const fl2 = (a0, a1, c) => { const A = [px + tx * a0, top + 7.1, pz + tz * a0], B = [px + tx * a1, top + 7.1, pz + tz * a1], C = [B[0], top + 8.1, B[2]], D = [A[0], top + 8.1, A[2]]; for (const nn of [[nx, 0, nz], [-nx, 0, -nz]]) { st.tri(A, B, C, nn, null, null, null, c); st.tri(A, C, D, nn, null, null, null, c); } };
      fl2(0.05, 0.55, col('#1f3a93')); fl2(0.55, 1.05, col('#f2f2f2')); fl2(1.05, 1.55, col('#d02a2a'));
      // clock face and carved name
      const [cc, cg] = canvas(256, 256); cg.fillStyle = '#e9e4d6'; cg.fillRect(0, 0, 256, 256); cg.fillStyle = '#f4efe2'; cg.beginPath(); cg.arc(128, 128, 112, 0, 6.2832); cg.fill(); cg.strokeStyle = '#2a2622'; cg.lineWidth = 9; cg.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832; cg.lineWidth = k % 3 ? 4 : 9; cg.beginPath(); cg.moveTo(128 + Math.sin(a) * 84, 128 - Math.cos(a) * 84); cg.lineTo(128 + Math.sin(a) * 102, 128 - Math.cos(a) * 102); cg.stroke(); }
      cg.lineCap = 'round'; cg.lineWidth = 10; cg.beginPath(); cg.moveTo(128, 128); cg.lineTo(128 - 50, 128 - 34); cg.stroke(); cg.lineWidth = 6; cg.beginPath(); cg.moveTo(128, 128); cg.lineTo(128 + 62, 128 - 60); cg.stroke();
      const ct = new THREE.CanvasTexture(cc); clockMat = new THREE.MeshStandardMaterial({ map: ct, emissive: 0xffe9b8, emissiveMap: ct, emissiveIntensity: 0, roughness: 0.6 });
      const ck = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), clockMat); const [kx, kz] = F(0, 0.72); ck.position.set(kx, top + 1.75, kz); ck.rotation.y = Math.atan2(nx, nz); scene.add(ck);
      const [sc, sg2] = canvas(512, 64); sg2.fillStyle = '#e9e4d6'; sg2.fillRect(0, 0, 512, 64); sg2.fillStyle = '#4a3f33'; sg2.font = 'bold 44px Georgia, "Times New Roman", serif'; sg2.textAlign = 'center'; sg2.textBaseline = 'middle'; sg2.fillText('M A I R I E', 256, 34);
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.5), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(sc) })); const [sx, sz] = F(0, 3.27); sm.position.set(sx, gy + 4.2, sz); sm.rotation.y = Math.atan2(nx, nz); scene.add(sm);
    }
    // tall brick chimneys with stone caps
    for (const [a, d] of [[-fc.len * 0.3, -3.4], [fc.len * 0.3, -3.4], [-fc.len * 0.3, -9.5], [fc.len * 0.3, -9.5]]) { const [x, z] = F(a, d); obox(st, x, z, tx, tz, 0.6, nx, nz, -0.4, 0.4, top + 2, top + 6.4, cBrick); obox(st, x, z, tx, tz, 0.7, nx, nz, -0.5, 0.5, top + 6.4, top + 6.65, cStone); }
    const add = (bf, m) => { if (!bf.p.length) return; const o = new THREE.Mesh(bf.geo(), m); o.castShadow = o.receiveShadow = true; scene.add(o); };
    const mm = mairieTextures(4), pm = mairieTextures(1);
    add(main, mm); add(plain, pm); add(st, new THREE.MeshLambertMaterial({ vertexColors: true })); add(roof, roofMat());
    wallMats.push(mm, pm);
  }
  function crownGeo() { // a fuller, lumpy tree crown with darker undersides
    const g = new THREE.IcosahedronGeometry(2.6, 2), p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const n = v.clone().normalize();
      const d = 1 + 0.2 * Math.sin(n.x * 5.1 + n.y * 3.3) * Math.cos(n.z * 4.7 + n.y * 2.1) + 0.12 * Math.sin(n.x * 11 + n.z * 9 + n.y * 7);
      v.multiplyScalar(d); if (v.y < -1.2) v.y = -1.2 - (v.y + 1.2) * -0.25;
      p.setXYZ(i, v.x, v.y, v.z);
      const s = 0.55 + 0.45 * Math.max(0, n.y * 0.5 + 0.5) + (d - 1) * 0.8; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.max(0.3, Math.min(1.15, s));
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const nr = g.attributes.normal; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); nr.setXYZ(i, v.x, v.y, v.z); }
    return g;
  }
  // is the straight line between two points free of walls? (low obstacles such as tree trunks do not stop the light)
  function wallFree(ax0, az0, bx0, bz0) {
    const dx = bx0 - ax0, dz = bz0 - az0, L = Math.hypot(dx, dz) || 1e-6, ux = dx / L, uz = dz / L, seen = new Set();
    for (let s = 0; s <= L; s += CELL * 0.5) {
      const segs = cellOf(ax0 + ux * s, az0 + uz * s); if (!segs) continue;
      for (const sg of segs) {
        if (sg.length > 4 || seen.has(sg)) continue; seen.add(sg);
        const [ax, az, bx, bz] = sg, ex = bx - ax, ez = bz - az, den = ux * ez - uz * ex; if (Math.abs(den) < 1e-9) continue;
        const t = ((ax - ax0) * ez - (az - az0) * ex) / den, u = ((ax - ax0) * uz - (az - az0) * ux) / den;
        if (t > 0 && t < L - 0.3 && u >= 0 && u <= 1) return false;
      }
    }
    return true;
  }
  function buildLamps() { // sodium street lamps along the wider streets; lit at night
    const pts = [];
    let alt = 0;
    for (const r of W.roads) {
      if (!r.d || r.b || r.w < 6) continue;
      const p = r.p; let acc = 20;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1], l = Math.hypot(dx, dz); if (l < 0.01) continue;
        let t = 36 - acc;
        while (t < l) {
          const side = (alt++ % 2) ? 1 : -1, ux = dx / l, uz = dz / l, off = r.w / 2 + 1.5;
          const x = p[i] + ux * t - uz * off * side, z = p[i + 1] + uz * t + ux * off * side;
          if (Math.abs(x - CX) < HX - 5 && Math.abs(z - CZ) < HZ - 5 && groundH(x, z) > WATER_Y + 1 && roadEdge(x, z)[0] > 0.8 && !buildingPolys.some(b => pointInPoly(x, z, b.p || b))) pts.push([x, z, Math.atan2(-(-uz * -side), -(ux * -side))]);
          t += 36;
        }
        acc = (acc + l) % 36;
      }
    }
    const n = pts.length; if (!n) return;
    const poleG = new THREE.CylinderGeometry(0.07, 0.1, 7, 6).translate(0, 3.5, 0);
    const armG = new THREE.BoxGeometry(0.08, 0.08, 1.6).translate(0, 7, -0.75);
    const headG = new THREE.BoxGeometry(0.28, 0.1, 0.6).translate(0, 6.95, -1.5);
    const metal = new THREE.MeshStandardMaterial({ color: lin(0x3c4046), roughness: 0.6, metalness: 0.6 });
    const poles = new THREE.InstancedMesh(poleG, metal, n), arms = new THREE.InstancedMesh(armG, metal, n);
    lampBulbs = new THREE.InstancedMesh(headG, new THREE.MeshBasicMaterial({ color: 0x444444, fog: false }), n);
    const poolTex = glowTexture();
    // pools of light on the ground: one mesh that follows the relief (a flat square used to float over slopes and kerbs and
    // to be cut by the ground), and stops at the walls (a vertex the lamp cannot see through a wall gets no light)
    const PN = 8, pp = new Float32Array(n * (PN + 1) * (PN + 1) * 3), pu = new Float32Array(n * (PN + 1) * (PN + 1) * 2), pc = new Float32Array(n * (PN + 1) * (PN + 1) * 3), pidx = [];
    pts.forEach(([x, z, a], li) => {
      const hx = x - Math.sin(a) * 1.5, hz = z - Math.cos(a) * 1.5, base = li * (PN + 1) * (PN + 1);
      for (let j = 0; j <= PN; j++) for (let i = 0; i <= PN; i++) {
        const k = base + j * (PN + 1) + i, vx = hx + (i / PN - 0.5) * 20, vz = hz + (j / PN - 0.5) * 20, d = Math.hypot(vx - hx, vz - hz);
        const seen = d < 7 || wallFree(hx, hz, vx, vz); // near the lamp always lit (a coarse test would cut the pool into wedges)
        pp[k * 3] = vx; pp[k * 3 + 1] = surfaceH(vx, vz) + 0.37; /* just above the road (ROAD_Y.drive 0.32) */ pp[k * 3 + 2] = vz; pu[k * 2] = i / PN; pu[k * 2 + 1] = j / PN;
        const lit = seen ? 1 : 0; pc[k * 3] = pc[k * 3 + 1] = pc[k * 3 + 2] = lit;
      }
      for (let j = 0; j < PN; j++) for (let i = 0; i < PN; i++) { const k = base + j * (PN + 1) + i; pidx.push(k, k + PN + 1, k + 1, k + 1, k + PN + 1, k + PN + 2); }
    });
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('uv', new THREE.BufferAttribute(pu, 2)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3)); pg.setIndex(pidx); pg.computeBoundingSphere();
    lampPools = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(0.75, 0.36, 0.1), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    lampGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(1.6, 0.85, 0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }), n);
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
    pts.forEach(([x, z, a], i) => {
      const gy = surfaceH(x, z) + 0.2;
      qt.setFromEuler(e.set(0, a, 0)); m4.compose(v.set(x, gy, z), qt, s.set(1, 1, 1));
      poles.setMatrixAt(i, m4); arms.setMatrixAt(i, m4); lampBulbs.setMatrixAt(i, m4);
      const hx = x - Math.sin(a) * 1.5, hz = z - Math.cos(a) * 1.5;
      qt.setFromEuler(e.set(-Math.PI / 2, 0, 0)); m4.compose(v.set(hx, gy + 6.86, hz), qt, s.set(2.6, 2.6, 2.6)); lampGlow.setMatrixAt(i, m4);
      gridAdd([x - 0.12, z, x + 0.12, z, 6.5], 3.5); gridAdd([x, z - 0.12, x, z + 0.12, 6.5], 3.5); // lamp post: 6.5 m high
    });
    { // reflections of the lamps stretched towards the viewer on the wet road: a long soft streak under each lamp
      const [sc, sg] = canvas(32, 128), lg = sg.createLinearGradient(0, 0, 0, 128);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      sg.fillStyle = lg; sg.fillRect(0, 0, 32, 128); const sx = sg.createLinearGradient(0, 0, 32, 0); sx.addColorStop(0, 'rgba(0,0,0,1)'); sx.addColorStop(0.5, 'rgba(0,0,0,0)'); sx.addColorStop(1, 'rgba(0,0,0,1)');
      sg.globalCompositeOperation = 'destination-out'; sg.fillStyle = sx; sg.fillRect(0, 0, 32, 128);
      lampStreaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), color: new THREE.Color(1.3, 0.62, 0.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }), n);
      lampStreaks.userData.pts = pts.map(([x, z, a]) => [x - Math.sin(a) * 1.5, z - Math.cos(a) * 1.5]);
      lampStreaks.visible = false; lampStreaks.renderOrder = 4; lampStreaks.userData.hdLinear = true; lampStreaks.frustumCulled = false; scene.add(lampStreaks);
    }
    poles.castShadow = true; lampPools.renderOrder = 3; lampPools.userData.noTile = true; // time-weather.js holds on to it (visible, opacity) lampGlow.renderOrder = 22;
    for (const o of [poles, arms, lampBulbs, lampPools, lampGlow]) { o.userData.hdLinear = true; o.frustumCulled = false; scene.add(o); }
  }

