  // ---------- police ----------
  const heat = L => L.heat || 0;
  const stars = L => Math.min(5, Math.floor(heat(L)));
  function addHeat(by, amount, why) {
    const L = by && by.local ? by.owner : null; if (!L || mode === 'online' && false) return;
    if (!policeOn()) return;
    if (L.car && L.car.style === 'police') amount *= 0.5; // (cycle 13) in a police car, the others look away more often
    const before = stars(L); L.heat = Math.min(5.99, heat(L) + amount); L.calm = 0;
    if (stars(L) > before) { flashFor(L, '★'.repeat(stars(L)) + ' POLICE', stars(L) === 1 ? 'Les flics ont vu ça' : stars(L) >= 4 ? 'Toutes les patrouilles sur vous' : 'Renforts en route'); if (gx.dj) gx.dj('police', stars(L)); }
  }
  function policeOn() { return !(mission && mission.noPolice); }
  function spawnCop(L) {
    const n = spawnNode(110, 220); if (n < 0) return;
    const c = makeNpc('cop'); placeOnGraph(c, n); c.ai = { mode: 'hunt' }; c.chase = L; c.lost = 0; c.fireCd = 1; npcs.push(c);
  }
  // patrol: a police car that drives like the traffic until it sees a Rapace (or the player gets wanted)
  function spawnPatrol() {
    const n = spawnNode(120, 240); if (n < 0) return;
    const c = makeNpc('cop'); placeOnGraph(c, n); c.lost = 0; c.fireCd = 1; c.lookT = 0; npcs.push(c);
  }
  function patrolLook(c, dt) {
    if (c.prey && (!c.prey.alive || c.prey.gone || c.lost > 8)) { c.prey = null; c.ai = null; }
    if (c.prey || (c.lookT -= dt) > 0) return; c.lookT = 0.5;
    for (const r of rivals) {
      if (!r.alive || r.gone || r.proxy || r.friendly) continue; const d = near(c, r.x, r.z); if (d > 75) continue;
      if (segHit(c.x, c.z, (r.x - c.x) / d, (r.z - c.z) / d, d) >= d - 0.5) { c.prey = r; c.lost = 0; c.ai = { mode: 'hunt' }; if (minPlayerDist(c.x, c.z) < 90 && gx.dj) gx.dj('copRap'); return; }
    }
  }
  // the police cars after a given Rapace: the Rapace fights back (read by rivalInput)
  const copsOn = r => npcs.filter(c => c.npc === 'cop' && c.prey === r && c.alive);
  function copInput(c, dt) {
    const L = c.chase;
    if (L && (stars(L) < 1 || !L.car.alive)) { c.ai = null; c.chase = null; }
    if (!c.chase && !c.prey) return civInput(c, dt);
    const T = c.chase ? c.chase.car : c.prey, d = near(c, T.x, T.z);
    const los = d < 120 && segHit(c.x, c.z, (T.x - c.x) / d, (T.z - c.z) / d, d) >= d - 0.5;
    if (los && d < 90) { c.lost = 0; if (L) L.calm = 0; } else c.lost += dt;
    const tx = T.x + T.vx * Math.min(1.2, d / 30), tz = T.z + T.vz * Math.min(1.2, d / 30);
    let gx_ = tx, gz = tz;
    if (!los && d > 25) { // follow the streets towards the player
      const n0 = c.nav.b; let best = n0, bd = Math.hypot(G.x[n0] - T.x, G.z[n0] - T.z);
      if (Math.hypot(G.x[n0] - c.x, G.z[n0] - c.z) < 7) {
        for (const nb of G.adj[n0]) { const dd = Math.hypot(G.x[nb] - T.x, G.z[nb] - T.z); if (dd < bd || best === n0) { bd = dd; best = nb; } }
        c.nav.a = n0; c.nav.b = best;
      }
      gx_ = G.x[c.nav.b]; gz = G.z[c.nav.b];
    }
    const diff = wrapA(heading(c.x, c.z, gx_, gz) - c.h);
    const s = Math.max(-1, Math.min(1, diff * 2.4));
    let t = Math.abs(diff) > 1.3 ? 0.5 : 1;
    const nv = c.nav;
    if (nv.back > 0) { nv.back -= dt; return { t: -1, s: -s, hb: false }; }
    if (c.speed < 1.2) { nv.stuck += dt; if (nv.stuck > 1.4) { nv.back = 1; nv.stuck = 0; } } else nv.stuck = 0;
    c.fireCd -= dt;
    if ((c.prey || stars(L) >= 3) && los && d < 55 && Math.abs(diff) < 0.2 && c.fireCd <= 0) { c.fireCd = 0.22; shoot(c, [T], c.prey ? 2 : 1.3, 60, 0.12, true); }
    return { t, s, hb: Math.abs(diff) > 1.1 && c.speed > 12 };
  }

