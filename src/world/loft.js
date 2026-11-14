// ---------- lofted bodies for the long vehicles (tram, bus): a rounded cross-section swept along the length ----------
// loftBody({ len, prof, front, back, cuts, paint, mats }) -> THREE.Mesh, long axis z, front towards +z.
//   prof: half cross-section from the sill to the roof centre, [[y, halfWidth], ...] (last point on the axis)
//   front / back: { len, taper, rake, y0 } nose: the section narrows by `taper` and the upper part (above y0) leans
//     back by `rake` x len, like a raked windscreen; omit for a flat open end (hidden by a bellows)
//   cuts: z positions where the paint changes (window pillars, doors); paint(z, y, t, side, end) -> index in mats,
//     with t the progress along a nose (0 on the straight body), side -1 / +1 (x sign), end 'f' | 'b' | ''
function loftBody(o) {
  const P = o.prof, n = P.length, L = o.len, z0 = -L / 2, z1 = L / 2, NS = 7;
  const fl = o.front ? o.front.len : 0, bl = o.back ? o.back.len : 0;
  const zs = new Set([z0 + bl, z1 - fl]);
  for (const c of o.cuts || []) if (c > z0 + bl + 0.01 && c < z1 - fl - 0.01) zs.add(+c.toFixed(3));
  for (let i = 0; i <= NS; i++) { if (fl) zs.add(z1 - fl + fl * i / NS); if (bl) zs.add(z0 + bl - bl * i / NS); }
  const Z = [...zs].sort((a, b) => a - b), yTop = P[n - 1][0];
  const noseAt = z => z > z1 - fl + 1e-6 ? ['f', (z - (z1 - fl)) / fl, o.front] : z < z0 + bl - 1e-6 ? ['b', (z0 + bl - z) / bl, o.back] : ['', 0, null];
  const ring = 2 * n - 1, pos = [], tris = [[]];
  for (const z of Z) {
    const [end, t, N] = noseAt(z);
    for (let k = 0; k < ring; k++) {
      const j = k < n ? k : 2 * n - 2 - k, side = k < n - 1 ? 1 : k === n - 1 ? 0 : -1, [y, w] = P[j];
      let zz = z, ww = w;
      if (N) { // round the plan of the nose, lean the upper part back
        ww = w * (1 - N.taper * t * t) * (t > 0.999 && N.round ? 0.86 : 1);
        const up = Math.max(0, Math.min(1, (y - N.y0) / (yTop - N.y0)));
        zz = z - (end === 'f' ? 1 : -1) * N.rake * N.len * t * up * up * (3 - 2 * up);
      }
      pos.push(side * ww, y, zz);
    }
  }
  const put = (m, a, b, c) => { (tris[m] || (tris[m] = [])).push(a, b, c); };
  for (let i = 0; i + 1 < Z.length; i++) {
    const zm = (Z[i] + Z[i + 1]) / 2, [end, t] = noseAt(zm);
    for (let k = 0; k + 1 < ring; k++) {
      const ja = k < n ? k : 2 * n - 2 - k, jb = k + 1 < n ? k + 1 : 2 * n - 3 - k, ym = (P[ja][0] + P[jb][0]) / 2, side = k < n - 1 ? 1 : -1;
      const m = o.paint(zm, ym, t, side, end), a = i * ring + k, b = a + 1, c = a + ring, d = c + 1;
      put(m, a, b, c); put(m, b, d, c);
    }
  }
  for (const [end, i] of [['f', Z.length - 1], ['b', 0]]) { // close the two ends: one strip across per profile step
    const N = end === 'f' ? o.front : o.back, base = i * ring;
    for (let j = 0; j + 1 < n; j++) {
      const ym = (P[j][0] + P[j + 1][0]) / 2, m = N ? o.paint(Z[i], ym, 1, 0, end) : (o.capMat ?? 0);
      const a = base + j, b2 = base + j + 1, c = base + 2 * n - 3 - j, d = base + 2 * n - 2 - j; // right low, right high, left high, left low
      if (end === 'f') { put(m, a, b2, d); if (c !== b2) put(m, b2, c, d); } else { put(m, a, d, b2); if (c !== b2) put(m, b2, d, c); }
    }
  }
  const g = new THREE.BufferGeometry(), index = [];
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  tris.forEach((t, m) => { if (!t || !t.length) return; g.addGroup(index.length, t.length, m); index.push(...t); });
  g.setIndex(index); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, o.mats); mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
