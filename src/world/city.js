// ---------- city ----------
const KIND_STYLE = [0, 1, 2, 3, 4, 1, 5];
const WALL_TINTS = [
  ['#f1e8d6', '#e9dcc4', '#f4eee4', '#ddd0b6', '#ead2c2', '#e3dccd', '#d8c8a8'],
  ['#cfc9bf', '#bdb7ae', '#d9d1c3', '#c2b9a6', '#b3aca6'],
  ['#9a948c', '#94a0a6', '#a88d73', '#80898f', '#a39c8e'],
  ['#b9ad99', '#a89b86', '#c4b8a4'],
  ['#b86a4c', '#a8604a', '#c07a58'],
  ['#ddd3c3', '#e6d9c2'],
  ['#d4cab4', '#cbbfa6'],
];
const ROOF_TINTS = ['#4a5263', '#6c6964', '#7b8187', '#6b5b4b', '#58484a', '#6c6964', '#3f4655'];
BOOT.mark('moteur et modules');
const facadeTex = HD ? [] : FACADES.map(facade);
const HDW = HD ? hd.wallSet(FACADES) : null; // HD: every style in a few variants, upper floors and street level
const wallMats = HD ? [].concat(...HDW.upper, ...HDW.ground) : facadeTex.map(([t, te]) => new THREE.MeshLambertMaterial({ map: t, vertexColors: true, emissive: 0xffffff, emissiveMap: te, emissiveIntensity: 0 }));
const roofMat = HD ? hd.roofMat() : new THREE.MeshLambertMaterial({ vertexColors: true });
BOOT.mark('textures de façades');
const shopSet = HD && W.shops ? hd.shopSet(W.shops) : null; // HD: the real shops of the district (OpenStreetMap)
BOOT.mark('enseignes des commerces');
if (shopSet) wallMats.push(shopSet.mat); // lit like the windows at night
const HINTS = new Map(); if (W.hints) for (const [bi, bay] of W.hints) HINTS.set(bi, bay); // window spacing measured in street photos
// each real shop goes on the nearest wall long enough to hold it: "building:edge" -> [{s0, s1, si}]
function assignShops() {
  const by = new Map(); if (!shopSet) return by;
  W.shops.slice(0, 64).forEach((sh, si) => {
    let best = null, bd = 30;
    W.buildings.forEach((b, bi) => {
      const p = b.p, n = p.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ax = p[2 * i], az = p[2 * i + 1], dx = p[2 * j] - ax, dz = p[2 * j + 1] - az, L = Math.hypot(dx, dz);
        if (L < 3.4) continue;
        const t = Math.max(0, Math.min(1, ((sh.x - ax) * dx + (sh.z - az) * dz) / (L * L))), d = Math.hypot(sh.x - ax - dx * t, sh.z - az - dz * t);
        if (d < bd) { bd = d; best = [bi + ':' + i, t * L, L]; }
      }
    });
    if (!best) return;
    let a = by.get(best[0]); if (!a) by.set(best[0], a = []);
    a.push({ c: best[1], L: best[2], w: Math.min(best[2] - 0.3, sh.k === 'market' ? 12 : 7.5), si });
  });
  for (const [k, a] of by) {
    a.sort((u, v) => u.c - v.c); let prev = 0.15; const out = [];
    for (const o of a) { const s0 = Math.max(prev, Math.min(o.c - o.w / 2, o.L - 0.15 - o.w)), s1 = Math.min(o.L - 0.1, s0 + o.w); if (s1 - s0 < 2.6) continue; out.push({ s0, s1, si: o.si }); prev = s1 + 0.25; }
    by.set(k, out);
  }
  return by;
}
// inward offset of a footprint, for mansard-style roofs; null when the shape does not allow it
function insetPoly(p, d, sa) {
  const n = p.length / 2, q = [], sg = sa > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = (i + n - 1) % n, b = (i + 1) % n;
    let e1x = p[2 * i] - p[2 * a], e1z = p[2 * i + 1] - p[2 * a + 1], e2x = p[2 * b] - p[2 * i], e2z = p[2 * b + 1] - p[2 * i + 1];
    const l1 = Math.hypot(e1x, e1z), l2 = Math.hypot(e2x, e2z); if (l1 < 0.05 || l2 < 0.05) return null;
    e1x /= l1; e1z /= l1; e2x /= l2; e2z /= l2;
    const n1x = -e1z * sg, n1z = e1x * sg, n2x = -e2z * sg, n2z = e2x * sg; // inward normals
    let mx = n1x + n2x, mz = n1z + n2z; const ml = Math.hypot(mx, mz); if (ml < 0.2) return null;
    mx /= ml; mz /= ml;
    const k = d / Math.max(0.35, mx * n1x + mz * n1z); if (k > d * 2.6) return null;
    const x = p[2 * i] + mx * k, z = p[2 * i + 1] + mz * k;
    if (!pointInPoly(x, z, p)) return null;
    q.push(x, z);
  }
  const a0 = signedArea(p), a1 = signedArea(q);
  if (a0 * a1 <= 0 || Math.abs(a1) < Math.abs(a0) * 0.18) return null;
  for (let i = 0; i < n; i++) { // edges must keep their direction
    const j = (i + 1) % n;
    if ((p[2 * j] - p[2 * i]) * (q[2 * j] - q[2 * i]) + (p[2 * j + 1] - p[2 * i + 1]) * (q[2 * j + 1] - q[2 * i + 1]) <= 0) return null;
  }
  return q;
}
function boxBuf(bf, cx, cz, w, d, y0, y1, c) {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const q = (A, B, C, D, nn) => { bf.tri(A, B, C, nn, null, null, null, c); bf.tri(A, C, D, nn, null, null, null, c); };
  q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]); q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
  q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]); q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
  q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
}
// Real facades: Panoramax 360° photos reprojected onto the building faces (Bd de la Liberté, rue de la Marseillaise)
const PHOTO = new Map();
const PHOTO_TINT = new Map(); // wall colour measured in the street photos, for buildings drawn without their photo
if (W.photos && W.photos.bt) for (const [bi, r, g, b] of W.photos.bt) PHOTO_TINT.set(bi, [r, g, b]);
const photoMats = [];
if (!HD && W.photos && window.PHOTO_ATLAS) {
  const loader = new THREE.TextureLoader();
  W.photos.atlas.forEach((sz, k) => {
    const tx = loader.load(window.PHOTO_ATLAS[k]);
    tx.anisotropy = 8; tx.magFilter = THREE.LinearFilter;
    // keep the photo's own colours (emissive share) and give the masonry some relief (bump from the photo)
    photoMats.push(new THREE.MeshPhongMaterial({ map: tx, emissive: 0x6b6b6b, emissiveMap: tx, bumpMap: tx, bumpScale: 0.045, specular: 0x111111, shininess: 6 }));
  });
  W.photos.ch.forEach(([f, u0, u1, at, x, y, w, h]) => {
    const [bi, e, yb, yt] = W.photos.fac[f];
    const key = bi + ':' + e;
    let o = PHOTO.get(key); if (!o) PHOTO.set(key, o = { yb, yt, ch: [] });
    o.ch.push({ u0, u1, at, x, y, w, h });
  });
}
const buildingPolys = [];
const landmarks = [];

function buildCity() {
  const walls = FACADES.map(() => new Buf()), roofs = new Buf(), photoBufs = photoMats.map(() => new Buf());
  const UB = HD ? HDW.upper.map(a => a.map(() => new Buf())) : [], GB = HD ? HDW.ground.map(a => a.map(() => new Buf())) : [];
  const shopBuf = new Buf(), shopsAt = HD ? assignShops() : new Map(), extras = new Buf(), cBrick = col('#8a4a38'), cStone = col('#b9b1a3');
  // HD: the wings attached to the town hall are clad in blue metal
  const civicWing = new Set();
  if (HD) for (const m of W.buildings) if (/^Mairie/.test(m.n || '')) W.buildings.forEach((o, oi) => {
    if (o === m) return; let sharedPts = 0;
    for (let i = 0; i < o.p.length; i += 2) for (let j = 0; j < m.p.length; j += 2) if (Math.hypot(o.p[i] - m.p[j], o.p[i + 1] - m.p[j + 1]) < 0.3) sharedPts++;
    if (sharedPts >= 2) civicWing.add(oi);
  });
  W.buildings.forEach((b, bi) => {
    const p = b.p, n = p.length / 2, kind = civicWing.has(bi) ? 2 : b.k;
    const style = civicWing.has(bi) ? 2 : KIND_STYLE[kind] ?? 0;
    const tints = WALL_TINTS[kind] || WALL_TINTS[0];
    const pt = PHOTO_TINT.get(bi);
    const tint = civicWing.has(bi) ? col('#4d7299') : pt ? pt.map(v => Math.max(0.3, Math.min(1, v * 1.08))) : shade(col(tints[(hash(bi) * tints.length) | 0]), 0.92 + hash(bi + 7) * 0.12);
    const sa = signedArea(p);
    // sit the building on the IGN terrain: walls start below the lowest ground point
    let gmin = 1e9, cxx = 0, czz = 0;
    for (let i = 0; i < n; i++) { gmin = Math.min(gmin, groundH(p[2 * i], p[2 * i + 1])); cxx += p[2 * i]; czz += p[2 * i + 1]; }
    const base = b.b != null ? b.b : groundH(cxx / n, czz / n);
    const y0 = Math.min(gmin, base) - 0.6;
    if (HD && /^Mairie/.test(b.n || '')) { // the town hall has its own model
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; gridAdd([p[2 * i], p[2 * i + 1], p[2 * j], p[2 * j + 1]], 3.5); }
      buildingPolys.push(b); hd.townHall(b, base, y0, sa);
      return;
    }
    if (HD && b.n === 'Église Sainte-Anne') { // modelled in the game layer (nave, transept, apse, bell tower and spire)
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; gridAdd([p[2 * i], p[2 * i + 1], p[2 * j], p[2 * j + 1]], 3.5); }
      buildingPolys.push(b); landmarks.push({ k: 'stAnne', b, base, y0, name: b.n, x: cxx / n, z: czz / n });
      return;
    }
    const riseIn = b.r != null ? b.r : (kind === 0 ? 2.4 : 0);
    const pitched = n === 4 && Math.abs(sa) < 600 && riseIn > 0.8 && kind !== 2;
    // HD: other houses get a mansard-style roof (footprint offset inwards) when the shape allows it
    const insD = Math.max(1.2, Math.min(3.4, Math.sqrt(Math.abs(sa)) * 0.2));
    const inner = HD && !pitched && riseIn > 0.8 && kind !== 2 && n <= 14 && Math.abs(sa) < 1800 ? insetPoly(p, insD, sa) : null;
    const h = Math.max(y0 + 2.5, base + b.h + (pitched || inner ? 0 : riseIn * 0.45));
    const nVar = HD ? HDW.upper[style].length : 1, vr = (hash(bi + 17) * nVar) | 0;
    const bayW = Math.max(2.4, Math.min(4.6, HINTS.get(bi) || (style === 1 ? 3.4 + hash(bi + 23) * 0.8 : style === 0 || style === 4 ? 2.8 + hash(bi + 23) * 1.1 : 4)));
    let acc = hash(bi + 3) * 16;
    const eaveC = shade(col(ROOF_TINTS[kind] || ROOF_TINTS[0]), 0.62);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * j], bz = p[2 * j + 1];
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const nrm = sa > 0 ? [dz / L, 0, -dx / L] : [-dz / L, 0, dx / L];
      const u0 = acc / 16, u1 = (acc + L) / 16, v0 = 0, v1 = (h - y0) / 12.8;
      const A0 = [ax, y0, az], B0 = [bx, y0, bz], B1 = [bx, h, bz], A1 = [ax, h, az];
      const ph = PHOTO.get(bi + ':' + i);
      if (ph) {
        for (const c of ph.ch) {
          const [AW, AH] = W.photos.atlas[c.at];
          const P = u => [ax + dx * u, az + dz * u];
          const [x0, z0] = P(c.u0), [x1, z1] = P(c.u1);
          const U0 = (c.x + 0.5) / AW, U1 = (c.x + c.w - 0.5) / AW;
          const vOf = y => 1 - (c.y + Math.max(0, Math.min(1, (ph.yt - y) / (ph.yt - ph.yb))) * (c.h - 1) + 0.5) / AH;
          const yb = Math.min(Math.max(ph.yb, y0), h), bf = photoBufs[c.at];
          // below street level: repeat the bottom row of the photo
          if (yb > y0) {
            bf.tri([x0, y0, z0], [x1, y0, z1], [x1, yb, z1], nrm, [U0, vOf(yb)], [U1, vOf(yb)], [U1, vOf(yb)]);
            bf.tri([x0, y0, z0], [x1, yb, z1], [x0, yb, z0], nrm, [U0, vOf(yb)], [U1, vOf(yb)], [U0, vOf(yb)]);
          }
          bf.tri([x0, yb, z0], [x1, yb, z1], [x1, h, z1], nrm, [U0, vOf(yb)], [U1, vOf(yb)], [U1, vOf(h)]);
          bf.tri([x0, yb, z0], [x1, h, z1], [x0, h, z0], nrm, [U0, vOf(yb)], [U1, vOf(h)], [U0, vOf(h)]);
        }
      } else if (HD) {
        // foundation below street level, the ground floor (doors and garages towards the street, real shops), then whole floors up to the eaves;
        // every stretch of wall shows a whole number of window bays, of this building's own width
        const quad = (bf, s0, s1, ya, yb, ua, ub, va, vb, c) => {
          const xa = ax + dx * s0 / L, za = az + dz * s0 / L, xb = ax + dx * s1 / L, zb = az + dz * s1 / L;
          const a0 = [xa, ya, za], b0 = [xb, ya, zb], b1 = [xb, yb, zb], a1 = [xa, yb, za];
          bf.tri(a0, b0, b1, nrm, [ua, va], [ub, va], [ub, vb], c); bf.tri(a0, b1, a1, nrm, [ua, va], [ub, vb], [ua, vb], c);
        };
        const plain = UB[3][0], dark = [tint[0] * 0.72, tint[1] * 0.72, tint[2] * 0.72];
        const gy = Math.min(h - 0.5, Math.max(groundH(ax, az), groundH(bx, bz)) + 0.3), fy = Math.min(h, gy + 3.2), gv = (fy - gy) / 3.2;
        if (gy > y0 + 0.02) quad(plain, 0, L, y0, gy, u0, u1, 0, (gy - y0) / 12.8, dark);
        const street = roadEdge((ax + bx) / 2 + nrm[0] * 3, (az + bz) / 2 + nrm[2] * 3)[0] < 13 || shopsAt.has(bi + ':' + i);
        const bays = (s0, s1, bf, ya, yb, va, vb, seed) => {
          const len = s1 - s0; if (len < 0.05) return;
          if (len < 1.7) return quad(plain, s0, s1, ya, yb, s0 / 16, s1 / 16, 0, (yb - ya) / 12.8, tint); // slivers of wall stay plain
          const nb = Math.max(1, Math.round(len / bayW)), k = (hash(seed) * 4) | 0;
          quad(bf, s0, s1, ya, yb, k / 4, (k + nb) / 4, va, vb, tint);
        };
        let at = 0;
        for (const sp of shopsAt.get(bi + ':' + i) || []) {
          bays(at, sp.s0, street ? GB[style][vr] : UB[style][vr], gy, fy, 0, street ? gv : gv / 4, bi * 7 + i * 3 + at);
          const inf = shopSet.info[sp.si], [su0, sv0, su1, sv1] = inf.uv;
          quad(shopBuf, sp.s0, sp.s1, gy, fy, su0, su1, sv0, sv0 + (sv1 - sv0) * gv, null);
          if (inf.awning && fy - gy > 3) { // canvas awning over the shop window
            const P = (s2, o, y) => [ax + dx * s2 / L + nrm[0] * o, y, az + dz * s2 / L + nrm[2] * o], c = col(inf.col).map(v => v * 0.8);
            const A = P(sp.s0 + 0.2, 0.05, gy + 2.42), B = P(sp.s1 - 0.2, 0.05, gy + 2.42), C = P(sp.s1 - 0.2, 1.1, gy + 2.12), D = P(sp.s0 + 0.2, 1.1, gy + 2.12), nu = [nrm[0] * 0.37, 0.93, nrm[2] * 0.37], nd = [-nu[0], -nu[1], -nu[2]];
            extras.tri(A, D, C, nu, null, null, null, c); extras.tri(A, C, B, nu, null, null, null, c);
            extras.tri(A, C, D, nd, null, null, null, c); extras.tri(A, B, C, nd, null, null, null, c);
          }
          at = sp.s1;
        }
        bays(at, L, street ? GB[style][vr] : UB[style][vr], gy, fy, 0, street ? gv : gv / 4, bi * 7 + i * 3 + at + 1);
        if (h > fy + 0.05) {
          const nf = Math.round((h - fy) / (style === 1 ? 2.8 : 3));
          if (nf < 1) quad(plain, 0, L, fy, h, u0, u1, 0, (h - fy) / 12.8, tint);
          else bays(0, L, UB[style][vr], fy, h, 0, nf / 4, bi * 11 + i * 5);
        }
      } else {
        walls[style].tri(A0, B0, B1, nrm, [u0, v0], [u1, v0], [u1, v1], tint);
        walls[style].tri(A0, B1, A1, nrm, [u0, v0], [u1, v1], [u0, v1], tint);
      }
      acc += L;
      gridAdd([ax, az, bx, bz], 3.5);
      // eaves / cornice: a short overhang along the top of every wall
      if (L > 1) {
        const ov = kind === 0 || kind === 3 ? 0.45 : 0.3, drop = kind === 0 || kind === 3 ? 0.28 : 0.12;
        const ox = nrm[0] * ov, oz = nrm[2] * ov;
        const T0 = [ax, h + 0.02, az], T1 = [bx, h + 0.02, bz], E1 = [bx + ox, h - drop, bz + oz], E0 = [ax + ox, h - drop, az + oz];
        const nu = [nrm[0] * 0.55, 0.84, nrm[2] * 0.55];
        roofs.tri(T0, T1, E1, nu, null, null, null, eaveC); roofs.tri(T0, E1, E0, nu, null, null, null, eaveC);
        const U0 = [ax, h - drop - 0.05, az], U1 = [bx, h - drop - 0.05, bz];
        roofs.tri(U0, E1, U1, [0, -1, 0], null, null, null, eaveC); roofs.tri(U0, E0, E1, [0, -1, 0], null, null, null, eaveC);
      }
    }
    const rc = shade(col(ROOF_TINTS[kind] || ROOF_TINTS[0]), 0.85 + hash(bi + 11) * 0.3);
    // Pitched slate roof on small four-sided buildings (typical faubourg houses)
    if (pitched) {
      const P = i => [p[2 * (i % 4)], p[2 * (i % 4) + 1]];
      const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const off = len(P(0), P(1)) >= len(P(1), P(2)) ? 0 : 1; // edge off..off+1 is a long side
      const a0 = P(off), a1 = P(off + 1), a2 = P(off + 2), a3 = P(off + 3);
      const short = Math.min(len(a1, a2), len(a3, a0));
      const rise = Math.max(1.2, Math.min(6, riseIn, short * 0.75));
      const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
      const rb = mid(a1, a2), ra = mid(a3, a0);
      const V = (q, y) => [q[0], y, q[1]];
      const up = (A, B, C) => { // normal of a roof triangle, pointing up
        const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
        let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
        const l = Math.hypot(nx, ny, nz) || 1; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; } return [nx / l, ny / l, nz / l];
      };
      const slope = (A, B, C, D) => { const nn = up(A, B, C); roofs.tri(A, B, C, nn, null, null, null, rc); roofs.tri(A, C, D, nn, null, null, null, rc); };
      slope(V(a0, h), V(a1, h), V(rb, h + rise), V(ra, h + rise));
      slope(V(a2, h), V(a3, h), V(ra, h + rise), V(rb, h + rise));
      const cx = (a0[0] + a1[0] + a2[0] + a3[0]) / 4, cz = (a0[1] + a1[1] + a2[1] + a3[1]) / 4;
      for (const [u, v, r] of [[a1, a2, rb], [a3, a0, ra]]) {
        const gx = r[0] - cx, gz = r[1] - cz, gl = Math.hypot(gx, gz) || 1;
        const L = len(u, v), v0 = (h - y0) / 12.8, v1 = (h + rise - y0) / 12.8;
        (HD ? UB[3][0] : walls[style]).tri(V(u, h), V(v, h), V(r, h + rise), [gx / gl, 0, gz / gl], [0, v0], [L / 16, v0], [L / 32, v1], tint);
      }
      if (HD) for (const t of hash(bi + 31) < 0.5 ? [0.22] : [0.2, 0.8]) boxBuf(extras, ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, 0.6, 0.6, h + rise - 0.6, h + rise + 0.9, hash(bi + 5) < 0.6 ? cBrick : cStone);
    } else if (inner) {
      const rise = Math.max(1.4, Math.min(4.5, riseIn, insD * 1.15)), nq = inner.length / 2;
      for (let i = 0; i < nq; i++) {
        const j = (i + 1) % nq;
        const A = [p[2 * i], h, p[2 * i + 1]], B = [p[2 * j], h, p[2 * j + 1]], C = [inner[2 * j], h + rise, inner[2 * j + 1]], D = [inner[2 * i], h + rise, inner[2 * i + 1]];
        const e1 = [B[0] - A[0], 0, B[2] - A[2]], e2 = [D[0] - A[0], rise, D[2] - A[2]];
        let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
        const l = Math.hypot(nx, ny, nz) || 1; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const nn = [nx / l, ny / l, nz / l];
        roofs.tri(A, B, C, nn, null, null, null, rc); roofs.tri(A, C, D, nn, null, null, null, rc);
      }
      const [, tr] = triangulate(inner);
      for (const [a, bb, c] of tr) roofs.tri([inner[2 * a], h + rise, inner[2 * a + 1]], [inner[2 * bb], h + rise, inner[2 * bb + 1]], [inner[2 * c], h + rise, inner[2 * c + 1]], [0, 1, 0], null, null, null, rc);
      const k = (hash(bi + 41) * nq) | 0, cxi = inner.reduce((s2, v, i) => i % 2 ? s2 : s2 + v, 0) / nq, czi = inner.reduce((s2, v, i) => i % 2 ? s2 + v : s2, 0) / nq;
      boxBuf(extras, inner[2 * k] + (cxi - inner[2 * k]) * 0.3, inner[2 * k + 1] + (czi - inner[2 * k + 1]) * 0.3, 0.65, 0.65, h + rise - 0.3, h + rise + 1.2, hash(bi + 5) < 0.6 ? cBrick : cStone);
    } else {
    const [, tris] = triangulate(p);
    for (const [a, bb, c] of tris) {
      roofs.tri([p[2 * a], h, p[2 * a + 1]], [p[2 * bb], h, p[2 * bb + 1]], [p[2 * c], h, p[2 * c + 1]], [0, 1, 0], null, null, null, rc);
    }
    }
    buildingPolys.push(b);
    if (b.n) {
      let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += p[2 * i]; cz += p[2 * i + 1]; }
      landmarks.push({ name: b.n, x: cx / n, z: cz / n });
    }
  });
  photoBufs.forEach((bf, i) => {
    if (!bf.p.length) return;
    const m = new THREE.Mesh(bf.geo(), photoMats[i]); m.castShadow = m.receiveShadow = true; scene.add(m);
  });
  walls.forEach((bf, i) => {
    if (!bf.p.length) return;
    const m = new THREE.Mesh(bf.geo(), wallMats[i]);
    m.castShadow = m.receiveShadow = true; scene.add(m);
  });
  if (HD) {
    for (const [bufs, mats] of [[UB, HDW.upper], [GB, HDW.ground]]) bufs.forEach((arr, si) => arr.forEach((bf, vi) => {
      if (!bf.p.length) return;
      const m = new THREE.Mesh(bf.geo(), mats[si][vi]); m.castShadow = m.receiveShadow = true; scene.add(m);
    }));
    if (shopBuf.p.length) { const m = new THREE.Mesh(shopBuf.geo(), shopSet.mat); m.castShadow = m.receiveShadow = true; scene.add(m); }
  }
  if (extras.p.length) { const m = new THREE.Mesh(extras.geo(), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = m.receiveShadow = true; scene.add(m); }
  const rm = new THREE.Mesh(roofs.geo(), roofMat); rm.castShadow = rm.receiveShadow = true; scene.add(rm);
}

// ground, roads, greens
const ROAD_Y = { drive: 0.32, foot: 0.2, mark: 0.42, green: 0.14, rail: 0.26 };
function densify(p, step) {
  const o = [p[0], p[1]];
  for (let i = 0; i < p.length - 2; i += 2) {
    const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3], L = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.ceil(L / step));
    for (let s = 1; s <= k; s++) o.push(ax + (bx - ax) * s / k, az + (bz - az) * s / k);
  }
  return o;
}
// ribbon draped on the terrain; y is the height above ground
function ribbon(buf, p0, w, y, rgb, uvScale) {
  const p = densify(p0, 2);
  const n = p.length / 2; if (n < 2) return;
  const L = [], R = [];
  let dist = 0; const ds = [0];
  for (let i = 0; i < n; i++) {
    const x = p[2 * i], z = p[2 * i + 1];
    let dx = 0, dz = 0;
    if (i > 0) { const ex = x - p[2 * i - 2], ez = z - p[2 * i - 1], l = Math.hypot(ex, ez) || 1; dx += ex / l; dz += ez / l; }
    if (i < n - 1) { const ex = p[2 * i + 2] - x, ez = p[2 * i + 3] - z, l = Math.hypot(ex, ez) || 1; dx += ex / l; dz += ez / l; }
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    let m = 1;
    if (i > 0 && i < n - 1) {
      const ex = x - p[2 * i - 2], ez = z - p[2 * i - 1], le = Math.hypot(ex, ez) || 1;
      const cos = (ex / le) * dx + (ez / le) * dz; m = Math.min(2.2, 1 / Math.max(0.45, cos));
    }
    const ox = -dz * w / 2 * m, oz = dx * w / 2 * m;
    const lx = x + ox, lz = z + oz, rx = x - ox, rz = z - oz;
    // hug the terrain on both edges so roads never float above or sink below the ground
    L.push([lx, groundH(lx, lz) + y, lz]); R.push([rx, groundH(rx, rz) + y, rz]);
    if (i > 0) { dist += Math.hypot(x - p[2 * i - 2], z - p[2 * i - 1]); ds.push(dist); }
  }
  // world-space UVs: overlapping pieces of road show exactly the same texture, so junctions look seamless
  const wu = q => [q[0] / 6, q[2] / 6];
  for (let i = 0; i < n - 1; i++) {
    buf.tri(L[i], R[i], R[i + 1], [0, 1, 0], wu(L[i]), wu(R[i]), wu(R[i + 1]), rgb);
    buf.tri(L[i], R[i + 1], L[i + 1], [0, 1, 0], wu(L[i]), wu(R[i + 1]), wu(L[i + 1]), rgb);
  }
}
function disk(buf, x, z, r, y, rgb) {
  const s = 10;
  const yy = y - 0.02, cy = groundH(x, z) + yy;
  for (let k = 0; k < s; k++) {
    const a0 = k / s * Math.PI * 2, a1 = (k + 1) / s * Math.PI * 2;
    const x0 = x + Math.cos(a0) * r, z0 = z + Math.sin(a0) * r, x1 = x + Math.cos(a1) * r, z1 = z + Math.sin(a1) * r;
    buf.tri([x, cy, z], [x0, groundH(x0, z0) + yy, z0], [x1, groundH(x1, z1) + yy, z1], [0, 1, 0], [x / 6, z / 6], [x0 / 6, z0 / 6], [x1 / 6, z1 / 6], rgb);
  }
}

const roadSegs = new Map(); // street-name lookup grid
const RCELL = 20;
function roadSegAdd(ax, az, bx, bz, w, n) {
  const i0 = Math.floor((Math.min(ax, bx) - 10) / RCELL), i1 = Math.floor((Math.max(ax, bx) + 10) / RCELL);
  const j0 = Math.floor((Math.min(az, bz) - 10) / RCELL), j1 = Math.floor((Math.max(az, bz) + 10) / RCELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = key(i, j); let a = roadSegs.get(k); if (!a) roadSegs.set(k, a = []); a.push([ax, az, bx, bz, w, n]);
  }
}

// distance from a point to the nearest carriageway edge (negative: on the road) and the direction away from it
function roadEdge(x, z) {
  const segs = roadSegs.get(key(Math.floor(x / RCELL), Math.floor(z / RCELL)));
  let bd = 1e9, nx = 0, nz = 0;
  if (segs) for (const [ax, az, bx, bz, w] of segs) {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const px = x - ax - dx * t, pz = z - az - dz * t, l = Math.hypot(px, pz), d = l - w / 2;
    if (d < bd) { bd = d; const L = Math.sqrt(L2); nx = l > 0.01 ? px / l : -dz / L; nz = l > 0.01 ? pz / l : dx / L; }
  }
  return [bd, nx, nz];
}
// move a point off the carriageway, onto the pavement; null when it cannot be (middle of a junction)
function offRoad(x, z, margin) {
  for (let it = 0; it < 5; it++) {
    const [d, nx, nz] = roadEdge(x, z); if (d >= margin) return [x, z];
    x += nx * (margin - d + 0.05); z += nz * (margin - d + 0.05);
  }
  return null;
}

// road graph for AI
// adj: both ways (bots, police); out: the legal direction (one-way streets) for the civil traffic; ew: width of the street
const G = { x: [], z: [], adj: [], out: [], ew: new Map(), idx: new Map() };
function gnode(x, z) {
  const k = Math.round(x * 2) + ',' + Math.round(z * 2);
  let id = G.idx.get(k);
  if (id === undefined) { id = G.x.length; G.idx.set(k, id); G.x.push(x); G.z.push(z); G.adj.push([]); G.out.push([]); }
  return id;
}
function glink(a, b, w = 6.5, o = 0) {
  if (a === b) return;
  if (!G.adj[a].includes(b)) { G.adj[a].push(b); G.adj[b].push(a); }
  if (o !== -1 && !G.out[a].includes(b)) G.out[a].push(b);
  if (o !== 1 && !G.out[b].includes(a)) G.out[b].push(a);
  const k1 = a * 65536 + b, k2 = b * 65536 + a; G.ew.set(k1, Math.max(G.ew.get(k1) || 0, w)); G.ew.set(k2, Math.max(G.ew.get(k2) || 0, w));
}
const edgeW = (a, b) => G.ew.get(a * 65536 + b) || 6.5;

function buildGround() {
  // Terrain from the IGN ground model (12.5 m grid), extended past the data edge
  const gt = groundTex();
  const ST = DEM.step, TX0 = DEM.x0 - 80 * ST, TX1 = DEM.x0 + (DEM.nx - 1 + 80) * ST, TZ0 = DEM.z0 - 80 * ST, TZ1 = DEM.z0 + (DEM.nz - 1 + 80) * ST; // aligned on the IGN grid
  const tnx = Math.round((TX1 - TX0) / ST) + 1, tnz = Math.round((TZ1 - TZ0) / ST) + 1;
  const bigGreens = W.greens.filter(g => g.g !== 3).map(g => {
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (let k = 0; k < g.p.length; k += 2) { a = Math.min(a, g.p[k]); b = Math.max(b, g.p[k]); c = Math.min(c, g.p[k + 1]); d = Math.max(d, g.p[k + 1]); }
    return { ...g, bb: [a, b, c, d] };
  });
  const tpos = new Float32Array(tnx * tnz * 3), tcol = new Float32Array(tnx * tnz * 3), tuv = new Float32Array(tnx * tnz * 2);
  const cGround = col(HD ? '#a39f98' : '#8d847c'), cPark = col('#557f3c'), cPitch = col('#64994a'), cCem = col('#5c6e50'), cBank = col('#5c5046');
  for (let j = 0; j < tnz; j++) for (let i = 0; i < tnx; i++) {
    const k = j * tnx + i, x = TX0 + i * ST, z = TZ0 + j * ST, y = groundH(x, z);
    tpos.set([x, y, z], k * 3); tuv.set([x / 8, z / 8], k * 2);
    let c = y < WATER_Y + 1.2 ? cBank : cGround;
    for (const g of bigGreens) if (x >= g.bb[0] && x <= g.bb[1] && z >= g.bb[2] && z <= g.bb[3] && pointInPoly(x, z, g.p)) { c = g.g === 1 ? cPitch : g.g === 2 ? cCem : cPark; break; }
    const f = 0.94 + hash(k) * 0.1;
    tcol.set([c[0] * f, c[1] * f, c[2] * f], k * 3);
  }
  const tidx = [];
  for (let j = 0; j < tnz - 1; j++) for (let i = 0; i < tnx - 1; i++) {
    const a = j * tnx + i, b = a + 1, c = a + tnx, d = c + 1;
    tidx.push(a, c, b, b, c, d);
  }
  const tgeo = new THREE.BufferGeometry();
  tgeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3));
  tgeo.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  tgeo.setAttribute('uv', new THREE.BufferAttribute(tuv, 2));
  tgeo.setIndex(tidx); tgeo.computeVertexNormals();
  const ground = new THREE.Mesh(tgeo, HD ? hd.groundMat() : new THREE.MeshLambertMaterial({ map: gt, vertexColors: true }));
  ground.receiveShadow = true; scene.add(ground);

  const at = asphaltTex();
  const roadMat = HD ? hd.roadMat() : new THREE.MeshLambertMaterial({ map: at, vertexColors: true });
  const drive = new Buf(), foot = new Buf(), marks = new Buf();
  const cDrive = col(HD ? '#414144' : '#46404c'), cPrim = col(HD ? '#39393c' : '#3d3843'), cFoot = col('#a69d92'), cMark = col('#efe6cf');
  W.roads.forEach(r => {
    const p = r.p;
    if (r.b) { // bridge: deck built below; still part of the road network
      if (r.d) {
        let prev = -1; const n = p.length / 2;
        for (let i = 0; i < n; i++) { const id = gnode(p[2 * i], p[2 * i + 1]); if (prev >= 0) glink(prev, id, r.w, r.o || 0); prev = id; }
        for (let i = 0; i < n - 1; i++) roadSegAdd(p[2 * i], p[2 * i + 1], p[2 * i + 2], p[2 * i + 3], r.w, r.n);
      }
      return;
    }
    if (r.d) {
      const c = cDrive;
      ribbon(drive, p, r.w, ROAD_Y.drive, c, 6);
      const n = p.length / 2;
      disk(drive, p[0], p[1], r.w / 2, ROAD_Y.drive, c);
      disk(drive, p[2 * n - 2], p[2 * n - 1], r.w / 2, ROAD_Y.drive, c);
      for (let i = 1; i < n - 1; i++) disk(drive, p[2 * i], p[2 * i + 1], r.w / 2 * 0.98, ROAD_Y.drive, c);
      // dashed centre line on wide roads
      if (r.w >= 6.5) {
        for (let i = 0; i < n - 1; i++) {
          const ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * i + 2], bz = p[2 * i + 3];
          const L = Math.hypot(bx - ax, bz - az); if (L < 14) continue;
          const ux = (bx - ax) / L, uz = (bz - az) / L;
          for (let s = 7; s + 3 < L - 7; s += 9) {
            ribbon(marks, [ax + ux * s, az + uz * s, ax + ux * (s + 3), az + uz * (s + 3)], 0.18, ROAD_Y.mark, cMark, 100);
          }
        }
      }
      // graph + name lookup
      let prev = -1;
      for (let i = 0; i < n; i++) {
        const x = p[2 * i], z = p[2 * i + 1];
        if (Math.abs(x - CX) > HX + 25 || Math.abs(z - CZ) > HZ + 15) { prev = -1; continue; }
        const id = gnode(x, z); if (prev >= 0) glink(prev, id, r.w, r.o || 0); prev = id;
      }
      for (let i = 0; i < n - 1; i++) roadSegAdd(p[2 * i], p[2 * i + 1], p[2 * i + 2], p[2 * i + 3], r.w, r.n);
    } else {
      ribbon(foot, p, r.w, ROAD_Y.foot, cFoot, 3);
    }
  });
  // bridges over the railway trench: deck, side beams and parapets
  const deck = new Buf(), side = new Buf();
  const cConc = col('#a39a8e'), cPar = col('#b8ae9f');
  (W.bridges || []).forEach(b => {
    const p = b.p, n = p.length / 3, hw = b.w / 2, top = 0.32;
    const Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const x = p[3 * i], z = p[3 * i + 1], y = p[3 * i + 2] + top;
      const j0 = Math.max(0, i - 1), j1 = Math.min(n - 1, i + 1);
      let dx = p[3 * j1] - p[3 * j0], dz = p[3 * j1 + 1] - p[3 * j0 + 1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      Lp.push([x - dz * hw, y, z + dx * hw]); Rp.push([x + dz * hw, y, z - dx * hw]);
    }
    const wu = q => [q[0] / 6, q[2] / 6];
    for (let i = 0; i < n - 1; i++) {
      deck.tri(Lp[i], Rp[i], Rp[i + 1], [0, 1, 0], wu(Lp[i]), wu(Rp[i]), wu(Rp[i + 1]), b.d ? cDrive : cFoot);
      deck.tri(Lp[i], Rp[i + 1], Lp[i + 1], [0, 1, 0], wu(Lp[i]), wu(Rp[i + 1]), wu(Lp[i + 1]), b.d ? cDrive : cFoot);
      for (const [E, sgn] of [[Lp, 1], [Rp, -1]]) {
        const A = E[i], B = E[i + 1];
        const nx = (B[2] - A[2]) * sgn, nz = -(B[0] - A[0]) * sgn, nl = Math.hypot(nx, nz) || 1, nn = [-nx / nl, 0, -nz / nl];
        const dn = 1.3, ph = b.d ? 1.0 : 1.1;
        // beam below the deck edge
        side.tri([A[0], A[1] - dn, A[2]], [B[0], B[1] - dn, B[2]], B, nn, null, null, null, cConc);
        side.tri([A[0], A[1] - dn, A[2]], B, A, nn, null, null, null, cConc);
        // parapet
        side.tri(A, B, [B[0], B[1] + ph, B[2]], nn, null, null, null, cPar);
        side.tri(A, [B[0], B[1] + ph, B[2]], [A[0], A[1] + ph, A[2]], nn, null, null, null, cPar);
        gridAdd([A[0], A[2], B[0], B[2]], 3.5);
      }
    }
  });
  if (deck.p.length) {
    const dm = new THREE.Mesh(deck.geo(), roadMat); dm.receiveShadow = true; scene.add(dm);
    const sm = new THREE.Mesh(side.geo(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); sm.castShadow = sm.receiveShadow = true; scene.add(sm);
  }
  for (const [bf, mat] of [[drive, roadMat], [foot, HD ? hd.footMat() : roadMat]]) {
    const m = new THREE.Mesh(bf.geo(), mat); m.receiveShadow = true; scene.add(m);
  }
  scene.add(new THREE.Mesh(marks.geo(), new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })));

  // rails
  const rails = new Buf();
  W.rails.forEach(r => ribbon(rails, r.p, r.t ? 2.6 : 3.2, ROAD_Y.rail, col(r.t ? '#5c5560' : '#5a4a42'), 2));
  const rm = new THREE.Mesh(rails.geo(), new THREE.MeshLambertMaterial({ vertexColors: true, map: at })); rm.receiveShadow = true; scene.add(rm);

  // greens
  const greens = new Buf();
  const GC = ['#4f7a3a', '#5f9444', '#56684a', '#3f7c99'];
  const parkTrees = [];
  W.greens.forEach(gp => {
    const [pts, tris] = triangulate(gp.p);
    const c = col(GC[gp.g]);
    if (gp.g === 3) {
      let y = -1e9; for (const v of pts) y = Math.max(y, groundH(v.x, v.y)); y += ROAD_Y.green;
      for (const [a, b, cc] of tris) greens.tri([pts[a].x, y, pts[a].y], [pts[b].x, y, pts[b].y], [pts[cc].x, y, pts[cc].y], [0, 1, 0], null, null, null, c);
    }
    if (gp.g === 0) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const v of pts) { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.y); z1 = Math.max(z1, v.y); }
      const cnt = Math.min(60, Math.abs(signedArea(gp.p)) / 260);
      for (let k = 0; k < cnt * 3 && parkTrees.length < 900; k++) {
        const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
        if (pointInPoly(x, z, gp.p) && rnd() < 0.34) parkTrees.push(x, z);
      }
    }
  });
  const gmesh = new THREE.Mesh(greens.geo(), new THREE.MeshLambertMaterial({ vertexColors: true })); gmesh.receiveShadow = true; scene.add(gmesh);

  // trees (instanced)
  if (HD) { // tell the terrain shader where the streets are: pavements stay paved even under tree crowns
    const ar = new Float32Array(tnx * tnz);
    for (let k = 0; k < ar.length; k++) { const d = roadEdge(tpos[k * 3], tpos[k * 3 + 2])[0]; ar[k] = d < 3 ? 1 : d < 9 ? (9 - d) / 6 : 0; }
    tgeo.setAttribute('aRoad', new THREE.BufferAttribute(ar, 1));
  }
  const T = [];
  for (const src of [W.trees, parkTrees]) for (let i = 0; i < src.length; i += 2) { // keep trunks out of the traffic
    const q = offRoad(src[i], src[i + 1], 0.9);
    if (q && !buildingPolys.some(b => pointInPoly(q[0], q[1], b.p))) T.push(q[0], q[1]);
  }
  const nt = T.length / 2;
  const crownG = HD ? hd.crownGeo() : new THREE.IcosahedronGeometry(2.6, 0), trunkG = new THREE.CylinderGeometry(0.22, 0.3, 3, 5);
  const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: !HD, vertexColors: HD }), nt);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x5a4636 }), nt);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), cc = new THREE.Color();
  for (let i = 0; i < nt; i++) {
    const x = T[2 * i], z = T[2 * i + 1], k = 0.8 + hash(i) * 0.6;
    q.setFromEuler(new THREE.Euler(0, hash(i + 1) * 6, 0));
    const gy = groundH(x, z);
    m4.compose(v.set(x, gy + 3 * k + 1.4, z), q, s.set(k, k * 1.15, k)); crowns.setMatrixAt(i, m4);
    cc.setHSL(0.22 + hash(i + 2) * 0.08, 0.45, 0.28 + hash(i + 3) * 0.1); crowns.setColorAt(i, cc);
    m4.compose(v.set(x, gy + 1.5 * k, z), q, s.set(k, k, k)); trunks.setMatrixAt(i, m4);
    gridAdd([x - 0.4, z, x + 0.4, z, 2.2 * k], 3.5); gridAdd([x, z - 0.4, x, z + 0.4, 2.2 * k], 3.5); // 5th value: height of the trunk (a car flying higher goes over, through the leaves)
  }
  crowns.castShadow = trunks.castShadow = true;
  scene.add(crowns, trunks);

  // The Loire: a water plane; the ground model dips under it where the river is
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), HD ? hd.waterMat() : new THREE.MeshPhongMaterial({ color: 0x2f4f66, specular: 0xffb27a, shininess: 70 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, WATER_Y, 0); scene.add(water);
}

