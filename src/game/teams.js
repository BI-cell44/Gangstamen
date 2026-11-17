// ---------- teams ----------
// team -1: on his own (every player in "chacun pour soi"); 0 and 1: the two gangs
const TEAMS = [
  { name: 'Rapaces de la Butte', short: 'Rapaces', one: 'Rapace', css: '#c8202f', body: 0xa3161f, stripe: 0x161616, botBody: 0x16151b, botStripe: 0xc8202f },
  { name: 'Chantenaysiens', short: 'Chantenaysiens', one: 'Chantenaysien', css: '#f2c81e', body: 0xf2c81e, stripe: 0x1e7a3a, botBody: 0x1e5e34, botStripe: 0xf2c81e },
];
let teamMode = false;
function enemies(a, b) { if ((a.friendly && b.local) || (b.friendly && a.local)) return false; return a !== b && (a.team < 0 || b.team < 0 || a.team !== b.team); }
// bases: the Chantenaysiens start on the boulevard de la Liberté, the Rapaces on the top of the butte
let BASES = null;
function roadFrame(road, m) {
  const p = road.p;
  const x2 = p[m + 2] ?? p[m - 2], z2 = p[m + 3] ?? p[m - 1];
  const sg = p[m + 2] !== undefined ? 1 : -1;
  const L = Math.hypot(x2 - p[m], z2 - p[m + 1]) || 1;
  return { x: p[m], z: p[m + 1], ux: sg * (x2 - p[m]) / L, uz: sg * (z2 - p[m + 1]) / L, road };
}
// (17 nov., user) capture the flag (HD): each team starts by its flag, the Rapaces on the place des Garennes, the
// Chantenaysiens in front of the town hall (FLAG_AT in gx/modes.js)
let CTF_BASES = null;
function frameNear(x, z) { let best = null, bd = 1e18; for (const r of W.roads) { if (!r.d || r.b) continue; for (let k = 0; k < r.p.length - 2; k += 2) { const d = (r.p[k] - x) ** 2 + (r.p[k + 1] - z) ** 2; if (d < bd) { bd = d; best = [r, k]; } } } return roadFrame(best[0], best[1]); }
function bases() {
  if (HD && ((mode === 'split' && settings.gmode === 2) || (mode === 'online' && typeof Net !== 'undefined' && Net.gxm === 2))) return CTF_BASES || (CTF_BASES = [frameNear(864, 30), frameNear(160, -440)]);
  if (BASES) return BASES;
  let ni = W.names.indexOf('Boulevard de la Liberté'); if (ni < 0) ni = W.names.indexOf('Place Jean Macé');
  const road = W.roads.find(r => r.d && r.n === ni && !r.b) || W.roads.find(r => r.d && r.w >= 9);
  const lib = roadFrame(road, Math.floor(road.p.length / 4) * 2);
  let best = null, bh = -1e9;
  for (const r of W.roads) {
    if (!r.d || r.b || r.w < 6) continue;
    for (let k = 2; k < r.p.length - 2; k += 2) {
      const x = r.p[k], z = r.p[k + 1];
      if (Math.abs(x - CX) > HX - 30 || Math.abs(z - CZ) > HZ - 30 || Math.hypot(x - lib.x, z - lib.z) < 320 || Math.hypot(x - lib.x, z - lib.z) > 560) continue;
      const h = groundH(x, z); if (h > bh) { bh = h; best = [r, k]; }
    }
  }
  const butte = best ? roadFrame(best[0], best[1]) : lib;
  BASES = [butte, lib];
  return BASES;
}
function baseName(t) { const b = bases()[t]; return W.names[b.road.n] || 'la butte'; }
function teamSpawn(t) { // a random crossing near the gang's base
  const b = bases()[t];
  for (let k = 0; k < 80; k++) {
    const n = (Math.random() * G.x.length) | 0;
    if (G.adj[n].length && Math.hypot(G.x[n] - b.x, G.z[n] - b.z) < 140 && Math.abs(G.x[n] - CX) < HX - 20 && Math.abs(G.z[n] - CZ) < HZ - 20) {
      const nb = G.adj[n][0] ?? n; return [G.x[n], G.z[n], Math.atan2(-(G.x[nb] - G.x[n]), -(G.z[nb] - G.z[n]))];
    }
  }
  return gridSpawn(b, (Math.random() * 6) | 0);
}
function gridSpawn(b, slot) { // two abreast, rows 9 m apart behind the first one
  const back = Math.floor(slot / 2) * 9, side = (slot % 2 ? 2.6 : -2.6);
  return [b.x - b.ux * back - b.uz * side, b.z - b.uz * back + b.ux * side, Math.atan2(-b.ux, -b.uz)];
}
function playerPaint(slot, team, net) {
  if (team >= 0) return [TEAMS[team].body, SLOT_PAINT[slot % 4][0]];
  return net ? [NET_PAINT[(Net.colIdx || 0) % NET_PAINT.length], 0xf2c14e] : SLOT_PAINT[slot];
}
// the six street cars: all Rapaces in "chacun pour soi", three per gang in team games
function botTeam(i) { return teamMode ? i % 2 : 0; }
function setBotTeams() {
  for (const r of rivals) {
    const t = botTeam(r.botIndex), dark = r.botIndex % 3 === 2;
    r.team = t;
    if (r.meshTeam === t) continue;
    const old = r.mesh;
    const body = t === 0 ? (dark ? 0x2a2d33 : TEAMS[0].botBody) : (dark ? 0x2b4a36 : TEAMS[1].botBody);
    r.mesh = makeCar(body, TEAMS[t].botStripe, false, dark ? 'saloon' : 'hatch');
    r.mesh.position.copy(old.position); r.mesh.rotation.copy(old.rotation);
    scene.remove(old); r.meshTeam = t;
    if (!r.alive) { r.mesh.userData.mBody.color.setHex(0x1a1414); r.mesh.userData.mPaint.color.setHex(0x1a1414); }
  }
}
function botLabel(c, many) { const t = TEAMS[c && c.team >= 0 ? c.team : 0]; return many ? 'les ' + t.short : t.one; }
let mode = 'solo', night = false, started = false, paused = false;

function nearestNode(x, z) {
  let best = 0, bd = 1e18;
  for (let i = 0; i < G.x.length; i++) { const d = (G.x[i] - x) ** 2 + (G.z[i] - z) ** 2; if (d < bd && G.adj[i].length && nodeOk(i)) { bd = d; best = i; } }
  return best;
}
function farNode(fromX, fromZ, minD) {
  for (let k = 0; k < 200; k++) {
    const i = (rnd() * G.x.length) | 0;
    if (G.adj[i].length && Math.hypot(G.x[i] - fromX, G.z[i] - fromZ) > minD) return i;
  }
  return (rnd() * G.x.length) | 0;
}
function playersCentre() {
  const cs = allPlayerCars(); if (!cs.length) return [0, 0];
  let x = 0, z = 0; for (const c of cs) { x += c.x; z += c.z; } return [x / cs.length, z / cs.length];
}
function spawnRival(r) {
  if (teamMode && r.team >= 0) r.place(...teamSpawn(r.team));
  else {
    const [cx, cz] = playersCentre();
    const n = farNode(cx, cz, 200), nb = G.adj[n][0] ?? n;
    r.place(G.x[n], G.z[n], Math.atan2(-(G.x[nb] - G.x[n]), -(G.z[nb] - G.z[n])));
  }
  r.hp = 60; r.alive = true; r.wreck = 0; r.mesh.visible = true; // (hidden if it sank)
  r.mesh.userData.mBody.color.setHex(r.mesh.userData.base); r.mesh.userData.mPaint.color.setHex(r.mesh.userData.paint);
  r.ai = { mode: 'cruise', target: nearestNode(r.x, r.z), prev: -1, stuck: 0, back: 0, lost: 0, burst: 0, firing: 0 };
}
// (15 nov.) at the start of a game the six Rapaces used to be where the menu left them, one of them always on the
// player's starting grid, shooting at once: they now start far away and join the hunt one after the other
function scatterRivals(minD = 320, maxD = 1e9) {
  const [cx, cz] = playersCentre(); let k = 0;
  for (const r of rivals) {
    if (r.proxy || (teamMode && r.team >= 0)) continue;
    let n = -1; for (let i = 0; i < 300 && n < 0; i++) { const j = (rnd() * G.x.length) | 0; if (nodeOk(j) && (d => d > minD && d < maxD)(Math.hypot(G.x[j] - cx, G.z[j] - cz))) n = j; }
    if (n < 0) { spawnRival(r); continue; }
    const nb = G.adj[n][0] ?? n; spawnRival(r);
    r.place(G.x[n], G.z[n], Math.atan2(-(G.x[nb] - G.x[n]), -(G.z[nb] - G.z[n]))); r.ai.target = nearestNode(r.x, r.z);
    r.calmT = 12 + 7 * k++; // seconds of cruising before it starts looking for players
  }
}
function spawnPickup(pk) {
  const [cx, cz] = playersCentre();
  const n = farNode(cx, cz, 120);
  pk.x = G.x[n]; pk.z = G.z[n]; pk.on = true; pk.mesh.visible = true;
}
// start line on the boulevard de la Liberté; players line up along it
function spawnPoint(slot, team) {
  if (isRace()) return raceSpawn(slot);
  if (team >= 0) { // each gang has its own starting grid, numbered within the gang
    const rank = locals.filter(L => L.team === team).length;
    return gridSpawn(bases()[team], rank);
  }
  return gridSpawn(bases()[1], slot);
}
// (17 nov., user) checkpoint race: one starting grid on the boulevard de la Liberté, split screen and online alike,
// cars turned towards the first checkpoint; the finish line is on the grid (the race is a loop)
const RACE_CP1 = [56, 50]; // a node of the street graph: the marker is not moved, the cars point right at it
function isRace() { return HD && ((mode === 'split' && settings.gmode === 4) || (mode === 'online' && typeof Net !== 'undefined' && Net.gxm === 4)); }
function raceGrid() {
  const b = bases()[1], tx = RACE_CP1[0] - b.x, tz = RACE_CP1[1] - b.z, s = tx * b.ux + tz * b.uz < 0 ? -1 : 1;
  const g = { x: b.x, z: b.z, ux: b.ux * s, uz: b.uz * s, road: b.road };
  return g;
}
function raceSpawn(slot) { const p = gridSpawn(raceGrid(), slot); p[2] = Math.atan2(-(RACE_CP1[0] - p[0]), -(RACE_CP1[1] - p[1])); return p; }
function onlineSpawn(team) { return isRace() ? raceSpawn(Net.gridSlot || 0) : team >= 0 ? teamSpawn(team) : randomSpawn(); }
function randomSpawn() { // Math.random, not the seeded generator: every client must land somewhere different
  let n = 0; for (let k = 0; k < 50; k++) { n = (Math.random() * G.x.length) | 0; if (G.adj[n].length && Math.abs(G.x[n] - CX) < HX - 20 && Math.abs(G.z[n] - CZ) < HZ - 20) break; }
  const nb = G.adj[n][0] ?? n;
  return [G.x[n], G.z[n], Math.atan2(-(G.x[nb] - G.x[n]), -(G.z[nb] - G.z[n]))];
}
// HD: each player picks a car (look and a touch of handling) and its colours before the game
const CAR_CHOICES = [
  { k: 'saloon', name: 'Berline', v: 1, a: 1, d: 'Équilibrée, la plus rapide' },
  { k: 'p205', name: '205', v: 0.98, a: 1.1, d: 'Nerveuse' },
  { k: 'hatch', name: 'Compacte', v: 0.96, a: 1.06, d: 'Avec aileron' },
  { k: 'r5', name: 'R5', v: 0.93, a: 1.14, d: 'Petite et vive' },
  { k: 'twingo', name: 'Twingo', v: 0.91, a: 1.1, d: 'Bouille de 1993' },
  { k: 'sport', name: 'Coupé sport', v: 1.08, a: 1.16, d: 'Années 90, turbo, rapide mais fragile' },
  { k: 'van', name: 'Utilitaire', v: 0.82, a: 0.85, d: 'Lourd et lent, encaisse les coups et pousse les autres' },
  { k: 'police', name: 'Voiture de police', v: 1, a: 1.02, d: 'Réformée : les flics te cherchent moins' },
];
const CAT_DMG = { van: 0.65, sport: 1.25 }, CAT_MASS = { van: 1.7, sport: 0.9 }; // damage and push by category (cycle 13)
const CAR_PAINTS = [[0x5b2ba6, 0xf2c14e], [0xb3121f, 0xf3ead8], [0x0f5d8c, 0xf2c14e], [0x1d1d22, 0xd8a43c], [0xf2f2ee, 0x1b2f8a], [0x2b6b3a, 0xf3ead8], [0xe86a1a, 0x161616], [0xd8b23a, 0x161616], [0x1f8a8a, 0xf3ead8], [0xc23b6e, 0xf3ead8]];
function carChoice(slot) { const c = (settings.cars || [])[slot] || {}; return { style: CAR_CHOICES.find(o => o.k === c.s) || CAR_CHOICES[0], paint: CAR_PAINTS[c.p ?? [0, 8, 6, 5][slot]] || CAR_PAINTS[0] }; }
function makeLocal(slot, ctl, paint, team = -1) {
  const ch = HD ? carChoice(slot) : null;
  if (ch && team < 0) paint = ch.paint;
  let [c1, c2] = paint;
  // garage options of the solo car (cycle 12): free colour, rims, tinted windows, spoiler
  const gc = HD && slot === 0 && team < 0 ? (settings.cars || [])[0] : null;
  if (gc && gc.col != null) c1 = gc.col;
  const car = new Car(makeCar(c1, c2, true, ch ? ch.style.k : 'saloon', gc ? { rim: gc.rim ?? null, tint: !!gc.tint, spoiler: !!gc.spoiler } : undefined), true);
  if (gc && mode === 'solo') car.tune = { ...(gc.tune || {}) };
  if (ch) { car.style = ch.style.k; car.baseV = 44 * ch.style.v; car.baseA = ch.style.a; car.maxV = car.baseV; car.accK = car.baseA; }
  car.local = true;
  const L = { slot, ctl, car, cam: new THREE.PerspectiveCamera(56, 1, 0.5, 2200), camMode: 0, look: null, respect: 0, kills: 0, deadT: 0, fireCd: 0,
    hud: null, vp: { x: 0, y: 0, w: 1, h: 1 }, tickT: 0, street: '', streetAcc: 1, colour: '#' + new THREE.Color(c1).getHexString() };
  car.owner = L; L.team = team; car.team = team;
  const sp = mode === 'online' ? onlineSpawn(team) : spawnPoint(slot, team);
  car.place(...sp); L.spawn = sp;
  return L;
}
function allPlayerCars() {
  const out = locals.map(L => L.car);
  for (const R of Net.remotes.values()) out.push(R.car);
  return out;
}
function setupWorldActors() {
  for (let i = 0; i < 6; i++) {
    const r = new Car(makeCar(i % 3 === 2 ? 0x2a2d33 : 0x16151b, 0xc8202f, false, i % 3 === 2 ? 'saloon' : 'hatch'), false);
    r.botIndex = i; r.team = 0; r.meshTeam = 0; rivals.push(r); spawnRival(r);
  }
  const pg = new THREE.BoxGeometry(1.2, 1.2, 1.2), pm = new THREE.MeshBasicMaterial({ color: 0x7be07b });
  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(pg, pm); scene.add(mesh);
    const pk = { mesh, x: 0, z: 0, on: true }; pickups.push(pk); spawnPickup(pk);
  }
}
function unstick(L) {
  const c = L.car, n = nearestNode(c.x, c.z), nb = G.adj[n][0] ?? n;
  c.place(G.x[n], G.z[n], Math.atan2(-(G.x[nb] - G.x[n]), -(G.z[nb] - G.z[n])));
}

