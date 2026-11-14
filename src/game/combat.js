// ---------- combat ----------
// hit routing: local cars take damage here; bots are simulated by the host; remote players by their own client
// who knocked a player out: a fight with a gang car in the last 10 s still counts when the player then crashes
const isBot = c => !!c && c.botIndex !== undefined && !c.friendly;
function markFight(c, foe) { if (c && c.local && isBot(foe)) { c.lastBot = foe; c.lastBotT = performance.now(); } }
function applyHit(shooter, target, dmg, ex, ez) {
  spawnFx(ex, 1.2, ez, 0.35, 0xffe28a, 0.15, 0, 1);
  markFight(shooter, target); markFight(target, shooter);
  if (target.npc) return gx.damage(target, dmg, shooter);
  if (target.local) return damage(target, dmg, shooter);
  if (target.remote) { if (shooter && shooter.local) Net.queue('hit', target.remote.peer, dmg); else if (shooter && shooter.botIndex !== undefined && Net.isHost) Net.queue('hit', target.remote.peer, dmg); return; }
  if (target.botIndex !== undefined) {
    if (mode !== 'online' || Net.isHost) return damage(target, dmg, shooter);
    if (shooter && shooter.local) Net.queue('hb', String(target.botIndex), dmg);
  }
}
const _mzV = new THREE.Vector3();
function muzzleOf(c) {
  const m = c.mesh.userData.muzzles;
  if (!m || !m.length) { const [fx, fz] = c.fwd, x = c.x + fx * 2.6, z = c.z + fz * 2.6; return [x, surfaceH(x, z) + 1.0, z]; }
  if (!c.remote && !c.proxy) c.sync(); // the mesh may still be where the last frame left it
  c.mesh.updateMatrixWorld(true);
  c._gun = ((c._gun || 0) + 1) % m.length;
  m[c._gun].getWorldPosition(_mzV);
  return [_mzV.x, _mzV.y, _mzV.z];
}
// tracer end: same height above the ground as the muzzle, or on the car that was hit
function tracerEnd(mx, my, mz, ex, ez, hitCar) {
  if (hitCar) return hitCar.mesh.position.y + 0.75;
  return surfaceH(ex, ez) + Math.max(0.4, my - surfaceH(mx, mz));
}
function shoot(from, targets, dmg, range, spread, enemy) {
  const [fx, fz] = from.fwd;
  const a = (Math.random() - 0.5) * spread, dx = fx * Math.cos(a) - fz * Math.sin(a), dz = fx * Math.sin(a) + fz * Math.cos(a);
  const [ox, oy, oz] = muzzleOf(from);
  let best = segHit(ox, oz, dx, dz, range), hitCar = null;
  for (const t of targets) {
    if (!t.alive || !enemies(from, t)) continue; // bullets pass through teammates
    const px = t.x - ox, pz = t.z - oz, along = px * dx + pz * dz;
    if (along < 0 || along > best) continue;
    const perp = Math.abs(px * dz - pz * dx);
    if (perp < 1.9) { best = along; hitCar = t; }
  }
  const ex = ox + dx * best, ez = oz + dz * best;
  tracer(ox, oy, oz, ex, tracerEnd(ox, oy, oz, ex, ez, hitCar), ez, enemy, dx, dz);
  sfx.gun(enemy);
  if (hitCar) applyHit(from, hitCar, dmg, ex, ez);
  else if (best < range) spawnFx(ex, 1.2, ez, 0.25, 0xcbbfae, 0.25, 1, 2);
}
// purely visual shots for cars simulated elsewhere (remote players, bots on a non-host)
function ghostShot(from, enemy) {
  const [fx, fz] = from.fwd, [ox, oy, oz] = muzzleOf(from);
  const d = segHit(ox, oz, fx, fz, 95), ex = ox + fx * d, ez = oz + fz * d;
  tracer(ox, oy, oz, ex, tracerEnd(ox, oy, oz, ex, ez, null), ez, enemy, fx, fz);
  const L0 = locals[0]; if (L0 && Math.hypot(L0.car.x - from.x, L0.car.z - from.z) < 70) sfx.gun(true);
}
function credit(by, points, text) {
  if (!by || Match.over) return;
  if (by.local) { const L = by.owner; L.respect += points; if (!(gx && gx.gmode)) L.kills++; flashFor(L, '+' + points + ' RESPECT', text); rumbleFor(L, 0.2, 0.5, 120); if (gx) { gx.dj('ko', L); gx.saveBank(L); } }
}
function damage(c, d, by) {
  if (c.npc) return gx.damage(c, d, by);
  if (!c.alive || c.shield > 0) return;
  markFight(c, by); if (by && by.local) markFight(by, c);
  c.hp -= d * (c.armor || 1);
  if (c.local) { sfx.hit(); rumbleFor(c.owner, 0.35, 0.6, 90); }
  if (c.hp > 0) return;
  c.alive = false; c.hp = 0; explode(c.x, c.z);
  c.mesh.userData.mBody.color.setHex(0x1a1414); c.mesh.userData.mPaint.color.setHex(0x1a1414);
  if (c.local) {
    const L = c.owner; L.deadT = 3; rumbleFor(L, 1, 0.8, 600);
    L.respect = Math.floor(L.respect / 2);
    const fought = c.lastBot && performance.now() - (c.lastBotT || 0) < 10000;
    let who = isBot(by) ? botLabel(by, true) : by && by.npc === 'cop' ? 'la police' : fought ? botLabel(c.lastBot, true) : null;
    c.lastBot = null;
    if (by && by.local && by !== c) { credit(by, 150, 'Joueur ' + (L.slot + 1) + ' au tapis'); who = 'joueur ' + (by.owner.slot + 1); }
    else if (by && by.remotePeer) { Net.emit('ko', { by: by.remotePeer, nick: settings.nick || 'Joueur' }); const R = Net.remotes.get(by.remotePeer); who = R ? R.nick : 'un joueur'; }
    flashFor(L, 'T’es cuit !', who ? 'Démoli par ' + who : 'Tu t’es planté tout seul');
    if (mode === 'online') feed((settings.nick || 'Vous') + (who ? ' démoli par ' + who : ' s’est planté'));
  } else if (c.botIndex !== undefined) {
    c.wreck = 14;
    if (by && by.local) credit(by, 100, botLabel(c) + ' au tapis');
    else if (by && by.remotePeer && Net.isHost) Net.emit('bko', { by: by.remotePeer, i: c.botIndex });
  }
}

