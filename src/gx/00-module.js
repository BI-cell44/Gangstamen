// >>> GAMEPLAY MODULE (HD build)
// ================= street life and the solo campaign =================
// Civilian traffic (R5, 205, Twingo), pedestrians who get out of the way, the police when the damage piles up.
// Inlined into the template by build.sh, inside the game's closure: it reads and drives the same state as the core.
const gx = !HD ? null : (() => {
  let mission = null, gx_onGarage = null;
  const npcs = [];          // civilian cars and police cars (Car objects with .npc = 'civ' | 'cop')
  const peds = [];
  let active = false, mapDots = [];
  const R = Math.random;
  const near = (c, x, z) => Math.hypot(c.x - x, c.z - z);
  const players = () => locals.map(L => L.car);
  const minPlayerDist = (x, z) => { let d = 1e9; for (const c of players()) d = Math.min(d, near(c, x, z)); return d; };
  const heading = (ax, az, bx, bz) => Math.atan2(-(bx - ax), -(bz - az));
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const CIV_PAINT = [0xc8c8c4, 0xa31d1d, 0x1d3f8a, 0xe8e0c8, 0x2b6b3a, 0xd8a400, 0x6a6a72, 0x8a1d4a, 0x2a2a2e, 0x4fa0c8, 0xe86a1a, 0x9ab84a];
  const CIV_STYLES = ['r5', 'p205', 'twingo', 'r5', 'p205', 'twingo', 'hatch', 'van'];
  // limits scale with the number of screens
  const budget = () => { const n = Math.max(1, locals.length), k = settings.traffic === 1 ? 0.5 : 1; return { civ: Math.round([14, 10, 8, 7][n - 1] * k), peds: Math.round([64, 44, 34, 26][n - 1] * k) }; };

