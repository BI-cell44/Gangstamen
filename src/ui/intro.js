// ---------- intro cinematic ----------
// Played in the engine before the menu. Every shot is a function of the time since the start, and the cuts fall on
// the bars of the radio loop. While it plays, the six street cars are swapped for six actors.
const BAR = 60 / 92 * 4;
function mkPath(p) { const cum = [0]; for (let i = 2; i < p.length; i += 2) cum.push(cum[cum.length - 1] + Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1])); return { p, cum, len: cum[cum.length - 1] }; }
function pathAt(P, s) {
  s = Math.max(0, Math.min(P.len, s)); let i = 1; while (i < P.cum.length - 1 && P.cum[i] < s) i++;
  const k = (s - P.cum[i - 1]) / ((P.cum[i] - P.cum[i - 1]) || 1);
  return [P.p[2 * i - 2] + (P.p[2 * i] - P.p[2 * i - 2]) * k, P.p[2 * i - 1] + (P.p[2 * i + 1] - P.p[2 * i - 1]) * k];
}
// position at distance s along a path, lat metres to the right of the direction of increasing s
function pathPose(P, s, lat) {
  const a = pathAt(P, s - 5), b = pathAt(P, s + 5), c = pathAt(P, s); let tx = b[0] - a[0], tz = b[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
  return { x: c[0] - tz * lat, z: c[1] + tx * lat, tx, tz };
}
const Intro = (() => {
  const el = $('intro'), cap1 = $('iCap1'), cap2 = $('iCap2'), gang = $('iGang'), ttl = $('iTitle'), flashEl = $('iFlash'), fadeEl = $('iFade');
  // boulevard de la Liberté, from the town hall down towards the Loire
  const BLVD = mkPath([176, -475, 174, -465, 169, -436, 164, -407, 160, -383, 146, -306, 140, -272, 131, -216, 124, -173, 118, -139, 114, -112, 80, 89, 77, 104, 64, 183, 58, 222, 55, 243, 56, 264, 58, 284, 63, 308, 72, 333, 79, 353, 105, 429]);
  const S_HIT = 471, V = 28, T_HIT = 11 * BAR, T_END = 13 * BAR;
  const SHOTS = [
    { t: 0, arr: 0, cap: ['Nantes · été 1996', 'Chantenay. Les chantiers ont fermé. Les usines aussi.'] },
    { t: 2 * BAR, arr: 1, cap: ['Il reste la rue.', 'Et deux bandes pour se la disputer.'] },
    { t: 4 * BAR, arr: 2, gang: 0, sub: 'Caisses noires. Ils tiennent le haut du quartier.' },
    { t: 6 * BAR, arr: 3, gang: 1, sub: 'Nés sur le boulevard. Ils ne lâchent rien.' },
    { t: 8 * BAR, arr: 3, cap: ['', 'Ce soir, il n’y a plus de place pour deux.'] },
    { t: 9 * BAR, arr: 3, keep: true },
    { t: 10 * BAR, arr: 3 },
    { t: 10.5 * BAR, arr: 3 },
    { t: T_HIT, arr: -1, title: true },
  ];
  let state = 'off', t0 = 0, shot = -1, capT = 0, capText = '', cars = null, R = [], C = [], saved = null, butte = null, hit = false, back = false, fog0 = 0, fireAcc = 0, shakeAmt = 0, lastT = 0, fromMenu = false;
  const focus = new THREE.Vector3(), focusCar = { mesh: { position: focus } }, look = new THREE.Vector3();
  const sm = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

  function buttePath() { // the longest straight run of streets from the Rapaces' base on the butte
    const b = bases()[0]; let best = null;
    for (const sg of [1, -1]) {
      let n = nearestNode(b.x, b.z), prev = -1, dx = b.ux * sg, dz = b.uz * sg, len = 0; const p = [G.x[n], G.z[n]];
      while (len < 240) {
        let nb = -1, bd = 0.25;
        for (const m of G.adj[n]) { if (m === prev) continue; const ex = G.x[m] - G.x[n], ez = G.z[m] - G.z[n], l = Math.hypot(ex, ez) || 1, d = (ex * dx + ez * dz) / l; if (d > bd) { bd = d; nb = m; } }
        if (nb < 0 || Math.abs(G.x[nb] - CX) > HX - 15 || Math.abs(G.z[nb] - CZ) > HZ - 15) break;
        const ex = G.x[nb] - G.x[n], ez = G.z[nb] - G.z[n], l = Math.hypot(ex, ez) || 1;
        dx = ex / l; dz = ez / l; len += l; prev = n; n = nb; p.push(G.x[n], G.z[n]);
      }
      const P = mkPath(p); if (!best || P.len > best.len) best = P;
    }
    return best.len > 90 ? best : BLVD;
  }
  function actor(team, lead) {
    const T = TEAMS[team], c = new Car(makeCar(lead && team === 1 ? T.body : T.botBody, lead && team === 1 ? T.stripe : T.botStripe, false, lead ? 'saloon' : 'hatch'), false);
    c.team = team; c.actor = true; return c;
  }
  function build() {
    if (cars) return;
    R = [actor(0, true), actor(0, false), actor(0, false)]; C = [actor(1, true), actor(1, false), actor(1, false)];
    cars = [...R, ...C]; butte = buttePath();
  }
  // place an actor on a path: dir 1 drives towards increasing s, -1 the other way; v is its speed
  function put(c, P, s, lat, dir, v, dt) {
    const q = pathPose(P, s, lat);
    c.mesh.visible = true; c.x = q.x; c.z = q.z; c.h = Math.atan2(-q.tx * dir, -q.tz * dir); c.vx = q.tx * dir * v; c.vz = q.tz * dir * v; c.sync();
    for (const w of c.mesh.userData.wheels) w.rotation.x -= v * dt / 0.42;
  }
  function park(c) { c.mesh.visible = false; c.x = 4000; c.z = 4000; c.vx = c.vz = 0; c.mesh.position.set(4000, -50, 4000); }
  function cam(px, py, pz, lx, ly, lz, fov, wobble) {
    const t = lastT, w = wobble || 0;
    camera.position.set(px + Math.sin(t * 2.3) * w, py + Math.sin(t * 3.1 + 1) * w * 0.7, pz + Math.cos(t * 1.9) * w);
    if (shakeAmt > 0.01) { camera.position.x += (Math.random() - 0.5) * shakeAmt; camera.position.y += (Math.random() - 0.5) * shakeAmt * 0.6; camera.position.z += (Math.random() - 0.5) * shakeAmt; }
    camera.position.y = Math.max(camera.position.y, surfaceH(camera.position.x, camera.position.z) + 0.5);
    look.set(lx, ly, lz); camera.lookAt(look);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    focus.set(lx, surfaceH(lx, lz), lz);
    if (Math.hypot(px - lx, pz - lz) > 150) focus.set(px + (lx - px) * 0.3, 0, pz + (lz - pz) * 0.3);
    sun.position.copy(focus).add(SUN_OFF); sun.target.position.copy(focus); sun.target.updateMatrixWorld();
  }
  const Y = (x, z) => surfaceH(x, z);
  function setCap(a, b) { capText = a || ''; capT = lastT; cap1.textContent = ''; cap2.textContent = b || ''; cap2.classList.remove('on'); void cap2.offsetWidth; if (b) cap2.classList.add('on'); }
  function enter(i) {
    const s = SHOTS[i]; shot = i; sfx.arr(s.arr);
    if (!s.keep) {
      setCap(s.cap && s.cap[0], s.cap && s.cap[1]);
      gang.classList.remove('on'); ttl.classList.remove('on');
      if (s.gang !== undefined) {
        const T = TEAMS[s.gang]; gang.style.setProperty('--gc', T.css); gang.style.setProperty('--gt', s.gang ? '#000' : '#f3ead8');
        gang.firstElementChild.textContent = 'Les ' + T.name; gang.lastElementChild.textContent = s.sub; void gang.offsetWidth; gang.classList.add('on');
      }
      if (s.title) { void ttl.offsetWidth; ttl.classList.add('on'); }
    }
    if (i > 0 && !s.title) sfx.whoosh();
    if (!HD && scene.fog) scene.fog.far = i === 0 ? fog0 * 1.9 : fog0;
  }
  // the two convoys of the last act: leads on the centre line, the others staggered behind
  const LAT = [0, 2.3, -2.3], GAP = [0, 10, 19];
  function convoys(t, dt) {
    const tau = T_HIT - t;
    for (let k = 0; k < 3; k++) {
      let d, v = V;
      if (tau >= 0) d = V * tau + 2.4 + GAP[k];
      else { const b = Math.min(-tau, 0.7); d = 2.4 + GAP[k] - (k ? V * b - 20 * b * b : 0); v = k ? Math.max(0, V - 40 * b) : 0; d = Math.max(d, 2.4 + (k ? 5.2 * k - 3 : 0)); }
      put(R[k], BLVD, S_HIT - d, LAT[k], 1, v, dt);
      put(C[k], BLVD, S_HIT + d, LAT[k], -1, v, dt);
    }
  }
  function burst(from, to, enemy) {
    const [ox, oy, oz] = muzzleOf(from);
    const tx = to.x + (Math.random() - 0.5) * 5, tz = to.z + (Math.random() - 0.5) * 5, d = Math.hypot(tx - ox, tz - oz) || 1, dx = (tx - ox) / d, dz = (tz - oz) / d, r = Math.min(d, 95);
    const ex = ox + dx * r, ez = oz + dz * r;
    tracer(ox, oy, oz, ex, Y(ex, ez) + 0.5 + Math.random() * 0.8, ez, enemy, dx, dz);
    if (r < 94 && Math.random() < 0.4) spawnFx(ex, 1, ez, 0.3, 0xffe28a, 0.2, 2, 2);
  }
  function wreck(c) { c.alive = false; c.hp = 0; c.mesh.userData.mBody.color.setHex(0x1a1414); c.mesh.userData.mPaint.color.setHex(0x1a1414); }

  function update(dt) {
    if (state !== 'play') return;
    const t = window.__introT !== undefined ? window.__introT : (performance.now() - t0) / 1000;
    lastT = t;
    if (t >= T_END) { finish(); return; }
    let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1].t) i++;
    if (i !== shot) enter(i);
    const u = t - SHOTS[i].t, m = pathPose(BLVD, S_HIT, 0), my = Y(m.x, m.z);
    if (capText) cap1.textContent = capText.slice(0, Math.max(0, Math.floor((t - capT) * 24)));
    shakeAmt *= Math.exp(-dt * 4);
    let eng = 0;
    if (i === 0) { // the district from above the Loire
      for (const c of cars) park(c);
      const k = u / (2 * BAR), e = sm(k);
      cam(250 - 90 * e, 150 - 62 * e, 800 - 250 * e, 95, 30, 240 - 200 * e, 50);
    } else if (i === 1) { // up the boulevard at bonnet height
      for (const c of cars) park(c);
      const s = 705 - 19 * u, p = pathPose(BLVD, s, -1.2), q = pathPose(BLVD, s - 50, 0);
      cam(p.x, Y(p.x, p.z) + 1.3 + u * 0.25, p.z, q.x, Y(q.x, q.z) + 3.5, q.z, 62, 0.04); eng = 12;
    } else if (i === 2) { // the Rapaces roll down from the butte, past the camera
      for (const c of C) park(c);
      const s = 14 + 15 * u;
      put(R[0], butte, s, -0.5, 1, 15, dt); put(R[1], butte, s - 8, 0.6, 1, 15, dt); put(R[2], butte, s - 16, -0.7, 1, 15, dt);
      const p = pathPose(butte, Math.min(butte.len - 2, 52 + 5 * u), 2.5);
      cam(p.x, Y(p.x, p.z) + 0.75, p.z, R[0].x, R[0].mesh.position.y + 0.7, R[0].z, 48, 0.03); eng = 15;
    } else if (i === 3) { // the Chantenaysiens wait by the town hall, then pull away
      for (const c of R) park(c);
      const g = Math.max(0, u - 2.7), d = 3.6 * g * g, v = 7.2 * g;
      put(C[0], BLVD, 52 + d, 0.4, 1, v, dt); put(C[1], BLVD, 44 + d, -2.3, 1, v, dt); put(C[2], BLVD, 36 + d, 2.6, 1, v, dt);
      const e = sm(u / 3.2), p = pathPose(BLVD, 74 + 5 * e, -6.5 + 2 * e);
      cam(p.x, Y(p.x, p.z) + 5.5 - 4.6 * e, p.z, C[0].x, C[0].mesh.position.y + 0.8, C[0].z, 46, 0.03); eng = 3 + v;
    } else if (i === 4 || i === 5) { // both gangs at full speed, seen from the kerb
      convoys(t, dt);
      const c = i === 4 ? R[0] : C[0], dir = i === 4 ? 1 : -1, sc = S_HIT - dir * (V * (T_HIT - t) + 2.4) + dir * 5, p = pathPose(BLVD, sc, 4.9);
      cam(p.x, Y(p.x, p.z) + 0.85, p.z, c.x + c.fwd[0] * 1.5, c.mesh.position.y + 0.75, c.z + c.fwd[1] * 1.5, 56, 0.05); eng = 28;
    } else if (i === 6) { // over the Rapaces' bonnet: the others come up the hill
      convoys(t, dt);
      const sr = S_HIT - (V * (T_HIT - t) + 2.4), p = pathPose(BLVD, sr - 7.5, 0.9), q = pathPose(BLVD, sr + 34, 0);
      cam(p.x, Y(p.x, p.z) + 2.7, p.z, q.x, Y(q.x, q.z) + 1, q.z, 50, 0.06); eng = 28;
    } else if (i === 7) { // the middle of the boulevard, where they meet
      convoys(t, dt);
      const p = pathPose(BLVD, S_HIT - 13, 3);
      cam(p.x, my + 17, p.z, m.x, my, m.z, 72, 0.04); eng = 28;
    } else { // crane up over the wrecks
      convoys(t, dt);
      const e = sm(u / (2 * BAR)), p = pathPose(BLVD, S_HIT - 13 - 50 * e, 3 + 30 * e);
      cam(p.x, my + 17 + 60 * e, p.z, m.x, my + 10 * e, m.z, 72 - 16 * e, 0);
      if (u > BAR && SHOTS[i].arr !== 4) sfx.arr(4);
      if (!HD && Math.random() < dt * 9) spawnFx(m.x + (Math.random() - 0.5) * 4, 1.5, m.z + (Math.random() - 0.5) * 4, 1.1, Math.random() < 0.3 ? 0xff7a2a : 0x2a2228, 2, 4, 2.5);
    }
    // gunfire for the last two bars before the crash
    if (t > 9.6 * BAR && t < T_HIT) {
      fireAcc += dt;
      if (fireAcc > 0.07) { fireAcc = 0; const k = (Math.random() * 3) | 0; burst(R[k], C[0], true); burst(C[(k + 1) % 3], R[0], false); sfx.gun(Math.random() < 0.5); }
    }
    if (t >= T_HIT && !hit) {
      hit = true; wreck(R[0]); wreck(C[0]);
      explode(m.x, m.z); explode(m.x + m.tx * 2.5, m.z + m.tz * 2.5); sfx.slam(); shakeAmt = 1.6;
      for (const P of pads) if (P.gp && settings.rumble) try { P.gp.vibrationActuator.playEffect('dual-rumble', { duration: 500, strongMagnitude: 1, weakMagnitude: 0.8 }); } catch (e) { }
    }
    sfx.engine(eng, eng > 0);
    flashEl.style.opacity = t >= T_HIT ? Math.max(0, 1 - (t - T_HIT) / 0.75) : 0;
    fadeEl.style.opacity = Math.max(1 - t / 1.4, (t - (T_END - 0.55)) / 0.5, 0);
    updateFx(dt); updateTracers(dt);
    if (HD) hd.frame(dt);
  }

  function reset() { // put the world back as the menu and the game expect it
    if (saved) { rivals = saved; saved = null; for (const r of rivals) r.mesh.visible = true; }
    if (cars) for (const c of cars) park(c);
    for (const pk of pickups) pk.mesh.visible = pk.on;
    if (!HD && scene.fog && fog0) scene.fog.far = fog0;
    if (camera.fov !== 56) { camera.fov = 56; camera.updateProjectionMatrix(); }
    sfx.arr(4); sfx.engine(0, false);
    shot = -1; state = 'off'; document.body.classList.remove('cine');
  }
  function showMenu() { $('title').hidden = false; const b = $('start'); if (fromMenu) showView('vOpt'); else if (b) b.focus(); }
  function finish() { // back to the menu through black
    if (state === 'off') return;
    const playing = state === 'play';
    reset(); showMenu();
    el.className = playing ? 'out' : ''; fadeEl.style.opacity = playing ? 1 : 0; flashEl.style.opacity = 0;
    if (!playing) { el.hidden = true; return; }
    requestAnimationFrame(() => { fadeEl.style.opacity = 0; });
    setTimeout(() => { if (state === 'off') { el.hidden = true; el.className = ''; } }, 700);
  }
  function stop() { if (state === 'off') return; reset(); el.hidden = true; el.className = ''; } // a game starts: no menu
  function splash() { state = 'splash'; fromMenu = false; $('title').hidden = true; el.hidden = false; el.className = 'splash'; document.body.classList.add('cine'); }
  function play(menu) {
    sfx.init(); build();
    fromMenu = !!menu; $('title').hidden = true; el.hidden = false; el.className = 'play'; document.body.classList.add('cine');
    saved = saved || rivals; for (const r of saved) r.mesh.visible = false; rivals = cars;
    for (const pk of pickups) pk.mesh.visible = false;
    for (const c of cars) { c.alive = true; c.hp = 100; c.mesh.userData.mBody.color.setHex(c.mesh.userData.base); c.mesh.userData.mPaint.color.setHex(c.mesh.userData.paint); park(c); }
    fog0 = scene.fog ? scene.fog.far : 0; hit = false; shot = -1; fireAcc = 0; shakeAmt = 0;
    sfx.restart(); t0 = performance.now() + 60; state = 'play';
    fadeEl.style.opacity = 1; flashEl.style.opacity = 0; gang.classList.remove('on'); ttl.classList.remove('on'); setCap('', '');
  }
  // any key or click starts it; Escape, Enter, Space, a click or a pad button skips it
  function key(e) {
    if (state === 'splash') { play(false); return true; }
    if (state === 'play' && performance.now() - t0 > 500 && (!e || !e.code || ['Escape', 'Enter', 'Space', 'NumpadEnter'].includes(e.code))) { finish(); return true; }
    return state !== 'off';
  }
  addEventListener('keydown', e => { if (state === 'off' || e.repeat || ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; if (key(e)) e.preventDefault(); });
  el.addEventListener('pointerdown', e => { e.preventDefault(); key(null); });
  return { update, splash, play, finish, stop, key, focusCar, get state() { return state; }, get playing() { return state === 'play'; }, T_END, BAR };
})();

/*@GX_MODULE@*/

