// ---------- combat ----------
// hit routing: local cars take damage here; bots are simulated by the host; remote players by their own client
// who knocked a player out: a fight with a gang car in the last 10 s still counts when the player then crashes
const isBot = c => !!c && c.botIndex !== undefined && !c.friendly;
function markFight(c, foe) { if (c && c.local && isBot(foe)) { c.lastBot = foe; c.lastBotT = performance.now(); } }
function applyHit(shooter, target, dmg, ex, ez) {
  spawnFx(ex, 1.2, ez, 0.35, 0xffe28a, 0.15, 0, 1);
  // (21 nov., audit UX) the player feels each bullet that lands: a tick, and the target diamond flashes (aimMarks)
  if (shooter && shooter.local && target && (target.botIndex !== undefined || target.remote || target.npc === 'police' || (target.local && target !== shooter))) { shooter.hitMarkT = performance.now(); sfx.tick(); }
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
// (21 nov., audit UX) aim assist: a player's bullets bend toward the enemy nearest the line of fire, inside a cone that
// the settings set (none, light 7°, strong 14°; light at most when playing against other people), never through a wall.
// Before, a bullet hit only a car within 1.9 m of the straight line ahead: luck more than skill on a keyboard
const AIM_CONE = [0, 0.12, 0.24];
function aimLevel() { const s = settings.aim ?? 2; return mode === 'solo' ? s : Math.min(s, 1); }
function aimTarget(c, range = 95, cone = AIM_CONE[aimLevel()]) {
  if (!cone || !c || !c.local) return null;
  const [fx, fz] = c.fwd; let best = null, bs = 1e9;
  for (const t of [...rivals, ...allPlayerCars()]) {
    if (t === c || !t.alive || !enemies(c, t)) continue;
    const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz); if (d < 3 || d > range) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d))); if (ang > cone) continue;
    if (segHit(c.x, c.z, dx / d, dz / d, d) < d - 2.5) continue; // a wall between
    const s = ang / cone + 0.6 * d / range; if (s < bs) { bs = s; best = t; }
  }
  return best;
}
// the yellow diamond over each local player's assist target (one sprite per screen slot, hidden when there is none)
const AIM_SPR = []; let _aimTex = null;
function aimMarks() {
  for (const s of AIM_SPR) s.visible = false;
  if (!started) return;
  for (const L of locals) {
    const c = L.car; c.aimT = c.alive && !(gx && gx.blocking) ? aimTarget(c) : null; const t = c.aimT; if (!t) continue;
    let s = AIM_SPR[L.slot];
    if (!s) {
      if (!_aimTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); g.lineJoin = 'round';
        g.beginPath(); g.moveTo(32, 6); g.lineTo(56, 32); g.lineTo(32, 58); g.lineTo(8, 32); g.closePath(); g.lineWidth = 12; g.strokeStyle = 'rgba(13,10,20,.85)'; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#ffd23f'; g.stroke();
        _aimTex = new THREE.CanvasTexture(cv); if (HD) _aimTex.encoding = THREE.sRGBEncoding; }
      s = AIM_SPR[L.slot] = new THREE.Sprite(new THREE.SpriteMaterial({ map: _aimTex, depthTest: false, transparent: true, fog: false }));
      s.renderOrder = 20; s.scale.set(1.8, 1.8, 1); s.userData.hdLinear = true; scene.add(s);
    }
    const fl = performance.now() - (c.hitMarkT || 0) < 130;
    s.scale.setScalar(fl ? 2.6 : 1.8); s.material.color.setRGB(1, fl ? 0.4 : 1, fl ? 0.35 : 1);
    s.visible = true; s.position.set(t.x, (t.mesh ? t.mesh.position.y : surfaceH(t.x, t.z)) + 2.9 + Math.sin(performance.now() / 160) * 0.12, t.z);
  }
  feedbackHud();
}
// (21 nov., audit UX) arrows on the edge of each screen toward the three nearest enemies out of sight, with their distance
const _ofv = new THREE.Vector3();
function offscreenArrows(L, el, vp) {
  const c = L.car, list = [];
  if (c.alive && L.cam && !(gx && gx.blocking)) for (const t of [...rivals, ...allPlayerCars()]) {
    if (!t || t === c || !t.alive || t.npc || !enemies(c, t)) continue;
    const d = Math.hypot(t.x - c.x, t.z - c.z); if (d > 230) continue;
    _ofv.set(t.x, (t.mesh ? t.mesh.position.y : surfaceH(t.x, t.z)) + 1, t.z).project(L.cam);
    const behind = _ofv.z > 1; if (!behind && Math.abs(_ofv.x) < 0.95 && Math.abs(_ofv.y) < 0.92) continue;
    let sx = _ofv.x, sy = -_ofv.y; if (behind) { sx = -sx; sy = -sy; if (Math.abs(sy) < 0.2) sy = 0.6; }
    list.push({ d, a: Math.atan2(sy * vp.h, sx * vp.w) });
  }
  list.sort((p, q) => p.d - q.d);
  let i = 0;
  for (const o of list.slice(0, 3)) {
    let ar = el.children[2 + i]; if (!ar) { ar = document.createElement('b'); ar.className = 'ofs'; ar.innerHTML = '<i></i><span></span>'; el.append(ar); }
    ar.hidden = false; i++;
    const x = vp.w / 2 + Math.cos(o.a) * (vp.w / 2 - 46), y = vp.h / 2 + Math.sin(o.a) * (vp.h / 2 - 46);
    ar.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
    ar.firstChild.style.transform = 'rotate(' + o.a.toFixed(2) + 'rad)';
    ar.lastChild.textContent = Math.round(o.d) + ' m';
    ar.style.opacity = (o.d < 60 ? 1 : 1 - (o.d - 60) / 240).toFixed(2);
  }
  for (let k = 2 + i; k < el.children.length; k++) el.children[k].hidden = true;
}
// (21 nov., audit UX) per screen: a red arc on the side the hits come from (fades in 1 s), and a red pulsing edge with an
// alarm when the car is about to be wrecked (under 25 %)
let _fbOn = false, _helpT0 = 0, _idleT = 0;
function feedbackHud() {
  let root = document.getElementById('fbk');
  if (!root) { root = document.createElement('div'); root.id = 'fbk'; document.body.append(root); }
  const now = performance.now();
  if (started && !_fbOn) _helpT0 = now; _fbOn = started;
  const c0 = locals[0] && locals[0].car;
  if (c0 && Math.abs(c0.speed || 0) > 3) _idleT = now;
  document.body.classList.toggle('helpOff', started && now - _helpT0 > 25000 && now - _idleT < 6000);
  for (const el of root.children) el.dataset.used = '';
  if (!started) { root.hidden = true; return; } root.hidden = false;
  for (const L of locals) {
    let el = root.querySelector('[data-slot="' + L.slot + '"]');
    if (!el) { el = document.createElement('div'); el.className = 'fbv'; el.dataset.slot = L.slot; el.innerHTML = '<i class="arc"></i><i class="low"></i>'; root.append(el); }
    el.dataset.used = '1';
    const vp = L.vp || { x: 0, y: 0, w: innerWidth, h: innerHeight }, key = vp.x + ',' + vp.y + ',' + vp.w + ',' + vp.h;
    if (el.dataset.key !== key) { el.dataset.key = key; Object.assign(el.style, { left: vp.x + 'px', top: vp.y + 'px', width: vp.w + 'px', height: vp.h + 'px' }); }
    const c = L.car, arc = el.firstChild, low = el.lastChild, a = 1 - (now - (L.hitT || -1e9)) / 1000;
    if (a > 0) { const [fx, fz] = c.fwd, rel = Math.atan2(Math.sin(L.hitDir) * fz - Math.cos(L.hitDir) * fx, Math.sin(L.hitDir) * fx + Math.cos(L.hitDir) * fz); arc.style.opacity = a.toFixed(2); arc.style.transform = 'translate(-50%,-50%) rotate(' + (-rel).toFixed(3) + 'rad)'; }
    else if (arc.style.opacity !== '0') arc.style.opacity = '0';
    const danger = c.alive && c.hp < 25 && !(gx && gx.blocking);
    low.style.opacity = danger ? (0.55 + 0.45 * Math.sin(now / 180)).toFixed(2) : '0';
    if (danger && L.slot === 0 && now - (L.alarmT || 0) > 1400) { L.alarmT = now; sfx.alarm(); }
    offscreenArrows(L, el, vp);
  }
  for (const el of [...root.children]) if (!el.dataset.used) el.remove();
}
function shoot(from, targets, dmg, range, spread, enemy) {
  let [fx, fz] = from.fwd;
  const aim = from.local ? (from.aimT && from.aimT.alive ? from.aimT : aimTarget(from, range)) : null;
  if (aim) { const ax = aim.x - from.x, az = aim.z - from.z, d = Math.hypot(ax, az) || 1; fx = ax / d; fz = az / d; spread *= 0.5; }
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
  if (!hitCar && gx && gx.Fences) best = gx.Fences.shoot(ox, oz, dx, dz, best, from, dmg); // a fence in the way takes the bullet (and breaks)
  if (!hitCar && gx && gx.LightPoles) best = gx.LightPoles.shoot(ox, oz, dx, dz, best, from, dmg); // so does a traffic light pole
  const ex = ox + dx * best, ez = oz + dz * best;
  tracer(ox, oy, oz, ex, tracerEnd(ox, oy, oz, ex, ez, hitCar), ez, enemy, dx, dz);
  sfx.gun(enemy);
  if (gx) gx.hearShot(ox, oz, ex, ez);
  if (hitCar) applyHit(from, hitCar, dmg, ex, ez);
  else if (best < range) spawnFx(ex, 1.2, ez, 0.25, 0xcbbfae, 0.25, 1, 2);
}
// purely visual shots for cars simulated elsewhere (remote players, bots on a non-host)
function ghostShot(from, enemy) {
  const [fx, fz] = from.fwd, [ox, oy, oz] = muzzleOf(from);
  const d = segHit(ox, oz, fx, fz, 95), ex = ox + fx * d, ez = oz + fz * d;
  tracer(ox, oy, oz, ex, tracerEnd(ox, oy, oz, ex, ez, null), ez, enemy, fx, fz);
  if (gx) gx.hearShot(ox, oz, ex, ez);
  const L0 = locals[0]; if (L0 && Math.hypot(L0.car.x - from.x, L0.car.z - from.z) < 70) sfx.gun(true);
}
function credit(by, points, text) {
  if (!by || Match.over) return;
  if (by.local) { const L = by.owner;
    // (21 nov., audit UX) style pays: a KO while sliding, flying or with the police on your tail is worth more, and is named
    const st = [];
    if ((by.drift || 0) > 0.3) st.push(['en dérapage', 50]);
    if ((by.air || 0) > 0.3) st.push(['en plein vol', 80]);
    if ((L.heat || 0) > 0 && mode === 'solo') st.push(['sous les gyrophares', 60]);
    // a streak: KO after KO within 8 seconds
    const nowT = performance.now(); L.streak = nowT - (L.koT || -1e9) < 8000 ? (L.streak || 1) + 1 : 1; L.koT = nowT;
    if (L.streak >= 2) st.push([L.streak === 2 ? 'doublé' : L.streak === 3 ? 'triplé' : 'carnage ×' + L.streak, 50 * Math.min(4, L.streak - 1)]);
    // a short slow motion on the KO (not online, not with « Mouvements de caméra : réduits »)
    if (mode !== 'online' && settings.motion !== 0) slowMo = nowT + 420;
    for (const [, p] of st) points += p;
    if (st.length) text += ' · ' + st.map(s => s[0]).join(', ') + ' !';
    if (L.st && (!L.st.best || points > L.st.best.p)) L.st.best = { p: points, text };
    L.respect += points; L.koN = (L.koN || 0) + 1; if (!(gx && gx.gmode)) L.kills++; flashFor(L, '+' + points + ' RESPECT', text); rumbleFor(L, 0.2, 0.5, 120); if (gx) { gx.dj('ko', L); gx.saveBank(L); } }
}
function damage(c, d, by) {
  if (c.npc) return gx.damage(c, d, by);
  if (c.alive && c.shield > 0 && gx && gx.shieldHit) gx.shieldHit(c, by && by.x !== undefined ? by : null);
  if (!c.alive || c.shield > 0) return;
  markFight(c, by); if (by && by.local) markFight(by, c);
  if (by && by.local && c.botIndex !== undefined) { c.lastHitBy = by; c.lastHitT = performance.now(); }
  if (c.local && gx && gx.mission && gx.mission.live && gx.campDiff) d *= gx.campDiff().hurt; // (15 nov.) campaign difficulty
  c.hp -= d * (c.armor || 1) * (CAT_DMG[c.style] || 1); // (cycle 13) the van takes less, the coupé more
  if (by && by.local && by !== c && by.owner && by.owner.st) by.owner.st.dmg += Math.min(d, c.hp + d);
  if (c.local) { sfx.hit(); rumbleFor(c.owner, 0.35, 0.6, 90); if (by && by !== c && by.x !== undefined && c.owner) { c.owner.hitDir = Math.atan2(by.x - c.x, by.z - c.z); c.owner.hitT = performance.now(); } }
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
    if (by && by.local) credit(by, c.chief ? 400 : 100, c.chief ? c.chief + ' est tombé !' : botLabel(c) + ' au tapis');
    // (21 nov., audit UX) a Rapace the player has just hit, finished by the tram or a wall, is still the player's KO
    else if (!by && c.lastHitBy && c.lastHitBy.alive && performance.now() - (c.lastHitT || 0) < 6000) {
      const tram = performance.now() - (c.tramT || 0) < 500;
      credit(c.lastHitBy, (c.chief ? 400 : 100) + (tram ? 100 : 0), (c.chief || botLabel(c)) + (tram ? ' : coincé sous le tram !' : ' : envoyé dans le décor'));
    }
    else if (by && by.remotePeer && Net.isHost) Net.emit('bko', { by: by.remotePeer, i: c.botIndex });
  }
}

