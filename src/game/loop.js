// ---------- loop ----------
let last = performance.now(), boardAcc = 0;
// performance overlay (F3): frame time, draw calls and triangles of the whole frame (every pass), scene size
const PerfHud = (() => {
  let el = null, on = false, acc = 0, n = 0, worst = 0, sim = 0, simN = 0, tLast = 0;
  const show = v => {
    on = v; renderer.info.autoReset = !on;
    if (on && !el) { el = document.createElement('pre'); el.id = 'perfHud'; el.style.cssText = 'position:fixed;left:8px;top:76px;z-index:60;margin:0;padding:6px 8px;background:rgba(0,0,0,.72);color:#9f9;font:12px/1.35 monospace;pointer-events:none;white-space:pre'; document.body.appendChild(el); }
    if (el) el.style.display = on ? 'block' : 'none'; tLast = 0;
  };
  addEventListener('keydown', e => { if (e.code === 'F3' && !e.repeat) { e.preventDefault(); show(!on); } });
  return {
    get on() { return on; }, show,
    begin() { if (on) renderer.info.reset(); },
    sim(ms) { if (on) { sim += ms; simN++; } },
    end() { // real elapsed time (the game step is capped at 50 ms, the overlay must show the true frame rate)
      if (!on) return; const t = performance.now(), dt = tLast ? Math.min(2, (t - tLast) / 1000) : 0; tLast = t; if (!dt) return;
      acc += dt; n++; worst = Math.max(worst, dt);
      if (acc < 0.5) return;
      const i = renderer.info, mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' Mo' : '?';
      el.textContent = (ULTRA ? 'ULTRA' : HD ? 'HD' : 'classique') + (HD ? ' · qualité ' + hd.QUAL[hd.quality].name : '') + '\n' +
        Math.round(n / acc) + ' im/s · ' + (acc / n * 1000).toFixed(1) + ' ms (pire ' + (worst * 1000).toFixed(0) + ')\n' +
        'simulation ' + (simN ? (sim / simN).toFixed(2) : '0') + ' ms\n' +
        'appels de dessin ' + i.render.calls + ' · triangles ' + Math.round(i.render.triangles / 1000) + ' k\n' +
        'géométries ' + i.memory.geometries + ' · textures ' + i.memory.textures + ' · programmes ' + (i.programs ? i.programs.length : '?') + '\n' +
        'mémoire JS ' + mem;
      acc = 0; n = 0; worst = 0; sim = 0; simN = 0;
    },
  };
})();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  PerfHud.begin();
  pollPads();
  if (Intro.state !== 'off') { if (pads.some(P => P.press && (P.press[0] || P.press[9]))) Intro.key(null); } else if (!(gx && gx.blocking)) menuPadNav(dt);
  if (gx) gx.tick(dt);
  Intro.update(dt);
  if (HD) hd.perf(now);
  if (gx) gx.landmarkTick();
  if (started && (!paused || mode === 'online')) { const t0 = performance.now(); step(dt, now); PerfHud.sim(performance.now() - t0); }
  if (started && mode === 'online') netTick(dt, now);
  if (started && locals.length && (!(paused || Match.over) || mode === 'online')) Soundscape.tick(dt, locals[0]); else Soundscape.hush();
  PhotoMode.tick(dt);
  render(dt);
  PerfHud.end();
}
function render(dt) {
  if (HD) {
    if (!started || !locals.length) { if (!Intro.playing) updateTitleCamera(dt); return hd.render([{ x: 0, y: 0, w: innerWidth, h: innerHeight, cam: camera, car: Intro.playing ? Intro.focusCar : null }]); }
    for (const L of locals) updateCamera(L, dt);
    return hd.render(locals.map(L => ({ x: L.vp.x, y: L.vp.y, w: L.vp.w, h: L.vp.h, cam: L.cam, car: L.car })));
  }
  if (!started || !locals.length) {
    if (!Intro.playing) updateTitleCamera(dt);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight);
    renderer.render(scene, camera); return;
  }
  const Ht = innerHeight;
  renderer.setScissorTest(locals.length > 1);
  for (const L of locals) {
    updateCamera(L, dt);
    const { x, y, w, h } = L.vp;
    renderer.setViewport(x, Ht - y - h, w, h); renderer.setScissor(x, Ht - y - h, w, h);
    renderer.render(scene, L.cam);
  }
}
function step(dt, now) {
  const frozen = (paused || Match.over) && mode !== 'online';
  if (frozen) return;
  if (gx && gx.blocking && mode !== 'online') return;
  checkMatch(dt);
  for (const L of locals) {
    const c = L.car;
    if (c.alive) {
      const inp = paused ? { t: 0, s: 0, hb: true, fire: false } : readInput(L);
      L.firing = inp.fire; L._inp = inp;
      const imp = drive(c, inp, dt);
      const braking = inp.t < 0 && (c.vx * c.fwd[0] + c.vz * c.fwd[1]) > 0.5;
      c.mesh.userData.tail.emissive.setHex(braking ? 0xff2a2a : 0x400000);
      if (imp > 3 && L.slot === 0) sfx.impact(imp);
      if (imp > 9) { rumbleFor(L, Math.min(1, imp / 25), 0.4, 160); damage(c, (imp - 8) * 1.2); spawnFx(c.x, 1, c.z, 0.6, 0xffe28a, 0.2, 2, 2); }
      L.fireCd -= dt;
      if (inp.fire && L.fireCd <= 0) {
        const gk = L.gunK || 0; L.fireCd = 0.09 / (1 + gk * 0.2);
        const targets = [...rivals, ...allPlayerCars(), ...(gx ? gx.cars() : [])];
        shoot(c, targets, 6 * (1 + gk * 0.15), 95, 0.05, false); rumbleFor(L, 0.0, 0.25, 40);
      }
      if (gx && inp.special && !L.specHeld) gx.special(L);
      if (gx && inp.swap && !L.swHeld) gx.cycleWeapon(L);
      L.swHeld = inp.swap;
      L.specHeld = inp.special;
    } else {
      L.firing = false;
      if (L.slot === 0) sfx.engine(0, false);
      L.deadT -= dt;
      if (L.deadT <= 0) {
        c.alive = true; c.hp = 100;
        c.mesh.userData.mBody.color.setHex(c.mesh.userData.base); c.mesh.userData.mPaint.color.setHex(c.mesh.userData.paint);
        c.place(...(L.team >= 0 ? teamSpawn(L.team) : mode === 'online' ? randomSpawn() : L.spawn));
      }
    }
  }
  // Rapaces: simulated here (solo, split, online host) or followed from the host's presence
  for (const r of rivals) {
    if (r.gone) continue;
    if (r.proxy) {
      if (r.alive) followState(r, r, dt);
      if (r.alive && r.firing) { r.fireAcc = (r.fireAcc || 0) + dt; if (r.fireAcc > 0.16) { r.fireAcc = 0; ghostShot(r, true); } }
      continue;
    }
    if (r.alive) drive(r, rivalInput(r, dt), dt);
    else {
      r.vx *= 0.95; r.vz *= 0.95; r.x += r.vx * dt; r.z += r.vz * dt;
      r.wreck -= dt; if (Math.random() < dt * 8) spawnFx(r.x, 2, r.z, 0.8, 0x2a2228, 1.8, 3, 2.5);
      if (r.wreck <= 0) { if (r.once) { r.gone = true; r.mesh.visible = false; r.x = r.z = 5000; } else spawnRival(r); }
    }
  }
  if (gx) gx.step(dt);
  const all = [...allPlayerCars(), ...rivals, ...(gx ? gx.cars() : [])];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (all[i].alive && all[j].alive) carVsCar(all[i], all[j]);
  for (const c of all) {
    c.sync();
    const spin = c.speed * dt / 0.42;
    for (const w of c.mesh.userData.wheels) w.rotation.x -= spin * Math.sign(c.vx * c.fwd[0] + c.vz * c.fwd[1]);
    for (const p of c.mesh.userData.steer) p.rotation.y = (c.remote ? c.remote.steer || 0 : c.steer) * 0.45;
    if (c.alive && c.hp < 35 && Math.random() < dt * 6) spawnFx(c.x, 1.3, c.z, 0.45, 0x3a3436, 1.2, 2.5, 2);
  }
  for (const pk of pickups) {
    if (!pk.on) continue;
    pk.mesh.position.set(pk.x, surfaceH(pk.x, pk.z) + 1.4 + Math.sin(now / 300) * 0.3, pk.z); pk.mesh.rotation.y += dt * 2;
    for (const L of locals) {
      if (!pk.on || !L.car.alive || Math.hypot(pk.x - L.car.x, pk.z - L.car.z) >= 3.5) continue;
      L.car.hp = Math.min(100, L.car.hp + 35); sfx.pick(); flashFor(L, 'Clé à molette', '+35 carrosserie'); rumbleFor(L, 0, 0.3, 80);
      pk.on = false; pk.mesh.visible = false; setTimeout(() => spawnPickup(pk), 12000);
    }
  }
  updateFx(dt); updateTracers(dt); tramStep(dt);
  if (HD) hd.frame(dt, gx ? gx.cars() : []);
  updateHud(dt);
  boardAcc += dt; if (boardAcc > 0.25) { boardAcc = 0; updateTeamBar(); updateClock(); if (!$('board').hidden) renderBoard(); }
  const c0 = locals[0].car;
  sun.position.copy(c0.mesh.position).add(SUN_OFF); sun.target.position.copy(c0.mesh.position);
}
let orbit = 0;
function updateTitleCamera(dt) {
  if (HD && showCar && showCar.mesh.visible && !$('title').hidden) { // showroom
    orbit += dt * 0.35; const p = showCar.mesh.position;
    camera.position.set(p.x + Math.sin(orbit) * 7.5, p.y + 2.4, p.z + Math.cos(orbit) * 7.5); camera.lookAt(p.x, p.y + 0.6, p.z);
    sun.position.copy(p).add(SUN_OFF); sun.target.position.copy(p); return;
  }
  orbit += dt * 0.05;
  camera.position.set(Math.sin(orbit) * 260, 175, Math.cos(orbit) * 260);
  camera.lookAt(0, 25, 0);
  sun.position.set(0, 0, 0).add(SUN_OFF); sun.target.position.set(0, 0, 0);
}

