// Bake a downloaded 3D model (glb) into the compact form the game embeds: one mesh, colours per vertex (the textures are
// sampled once, here), simplified to a triangle budget, positions on 16 bits. No texture and no loader in the game.
// Not part of build.sh: the result (data/models/*.json) is committed. Needs @gltf-transform/core, meshoptimizer, sharp.
//   node bake_model.js in.glb out.json '{"tris":6000,"len":24,"tex":{"mat":"file.png"},"col":{"mat":[r,g,b]},"axis":"x"}'
const path = require('path'), fs = require('fs');
const req = n => require(require.resolve(n, { paths: [process.cwd(), __dirname] }));
const { NodeIO } = req('@gltf-transform/core'), { MeshoptSimplifier } = req('meshoptimizer'), sharp = req('sharp');
(async () => {
  const [src, dst, optS] = process.argv.slice(2), opt = JSON.parse(optS || '{}');
  const doc = await new NodeIO().read(src), root = doc.getRoot();
  const texs = {};
  for (const [m, f] of Object.entries(opt.tex || {})) {
    const { data, info } = await sharp(f, { limitInputPixels: false }).resize(1024, 1024).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    texs[m] = { data, w: info.width, h: info.height };
  }
  const P = [], C = [], I = [];
  const mul = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
  const seen = {};
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const wm = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial(), name = mat ? mat.getName() : '';
      seen[name] = (seen[name] || 0) + 1;
      if ((opt.skip || []).includes(name)) continue;
      const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'), idx = prim.getIndices();
      const base = P.length / 3, t = texs[name], flat = (opt.col || {})[name] || (mat ? mat.getBaseColorFactor().slice(0, 3).map(v => Math.round(Math.pow(v, 1 / 2.2) * 255)) : [200, 200, 200]);
      for (let i = 0; i < pos.getCount(); i++) {
        P.push(...mul(wm, pos.getElement(i, [])));
        if (t && uv) {
          const u = uv.getElement(i, []), x = Math.min(t.w - 1, Math.max(0, Math.floor((u[0] - Math.floor(u[0])) * t.w))), y = Math.min(t.h - 1, Math.max(0, Math.floor((u[1] - Math.floor(u[1])) * t.h))), o = (y * t.w + x) * 3;
          C.push(t.data[o], t.data[o + 1], t.data[o + 2]);
        } else C.push(...flat);
      }
      const n = idx ? idx.getCount() : pos.getCount();
      if (opt.deck) { // no texture: paint by slope and height (decks, hull below the water line), one colour per triangle
        const [dk, low, lowY] = opt.deck;
        for (let i = 0; i < n; i += 3) {
          const v = [0, 1, 2].map(k => base + (idx ? idx.getScalar(i + k) : i + k)), a = v.map(j => [P[j * 3], P[j * 3 + 1], P[j * 3 + 2]]);
          const e1 = a[1].map((q, k) => q - a[0][k]), e2 = a[2].map((q, k) => q - a[0][k]), nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], l = Math.hypot(nx, ny, nz) || 1;
          const cy = (a[0][1] + a[1][1] + a[2][1]) / 3, col = cy < lowY ? low : Math.abs(ny / l) > 0.92 ? dk : null;
          for (const p of a) { I.push(P.length / 3); P.push(...p); C.push(...(col || flat)); }
        }
        continue;
      }
      // opt.part: {box: [x0, x1, y0, y1, z0, z1], yellow: true, invert: false}: keep only the triangles in the box (and yellow),
      // or all the others: to take a moving piece out of a model delivered in one block (the gates of the ferry)
      const inPart = (a, b, c) => { const q = opt.part, bx = q.box, m = k => (P[a * 3 + k] + P[b * 3 + k] + P[c * 3 + k]) / 3, x = m(0), y = m(1), z = m(2);
        let ok = x >= bx[0] && x <= bx[1] && y >= bx[2] && y <= bx[3] && z >= bx[4] && z <= bx[5];
        if (ok && q.yellow) { const r = (C[a * 3] + C[b * 3] + C[c * 3]) / 3, g = (C[a * 3 + 1] + C[b * 3 + 1] + C[c * 3 + 1]) / 3, bl = (C[a * 3 + 2] + C[b * 3 + 2] + C[c * 3 + 2]) / 3; ok = r > 150 && g > 110 && bl < 90 && r > bl * 1.9; }
        return ok !== !!q.invert; };
      for (let i = 0; i < n; i += 3) { const a = base + (idx ? idx.getScalar(i) : i), b = base + (idx ? idx.getScalar(i + 1) : i + 1), c = base + (idx ? idx.getScalar(i + 2) : i + 2); if (!opt.part || inPart(a, b, c)) I.push(a, b, c); }
    }
  }
  if (opt.grad) { // colours by height (fraction of the height, bottom to top) when the model comes without usable textures
    let y0 = 1e9, y1 = -1e9; for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
    for (let i = 0; i < P.length / 3; i++) { const f = (P[i * 3 + 1] - y0) / (y1 - y0); let c = opt.grad[0][1]; for (const [t, col] of opt.grad) if (f >= t) c = col; C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; }
  }
  console.log('materials', JSON.stringify(seen), 'tris', I.length / 3, 'verts', P.length / 3);
  // weld on position + colour
  const key = new Map(), remap = new Uint32Array(P.length / 3), p2 = [], c2 = [];
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < P.length; i++) { mn[i % 3] = Math.min(mn[i % 3], P[i]); mx[i % 3] = Math.max(mx[i % 3], P[i]); }
  const ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]), q = 4096 / ext;
  for (let i = 0; i < P.length / 3; i++) {
    const k = [Math.round(P[i * 3] * q), Math.round(P[i * 3 + 1] * q), Math.round(P[i * 3 + 2] * q), C[i * 3] >> 3, C[i * 3 + 1] >> 3, C[i * 3 + 2] >> 3].join(',');
    let j = key.get(k); if (j === undefined) { j = p2.length / 3; key.set(k, j); p2.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); c2.push(C[i * 3] / 255, C[i * 3 + 1] / 255, C[i * 3 + 2] / 255); }
    remap[i] = j;
  }
  let idx = []; for (let i = 0; i < I.length; i += 3) { const a = remap[I[i]], b = remap[I[i + 1]], c = remap[I[i + 2]]; if (a !== b && b !== c && a !== c) idx.push(a, b, c); }
  await MeshoptSimplifier.ready;
  const target = (opt.tris || 6000) * 3;
  let [out, err] = idx.length <= target ? [new Uint32Array(idx), 0] : MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(idx), new Float32Array(p2), 3, new Float32Array(c2), 3, [opt.cw || 0.5, opt.cw || 0.5, opt.cw || 0.5], null, target, 0.05, []);
  if (out.length > target * 1.15) { [out, err] = MeshoptSimplifier.simplifySloppy(new Uint32Array(out), new Float32Array(p2), 3, null, target, 0.05); console.log('sloppy pass'); }
  // compact, orient (length along +x, up +y, keel on y = 0 at the water line given by opt.draft), scale to opt.len metres
  const used = new Map(), fp = [], fc = [], fi = [];
  for (const v of out) { let j = used.get(v); if (j === undefined) { j = fp.length / 3; used.set(v, j); fp.push(p2[v * 3], p2[v * 3 + 1], p2[v * 3 + 2]); fc.push(Math.round(c2[v * 3] * 255), Math.round(c2[v * 3 + 1] * 255), Math.round(c2[v * 3 + 2] * 255)); } fi.push(j); }
  mn = [1e9, 1e9, 1e9]; mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < fp.length; i++) { mn[i % 3] = Math.min(mn[i % 3], fp[i]); mx[i % 3] = Math.max(mx[i % 3], fp[i]); }
  const size = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  const s = 32767 / Math.max(...size), pq = new Int16Array(fp.length);
  for (let i = 0; i < fp.length; i++) pq[i] = Math.round((fp[i] - (mn[i % 3] + mx[i % 3]) / 2) * s);
  const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
  // o: centre of the box in the model's own coordinates (to put a cut-out piece back in place)
  const res = { n: fp.length / 3, t: fi.length / 3, size: size.map(v => +v.toFixed(4)), o: mn.map((v, k) => +((v + mx[k]) / 2).toFixed(4)), p: b64(pq), c: b64(new Uint8Array(fc)), i: b64(fp.length / 3 > 65535 ? new Uint32Array(fi) : new Uint16Array(fi)) };
  fs.writeFileSync(dst, JSON.stringify(res));
  console.log(path.basename(dst), 'tris', res.t, 'verts', res.n, 'size', res.size, 'err', err.toFixed(4), 'bytes', fs.statSync(dst).size);
})().catch(e => { console.error(e); process.exit(1); });
