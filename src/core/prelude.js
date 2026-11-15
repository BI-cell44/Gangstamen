(() => {
'use strict';
// boot timing (cycle 3): BOOT.mark(name) records the time since the script started; shown by F3 and the tests
const BOOT = { t0: performance.now(), last: performance.now(), marks: [], mark(n) { const t = performance.now(); this.marks.push([n, Math.round(t - this.last)]); this.last = t; } };
const W = JSON.parse(document.getElementById('world').textContent);
BOOT.mark('lecture du monde (JSON)');
const HX = W.meta.hx, HZ = W.meta.hz, CX = W.meta.cx || 0, CZ = W.meta.cz || 0; // play area: centre (CX, CZ), half sizes (HX, HZ), around the old Chantenay origin
// IGN RGE ALTI ground model, 12.5 m grid, heights in decimetres
const DEM = W.dem;
const WATER_Y = 0.4;
function groundH(x, z) {
  if (!DEM) return 0;
  let fx = (x - DEM.x0) / DEM.step, fz = (z - DEM.z0) / DEM.step;
  fx = Math.max(0, Math.min(DEM.nx - 1.001, fx)); fz = Math.max(0, Math.min(DEM.nz - 1.001, fz));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, H = DEM.h, n = DEM.nx;
  const a = H[j * n + i], b = H[j * n + i + 1], c = H[(j + 1) * n + i], d = H[(j + 1) * n + i + 1];
  // same two triangles per cell as the terrain mesh, so anything placed with groundH sits exactly on the visible ground
  return (u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v)) / 10;
}
// Bridges (deck heights computed offline): the drivable surface is the deck where there is one
// the deck ends meet the ground: the bridge profiles were computed on a coarser grid, so the last metres are
// eased onto the terrain (otherwise one end of the boulevard bridge stood half a metre above the street)
(W.bridges || []).forEach(b => {
  const p = b.p, n = p.length / 3; if (n < 2) return;
  for (const [i0, dir] of [[0, 1], [n - 1, -1]]) {
    const d0 = groundH(p[3 * i0], p[3 * i0 + 1]) - p[3 * i0 + 2]; let s = 0;
    for (let i = i0; i >= 0 && i < n; i += dir) {
      if (i !== i0) s += Math.hypot(p[3 * i] - p[3 * (i - dir)], p[3 * i + 1] - p[3 * (i - dir) + 1]);
      if (s > 12) break;
      const k = 1 - s / 12; p[3 * i + 2] += d0 * k * k * (3 - 2 * k);
    }
  }
});
const BR_SEGS = [];
(W.bridges || []).forEach(b => { const p = b.p; for (let i = 0; i < p.length - 3; i += 3) BR_SEGS.push([p[i], p[i + 1], p[i + 2], p[i + 3], p[i + 4], p[i + 5], b.w / 2 + 0.4]); });
const DECKS = []; // moving decks (the ferry): functions (x, z) -> height or null
function deckH(x, z) {
  let best = null;
  for (const f of DECKS) { const y = f(x, z); if (y !== null && (best === null || y > best)) best = y; }
  for (const [ax, az, ay, bx, bz, by, hw] of BR_SEGS) {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6;
    const t = ((x - ax) * dx + (z - az) * dz) / L2; if (t < -0.02 || t > 1.02) continue;
    const px = ax + dx * t - x, pz = az + dz * t - z; if (px * px + pz * pz > hw * hw) continue;
    const y = ay + (by - ay) * Math.max(0, Math.min(1, t)) + 0.32; if (best === null || y > best) best = y;
  }
  return best;
}
function surfaceH(x, z) { const g = groundH(x, z), d = deckH(x, z); return d !== null && d > g ? d - 0.32 : g; }
const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

if (!window.THREE) {
  $('start').textContent = 'Three.js n’a pas pu se charger';
  return;
}

