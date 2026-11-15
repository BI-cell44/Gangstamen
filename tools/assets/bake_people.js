// Bake rigged characters and their animations (glb, from FBX by fbx2gltf) into data/people.json for src/gx/people.js:
// per character one skinned mesh in its rest pose (positions, palette uv, 4 bones per vertex) and its bones; per clip the
// rotation of every bone relative to its parent bone, sampled at a fixed rate, and the path of the hips.
// Not part of build.sh (the result is committed). Needs @gltf-transform/core.
//   node bake_people.js <dir with glb> <dir with palette png> out.json
const fs = require('fs'), path = require('path');
const req = n => require(require.resolve(n, { paths: [process.cwd(), __dirname] }));
const { NodeIO } = req('@gltf-transform/core');
const CHARS = [['casual_Male_G', 'm'], ['casual_Male_K', 'm'], ['casual_Female_G', 'f'], ['casual_Female_K', 'f'], ['elder_Female_A', 'f', 'old'], ['little_boy_B', 'm', 'kid'], ['tradesperson_man', 'm', 'work'], ['worker_Male_constructor_B', 'm', 'work']];
const CLIPS = { m_walk: 'locom_m_basicWalk_30f', m_slow: 'locom_m_slowWalk_40f', m_phone: 'locom_m_phoneWalking_40f', m_run: 'locom_m_running_20f', m_idle: 'idle_m_1_200f', m_talk: 'idle_phoneTalking_180f',
  f_walk: 'locom_f_basicWalk_30f', f_slow: 'locom_f_slowWalk_40f', f_phone: 'locom_f_phoneWalking_40f', f_run: 'locom_f_running_20f', f_idle: 'idle_f_1_150f' };
const PALS = ['people_pal', 'people_pal_s1', 'people_pal_s3', 'people_pal_s5', 'people_pal_s8', 'people_pal_s12', 'people_pal_s16', 'people_pal_s20'];
// 4x4 column-major helpers
const mulM = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const mulV = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
function inv(m) { // affine inverse
  const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  const r = [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, 0, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, 0, C / det, -(a * h - b * g) / det, (a * e - b * d) / det, 0, 0, 0, 0, 1];
  const t = [m[12], m[13], m[14]]; r[12] = -(r[0] * t[0] + r[4] * t[1] + r[8] * t[2]); r[13] = -(r[1] * t[0] + r[5] * t[1] + r[9] * t[2]); r[14] = -(r[2] * t[0] + r[6] * t[1] + r[10] * t[2]); return r;
}
function compose(t, q, s) { const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0, (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1]; }
function quatOf(m) { // rotation of a matrix (scale removed)
  const sx = Math.hypot(m[0], m[1], m[2]), sy = Math.hypot(m[4], m[5], m[6]), sz = Math.hypot(m[8], m[9], m[10]);
  const m11 = m[0] / sx, m21 = m[1] / sx, m31 = m[2] / sx, m12 = m[4] / sy, m22 = m[5] / sy, m32 = m[6] / sy, m13 = m[8] / sz, m23 = m[9] / sz, m33 = m[10] / sz, tr = m11 + m22 + m33; let q;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); q = [(m32 - m23) * s, (m13 - m31) * s, (m21 - m12) * s, 0.25 / s]; }
  else if (m11 > m22 && m11 > m33) { const s = 2 * Math.sqrt(1 + m11 - m22 - m33); q = [0.25 * s, (m12 + m21) / s, (m13 + m31) / s, (m32 - m23) / s]; }
  else if (m22 > m33) { const s = 2 * Math.sqrt(1 + m22 - m11 - m33); q = [(m12 + m21) / s, 0.25 * s, (m23 + m32) / s, (m13 - m31) / s]; }
  else { const s = 2 * Math.sqrt(1 + m33 - m11 - m22); q = [(m13 + m31) / s, (m23 + m32) / s, 0.25 * s, (m21 - m12) / s]; }
  const l = Math.hypot(...q); return q.map(v => v / l);
}
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
function sample(s, t) { // LINEAR sampler -> value at t
  const inp = s.getInput(), out = s.getOutput(), n = inp.getCount(); let i = 0; while (i < n - 2 && inp.getScalar(i + 1) <= t) i++;
  const t0 = inp.getScalar(i), t1 = inp.getScalar(Math.min(n - 1, i + 1)), f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0, a = out.getElement(i, []), b = out.getElement(Math.min(n - 1, i + 1), []);
  if (a.length === 4) { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; const sg = d < 0 ? -1 : 1; const q = a.map((v, k) => v + (b[k] * sg - v) * f), l = Math.hypot(...q); return q.map(v => v / l); }
  return a.map((v, k) => v + (b[k] - v) * f);
}
function rigOf(root) { // bones = every joint of every skin, parents first
  const set = new Set(); for (const s of root.listSkins()) for (const j of s.listJoints()) set.add(j);
  const order = []; const visit = n => { if (set.has(n)) order.push(n); for (const c of n.listChildren()) visit(c); };
  for (const sc of root.listScenes()) for (const n of sc.listChildren()) visit(n);
  const parent = n => { let p = n.getParentNode(); while (p && !set.has(p)) p = p.getParentNode && p.getParentNode(); return p && set.has(p) ? order.indexOf(p) : -1; };
  return order.map(n => ({ node: n, name: n.getName(), parent: parent(n) }));
}
(async () => {
  const [dir, palDir, dst] = process.argv.slice(2), io = new NodeIO(), res = { chars: {}, clips: {}, pal: PALS.map(p => fs.readFileSync(path.join(palDir, p + '.png')).toString('base64')) };
  for (const [name, sex, tag] of CHARS) {
    const root = (await io.read(path.join(dir, name + '.glb'))).getRoot(), rig = rigOf(root), idx = new Map(rig.map((b, i) => [b.node, i]));
    const world = rig.map(b => b.node.getWorldMatrix());
    const P = [], UV = [], SI = [], SW = [], I = [];
    for (const node of root.listNodes()) {
      const mesh = node.getMesh(), skin = node.getSkin(); if (!mesh || !skin) continue;
      const joints = skin.listJoints(), ibm = skin.getInverseBindMatrices();
      const jm = joints.map((j, k) => mulM(j.getWorldMatrix(), ibm.getElement(k, [])));
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0'), ji = prim.getAttribute('JOINTS_0'), jw = prim.getAttribute('WEIGHTS_0'), ind = prim.getIndices(), base = P.length / 3;
        for (let v = 0; v < pos.getCount(); v++) {
          const p = pos.getElement(v, []), j = ji.getElement(v, []), w = jw.getElement(v, []), sw = w.reduce((a, b) => a + b, 0) || 1; let o = [0, 0, 0];
          const pairs = j.map((jj, k) => [idx.get(joints[jj]), w[k] / sw]).filter(e => e[1] > 0.001).sort((a, b) => b[1] - a[1]);
          for (let k = 0; k < 4; k++) if (w[k] > 0) { const q = mulV(jm[j[k]], p); o = o.map((c, a) => c + q[a] * w[k] / sw); }
          P.push(...o); const u = uv.getElement(v, []); UV.push(u[0], u[1]);
          const tot = pairs.reduce((a, e) => a + e[1], 0); let acc = 0;
          for (let k = 0; k < 4; k++) { const e = pairs[k]; SI.push(e ? e[0] : 0); const q = e ? Math.round(e[1] / tot * 255) : 0; SW.push(q); acc += q; }
          SW[SW.length - 4] += 255 - acc;
        }
        for (let k = 0; k < ind.getCount(); k++) I.push(base + ind.getScalar(k));
      }
    }
    { // weld the vertices split for hard normals (the game shades flat): same place, same colour, same bones
      const key = new Map(), map = [], p2 = [], u2 = [], s2 = [], w2 = [];
      for (let v = 0; v < P.length / 3; v++) { const kk = [Math.round(P[v * 3] * 2000), Math.round(P[v * 3 + 1] * 2000), Math.round(P[v * 3 + 2] * 2000), Math.round(UV[v * 2] * 512), Math.round(UV[v * 2 + 1] * 512), SI[v * 4], SI[v * 4 + 1]].join(',');
        let j = key.get(kk); if (j === undefined) { j = p2.length / 3; key.set(kk, j); p2.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); u2.push(UV[v * 2], UV[v * 2 + 1]); for (let q = 0; q < 4; q++) { s2.push(SI[v * 4 + q]); w2.push(SW[v * 4 + q]); } } map.push(j); }
      P.length = 0; P.push(...p2); UV.length = 0; UV.push(...u2); SI.length = 0; SI.push(...s2); SW.length = 0; SW.push(...w2); for (let q = 0; q < I.length; q++) I[q] = map[I[q]];
    }
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < P.length; i++) { mn[i % 3] = Math.min(mn[i % 3], P[i]); mx[i % 3] = Math.max(mx[i % 3], P[i]); }
    const k = 32767 / 2.2, pq = new Int16Array(P.length); for (let i = 0; i < P.length; i++) pq[i] = Math.round(P[i] * k);
    const uq = new Uint16Array(UV.length); for (let i = 0; i < UV.length; i++) uq[i] = Math.round(Math.min(1, Math.max(0, UV[i] - Math.floor(UV[i]))) * 65535);
    res.chars[name] = { sex, tag: tag || '', n: P.length / 3, h: +(mx[1] - mn[1]).toFixed(3), p: b64(pq), uv: b64(uq), si: b64(new Uint8Array(SI)), sw: b64(new Uint8Array(SW)), i: b64(new Uint16Array(I)),
      bones: rig.map((b, i) => ({ n: b.name.replace('bip ', ''), p: b.parent, m: (b.parent < 0 ? world[i] : mulM(inv(world[b.parent]), world[i])).map(v => +v.toFixed(5)) })) };
    console.log(name, 'verts', P.length / 3, 'tris', I.length / 3, 'bones', rig.length, 'min', mn.map(v => v.toFixed(2)), 'max', mx.map(v => v.toFixed(2)), 'roots', rig.filter(b => b.parent < 0).map(b => b.name));
  }
  for (const [cn, file] of Object.entries(CLIPS)) {
    const root = (await io.read(path.join(dir, file + '.glb'))).getRoot(), rig = rigOf(root), anim = root.listAnimations()[0];
    const ch = new Map(); let dur = 0;
    for (const c of anim.listChannels()) { const n = c.getTargetNode(); if (!ch.has(n)) ch.set(n, {}); ch.get(n)[c.getTargetPath()] = c.getSampler(); dur = Math.max(dur, c.getSampler().getInput().getMax([])[0]); }
    const fps = dur > 3 ? 12 : 24, frames = Math.round(dur * fps), Q = new Int16Array(frames * rig.length * 4), Y = [];
    const wm = new Map(), worldAt = (n, t) => { if (!n || !n.getTranslation) return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; if (wm.has(n)) return wm.get(n); const c = ch.get(n) || {};
      const l = compose(c.translation ? sample(c.translation, t) : n.getTranslation(), c.rotation ? sample(c.rotation, t) : n.getRotation(), c.scale ? sample(c.scale, t) : n.getScale());
      const p = n.getParentNode(), w = p && p.getTranslation ? mulM(worldAt(p, t), l) : l; wm.set(n, w); return w; };
    let prev = null;
    for (let f = 0; f < frames; f++) { wm.clear(); const t = f / fps, W = rig.map(b => worldAt(b.node, t));
      rig.forEach((b, i) => { let q = quatOf(b.parent < 0 ? W[i] : mulM(inv(W[b.parent]), W[i]));
        if (prev) { const o = (f - 1) * rig.length * 4 + i * 4; if (q[0] * prev[o] + q[1] * prev[o + 1] + q[2] * prev[o + 2] + q[3] * prev[o + 3] < 0) q = q.map(v => -v); }
        for (let k = 0; k < 4; k++) Q[(f * rig.length + i) * 4 + k] = Math.round(q[k] * 32767); });
      prev = Q; const r = rig.findIndex(b => b.parent < 0); Y.push(W[r][12], W[r][13], W[r][14]); }
    const xs = Y.filter((_, i) => i % 3 === 0), ys = Y.filter((_, i) => i % 3 === 1), zs = Y.filter((_, i) => i % 3 === 2);
    res.clips[cn] = { fps, f: frames, bones: rig.map(b => b.name.replace('bip ', '')), q: b64(Q), y: ys.map(v => +v.toFixed(4)), hip: +(ys.reduce((a, b) => a + b, 0) / frames).toFixed(4) };
    console.log(cn, 'dur', dur.toFixed(2), 'frames', frames, 'hip x', Math.min(...xs).toFixed(2), Math.max(...xs).toFixed(2), 'y', Math.min(...ys).toFixed(2), Math.max(...ys).toFixed(2), 'z', Math.min(...zs).toFixed(2), Math.max(...zs).toFixed(2));
  }
  fs.writeFileSync(dst, JSON.stringify(res)); console.log(dst, fs.statSync(dst).size, 'bytes');
})().catch(e => { console.error(e); process.exit(1); });
