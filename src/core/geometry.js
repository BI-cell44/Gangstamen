// ---------- geometry helpers ----------
class Buf {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  tri(a, b, c, n, ua, ub, uc, col) {
    // make the winding face the wanted normal n
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (cx * n[0] + cy * n[1] + cz * n[2] < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; }
    this.p.push(...a, ...b, ...c);
    this.n.push(...n, ...n, ...n);
    if (ua) this.u.push(...ua, ...ub, ...uc);
    if (col) this.c.push(...col, ...col, ...col);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    if (this.u.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    if (this.c.length) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return g;
  }
}
const col = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const shade = (rgb, f) => rgb.map(v => Math.min(1, v * f));
function signedArea(p) { let a = 0; const n = p.length / 2; for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; } return a / 2; }
function triangulate(p) {
  const pts = []; for (let i = 0; i < p.length; i += 2) pts.push(new THREE.Vector2(p[i], p[i + 1]));
  try { return [pts, THREE.ShapeUtils.triangulateShape(pts, [])]; } catch (e) { return [pts, []]; }
}
function pointInPoly(x, z, p) {
  let ins = false; const n = p.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = p[2 * i], zi = p[2 * i + 1], xj = p[2 * j], zj = p[2 * j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins;
  }
  return ins;
}

