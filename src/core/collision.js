// ---------- collision grid (building walls) ----------
const CELL = 12;
const grid = new Map();
const key = (i, j) => i * 100003 + j;
function gridAdd(seg, pad) {
  const [ax, az, bx, bz] = seg;
  const i0 = Math.floor((Math.min(ax, bx) - pad) / CELL), i1 = Math.floor((Math.max(ax, bx) + pad) / CELL);
  const j0 = Math.floor((Math.min(az, bz) - pad) / CELL), j1 = Math.floor((Math.max(az, bz) + pad) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = key(i, j); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(seg);
  }
}
const cellOf = (x, z) => grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));

