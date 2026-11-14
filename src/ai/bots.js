// ---------- AI ----------
function rivalInput(r, dt) {
  const ai = r.ai;
  let target = null, dp = 1e9;
  const foes = [...allPlayerCars(), ...(teamMode ? rivals : []), ...(gx ? gx.foes() : [])].filter(c => c.alive && enemies(r, c));
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
      const opts = G.adj[ai.target].filter(n => n !== ai.prev);
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
  if (r.speed < 1.2 && thr > 0) { ai.stuck += dt; if (ai.stuck > 1.1) { ai.back = 1.1; ai.stuck = 0; } } else ai.stuck = 0;
  ai.burst -= dt;
  if (ai.mode === 'hunt' && los && dp < 60 && Math.abs(diff) < 0.22) {
    ai.firing = 1;
    if (ai.burst <= 0) { ai.burst = 0.16; if (Math.random() < 0.85) shoot(r, foes, 2.2, 70, 0.09, true); }
  }
  return { t: thr, s, hb: false };
}

function carVsCar(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = R_CAR * 2;
  if (d >= min || d < 1e-4) return;
  const nx = dx / d, nz = dz / d;
  // a car simulated on another machine does not move here: only our side reacts
  const aFix = !!(a.remote || a.proxy), bFix = !!(b.remote || b.proxy);
  if (aFix && bFix) return;
  const push = (min - d) / (aFix || bFix ? 1 : 2);
  if (!aFix) { a.x -= nx * push; a.z -= nz * push; }
  if (!bFix) { b.x += nx * push; b.z += nz * push; }
  const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rv < 0) {
    const j = -rv * 0.8;
    if (-rv > 2.5 && locals[0] && (a === locals[0].car || b === locals[0].car)) sfx.impact(-rv); // crash under the player's ears
    if (!aFix) { a.vx -= nx * j; a.vz -= nz * j; }
    if (!bFix) { b.vx += nx * j; b.vz += nz * j; }
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

