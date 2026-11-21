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
// (19 nov., user) the places a game can start from or be played around: the starting points of the free-driving map
// (gx SpawnMap). [name, x, z, facing x, facing z]; the facing point is optional
const START_PLACES = [
  ['Place Jean-Macé', 59, 228, 160, -440], // (16 nov., user) on the boulevard just above the place, facing up towards the town hall
  ['Mairie de Chantenay', 160, -440], ['Gare de Chantenay', -300, 540],
  ['Place des Garennes · la butte', 864, 30],
  ['Gare Maritime · le bac', 1345, -420], ['Grue grise · pointe de l’île', 1218, 366], ['Nefs Dubigeon', 1958, -363],
];
// the places of the game in progress, HD only: [start of « chacun pour soi » (-1: scattered), place to hold, Rapaces'
// base, Chantenaysiens' base]; chosen in the menu (« Au hasard » drawn here), taken from the host by an online guest
let gamePlaces = null;
const placeFrames = {};
function choosePlaces(fromHost) {
  if (!HD) { gamePlaces = null; return; }
  const n = START_PLACES.length, ok = v => Number.isInteger(v) && v >= 0 && v < n;
  if (fromHost) { gamePlaces = fromHost.map((v, i) => ok(v) ? v : i ? [0, 0, 3, 1][i] : -1); return; }
  const pick = (v, not) => { if (ok(v) && v !== not) return v; let r = 0; for (let k = 0; k < 20; k++) { r = (Math.random() * n) | 0; if (r !== not) break; } return r; };
  const rap = pick(settings.placeRap);
  gamePlaces = [ok(settings.placeFfa) ? settings.placeFfa : -1, pick(settings.placeHill), rap, pick(settings.placeChant, rap)];
}
function placeName(i) { return (START_PLACES[i] || ['?'])[0]; }
function placeFrame(i) { return placeFrames[i] || (placeFrames[i] = frameNear(START_PLACES[i][1], START_PLACES[i][2])); }
// a random crossing within 140 m of a place (start or comeback of an online player, comeback of anyone)
function spotSpawn(b) {
  for (let k = 0; k < 80; k++) {
    const n = (Math.random() * G.x.length) | 0;
    if (G.adj[n].length && nodeOk(n) && Math.hypot(G.x[n] - b.x, G.z[n] - b.z) < 140 && Math.abs(G.x[n] - CX) < HX - 20 && Math.abs(G.z[n] - CZ) < HZ - 20) {
      const nb = G.adj[n][0] ?? n; return [G.x[n], G.z[n], Math.atan2(-(G.x[nb] - G.x[n]), -(G.z[nb] - G.z[n]))];
    }
  }
  return gridSpawn(b, (Math.random() * 6) | 0);
}
function ffaPlace() { return HD && gamePlaces && gamePlaces[0] >= 0 ? placeFrame(gamePlaces[0]) : null; }
// king of the hill: everybody starts and comes back 110 to 260 m from the place to hold, never on it
function isHill() { return HD && gamePlaces && ((mode === 'split' && settings.gmode === 3) || (mode === 'online' && typeof Net !== 'undefined' && Net.gxm === 3)); }
function hillSpawn() {
  const i = gamePlaces[1], [hx, hz] = i ? START_PLACES[i].slice(1, 3) : [45, 283]; // [45, 283]: P.jeanMace (gx), the middle of the place
  for (let k = 0; k < 200; k++) {
    const n = (Math.random() * G.x.length) | 0, d = Math.hypot(G.x[n] - hx, G.z[n] - hz);
    if (G.adj[n].length && nodeOk(n) && d > 110 && d < 260 && Math.abs(G.x[n] - CX) < HX - 20 && Math.abs(G.z[n] - CZ) < HZ - 20) {
      return [G.x[n], G.z[n], Math.atan2(-(hx - G.x[n]), -(hz - G.z[n]))]; // facing the place
    }
  }
  return randomSpawn();
}
function bases() {
  // (19 nov., user) teams and capture the flag: each gang starts at the base picked in the menu
  if (HD && gamePlaces && mode !== 'solo' && (teamMode || (mode === 'split' && settings.gmode === 2) || (mode === 'online' && typeof Net !== 'undefined' && Net.gxm === 2))) return [placeFrame(gamePlaces[2]), placeFrame(gamePlaces[3])];
  return homeBases();
}
// the two historical bases (top of the butte, boulevard de la Liberté): the race grid and the showroom use them
function homeBases() {
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
function baseName(t) { if (HD && gamePlaces && bases() !== BASES) return placeName(gamePlaces[2 + t]); const b = bases()[t]; return W.names[b.road.n] || 'la butte'; }
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
  chiefCheck(r);
}
// (21 nov., audit UX) in the Rapaces hunt, every five KO a chief of the gang comes back in place of a Rapace: named, tougher
// and faster, with his name over the car, worth 400 respect
const CHIEFS = ['Le Grand Duc', 'Le Vautour', 'La Buse', 'L’Épervier', 'Le Milan'];
let chiefKo = 0, chiefN = 0;
function chiefCheck(r) {
  if (r.chief) { r.chief = null; r.maxV = undefined; if (r.chiefTag) { r.mesh.remove(r.chiefTag); r.chiefTag.material.map.dispose(); r.chiefTag.material.dispose(); r.chiefTag = null; } }
  const L = locals[0];
  if (mode !== 'solo' || soloKind !== 'hunt' || !L || (gx && (gx.mission || gx.gmode)) || rivals.some(o => o.chief)) return;
  if ((L.koN || 0) - chiefKo < 5) return;
  chiefKo = L.koN || 0;
  r.chief = CHIEFS[chiefN++ % CHIEFS.length]; r.hp = 180; r.maxV = 40;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const g = cv.getContext('2d');
  g.font = 'bold 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText('♛ ' + r.chief, 256, 50); g.fillStyle = '#ffcf3a'; g.fillText('♛ ' + r.chief, 256, 50);
  const tex = new THREE.CanvasTexture(cv); if (HD) tex.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })); s.scale.set(7, 1.3, 1); s.position.y = 3.6; s.renderOrder = 19;
  r.mesh.add(s); r.chiefTag = s;
  flashFor(L, 'Un chef des Rapaces', r.chief + ' rôde dans le quartier');
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
// (20 nov.) online: the host's wrenches, [x, z] or 0 when taken; a guest shows them, except one it has just taken itself
function pickupsNet() { return pickups.map(pk => pk.on ? [Math.round(pk.x * 10) / 10, Math.round(pk.z * 10) / 10] : 0); }
function applyPickups(a) {
  if (!Array.isArray(a) || a.length !== pickups.length) return;
  pickups.forEach((pk, i) => {
    const s = a[i];
    if (Array.isArray(s) && Number.isFinite(s[0]) && Number.isFinite(s[1])) {
      const moved = Math.hypot(s[0] - pk.x, s[1] - pk.z) > 1;
      // the one I have just taken: the host's state is late until it says « taken » or puts it elsewhere
      if (pk.takenT && !moved) return;
      pk.x = s[0]; pk.z = s[1]; pk.on = true; pk.mesh.visible = true; pk.takenT = 0;
    } else { pk.on = false; pk.mesh.visible = false; pk.takenT = 0; }
  });
}
// the host: a guest has taken wrench i (its presence pt = [i, sequence number])
function guestPicked(R, pt) {
  if (!Array.isArray(pt) || !Number.isInteger(pt[0]) || pt[1] === R.ptSeq) return;
  R.ptSeq = pt[1]; const pk = pickups[pt[0]];
  if (gx && gx.puTaken) return gx.puTaken(pt[0]);
  if (pk && pk.on) { pk.on = false; pk.mesh.visible = false; setTimeout(() => spawnPickup(pk), 12000); }
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
  if (isHill()) return hillSpawn();
  if (HD && gamePlaces) { const f = ffaPlace(); return f ? gridSpawn(f, slot) : randomSpawn(); }
  return gridSpawn(bases()[1], slot);
}
// (17 nov., user) checkpoint race: one starting grid on the boulevard de la Liberté, split screen and online alike,
// cars turned towards the first checkpoint; the finish line is on the grid (the race is a loop)
const RACE_CP1 = [56, 50]; // a node of the street graph: the marker is not moved, the cars point right at it
function isRace() { return HD && ((mode === 'split' && settings.gmode === 4) || (mode === 'online' && typeof Net !== 'undefined' && Net.gxm === 4)); }
function raceGrid() {
  const b = homeBases()[1], tx = RACE_CP1[0] - b.x, tz = RACE_CP1[1] - b.z, s = tx * b.ux + tz * b.uz < 0 ? -1 : 1;
  const g = { x: b.x, z: b.z, ux: b.ux * s, uz: b.uz * s, road: b.road };
  return g;
}
function raceSpawn(slot) { const p = gridSpawn(raceGrid(), slot); p[2] = Math.atan2(-(RACE_CP1[0] - p[0]), -(RACE_CP1[1] - p[1])); return p; }
function onlineSpawn(team) { if (team < 0 && isHill()) return hillSpawn(); const f = team < 0 && ffaPlace(); return isRace() ? raceSpawn(Net.gridSlot || 0) : team >= 0 ? teamSpawn(team) : f ? spotSpawn(f) : randomSpawn(); }
// where a wrecked player comes back: race checkpoint, gang's base, the chosen start of « chacun pour soi », else as before
function respawnPoint(L) {
  const r = gx && gx.raceRespawn && gx.raceRespawn(L); if (r) return r;
  if (L.team >= 0) return teamSpawn(L.team);
  if (isHill()) return hillSpawn();
  const f = ffaPlace(); if (f) return spotSpawn(f);
  return mode === 'online' || (HD && gamePlaces) ? randomSpawn() : L.spawn;
}
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

