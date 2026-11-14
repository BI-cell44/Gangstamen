// graph nodes a car can really reach: inside the play area (the barriers at the edges), south of the tram wall, on dry
// land. Targets outside used to drive bots and traffic into the barriers, where they stayed stuck.
let NODE_OK = null;
function nodeOk(n) {
  if (!NODE_OK) {
    NODE_OK = new Uint8Array(G.x.length);
    for (let i = 0; i < G.x.length; i++) { const x = G.x[i], z = G.z[i];
      NODE_OK[i] = G.adj[i].length && Math.abs(x - CX) < HX - 9 && Math.abs(z - CZ) < HZ - 9 && z > tramWall(x) + 4 && groundH(x, z) > WATER_Y + 1 ? 1 : 0; }
  }
  return NODE_OK[n] === 1;
}
// unstick: a car that keeps backing up out of the same spot is put back on the nearest good street, out of sight
function unstickFar(c, nav) {
  nav.backs = (nav.backs || []).filter(t => performance.now() - t < 15000); nav.backs.push(performance.now());
  if (nav.backs.length < 3 || minPlayerSight(c) < 70) return false;
  let best = -1, bd = 1e18;
  for (let i = 0; i < G.x.length; i++) { if (!nodeOk(i) || !G.out[i].some(n => edgeW(i, n) >= 6)) continue; const d = (G.x[i] - c.x) ** 2 + (G.z[i] - c.z) ** 2; if (d > 400 && d < bd) { bd = d; best = i; } }
  if (best < 0) return false;
  const nb = G.out[best].find(n => edgeW(best, n) >= 6) ?? G.adj[best][0];
  c.place(G.x[best], G.z[best], Math.atan2(-(G.x[nb] - G.x[best]), -(G.z[nb] - G.z[best]))); nav.backs = []; nav.back = 0; nav.stuck = 0;
  return nb;
}
function minPlayerSight(c) { let d = 1e9; for (const p of allPlayerCars()) if (p.alive) d = Math.min(d, Math.hypot(p.x - c.x, p.z - c.z)); return d; }
// ---------- AI ----------
function rivalInput(r, dt) {
  const ai = r.ai;
  let target = null, dp = 1e9;
  const foes = [...allPlayerCars(), ...(teamMode ? rivals : []), ...(gx ? gx.foes() : []), ...(gx && gx.copsOn ? gx.copsOn(r) : [])].filter(c => c.alive && enemies(r, c));
  for (const c of foes) { const d = Math.hypot(c.x - r.x, c.z - r.z); if (d < dp) { dp = d; target = c; } }
  let los = false;
  if (target && dp < 110) los = segHit(r.x, r.z, (target.x - r.x) / dp, (target.z - r.z) / dp, dp) >= dp - 0.5;
  if (target && los && dp < 90) { ai.mode = 'hunt'; ai.lost = 0; ai.tgt = target; }
  if (ai.mode === 'hunt') {
    ai.lost += los ? 0 : dt;
    if (ai.lost > 6 || !ai.tgt || !ai.tgt.alive) { ai.mode = 'cruise'; ai.prev = -1; ai.target = nearestNode(r.x, r.z); }
  }
  let tx, tz, thr;
  ai.firing = 0;
  if (ai.mode === 'hunt') {
    const T = ai.tgt; dp = Math.hypot(T.x - r.x, T.z - r.z);
    tx = T.x + T.vx * 0.6; tz = T.z + T.vz * 0.6; thr = dp < 14 ? 0.6 : 1;
  } else {
    tx = G.x[ai.target]; tz = G.z[ai.target]; thr = 0.75;
    if (Math.hypot(tx - r.x, tz - r.z) < 7) {
      let opts = G.adj[ai.target].filter(n => n !== ai.prev && nodeOk(n)); if (!opts.length) opts = G.adj[ai.target].filter(n => nodeOk(n));
      let nx = opts.length ? opts[(rnd() * opts.length) | 0] : (ai.prev >= 0 ? ai.prev : ai.target);
      if (ai.goal && opts.length && rnd() < 0.75) nx = opts.reduce((b, n) => Math.hypot(G.x[n] - ai.goal.x, G.z[n] - ai.goal.z) < Math.hypot(G.x[b] - ai.goal.x, G.z[b] - ai.goal.z) ? n : b, opts[0]);
      ai.prev = ai.target; ai.target = nx;
    }
  }
  const want = Math.atan2(-(tx - r.x), -(tz - r.z));
  let diff = want - r.h; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const s = Math.max(-1, Math.min(1, diff * 2.2));
  if (Math.abs(diff) > 1.2) thr *= 0.5;
  if (ai.back > 0) { ai.back -= dt; return { t: -1, s: -s, hb: false }; }
  if (r.speed < 1.2 && thr > 0) { ai.stuck += dt; if (ai.stuck > 1.1) { ai.back = 1.1; ai.stuck = 0; if (ai.mode !== 'hunt') { const nb = unstickFar(r, ai); if (nb !== false) { ai.prev = -1; ai.target = nb; ai.back = 0; } } } } else ai.stuck = 0;
  ai.burst -= dt;
  if (ai.mode === 'hunt' && los && dp < 60 && Math.abs(diff) < 0.22) {
    ai.firing = 1;
    if (ai.burst <= 0) { ai.burst = 0.16; if (Math.random() < 0.85) shoot(r, foes, 2.2, 70, 0.09, true); }
  }
  return { t: thr, s, hb: false };
}

function axisPt(c, px, pz) { // a bus is a segment of circles along its length
  if (!c.long) return [c.x, c.z];
  const [fx, fz] = c.fwd, u = Math.max(-c.long, Math.min(c.long, (px - c.x) * fx + (pz - c.z) * fz)); return [c.x + fx * u, c.z + fz * u];
}
function carVsCar(a, b) {
  if ((a.long || b.long) && Math.abs(a.x - b.x) + Math.abs(a.z - b.z) > 30) return;
  const [ax_, az_] = axisPt(a, b.x, b.z), [bx_, bz_] = axisPt(b, ax_, az_), [ax2, az2] = axisPt(a, bx_, bz_);
  const dx = bx_ - ax2, dz = bz_ - az2, d = Math.hypot(dx, dz), min = R_CAR * 2 * (a.long || b.long ? 0.75 : 1);
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d;
  // a car simulated on another machine does not move here: only our side reacts
  const aFix = !!(a.remote || a.proxy), bFix = !!(b.remote || b.proxy);
  if (aFix && bFix) return;
  const ma = CAT_MASS[a.style] || (a.long ? 2.5 : 1), mb = CAT_MASS[b.style] || (b.long ? 2.5 : 1), ka = aFix ? 0 : bFix ? 1 : mb / (ma + mb), kb = bFix ? 0 : aFix ? 1 : ma / (ma + mb); // heavier pushes harder
  const push = min - d;
  if (!aFix) { a.x -= nx * push * ka; a.z -= nz * push * ka; }
  if (!bFix) { b.x += nx * push * kb; b.z += nz * push * kb; }
  const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rv < 0) {
    const j = -rv * 0.8;
    if (-rv > 2.5 && locals[0] && (a === locals[0].car || b === locals[0].car)) sfx.impact(-rv); // crash under the player's ears
    if (!aFix) { a.vx -= nx * j * 2 * ka; a.vz -= nz * j * 2 * ka; }
    if (!bFix) { b.vx += nx * j * 2 * kb; b.vz += nz * j * 2 * kb; }
    if (-rv > 6 && enemies(a, b)) {
      spawnFx(a.x + nx * R_CAR, 1, a.z + nz * R_CAR, 0.5, 0xffe28a, 0.2, 2, 2);
      const dmg = (-rv - 4) * 1.6;
      const aInto = a.vx * nx + a.vz * nz > -(b.vx * nx + b.vz * nz);
      const da = aInto ? dmg * 0.4 : dmg, db = aInto ? dmg : dmg * 0.4;
      if (!aFix) damage(a, da, b.local ? b : (b.remote ? { remotePeer: b.remote.peer } : b));
      if (!bFix) damage(b, db, a.local ? a : (a.remote ? { remotePeer: a.remote.peer } : a));
      if (a.local) rumbleFor(a.owner, Math.min(1, -rv / 20), 0.5, 200);
      if (b.local) rumbleFor(b.owner, Math.min(1, -rv / 20), 0.5, 200);
    }
  }
}

