  // ---------- races and challenges in the open world (cycle 11) ----------
  // Solo, outside missions: start markers on the map (and the minimap). Drive into one to start. Races follow real
  // streets with checkpoints, a ghost of the best run and medals; challenges: drift, jump, delivery, lose the police,
  // destruction. Records go to the save (Profile.record).
  const ACT_DEF = [
    { id: 'r_anne', kind: 'race', name: 'Sainte-Anne → quai de la Fosse', pts: [[935, 95], [1180, -90], [1450, -320]] },
    { id: 'r_butte', kind: 'race', name: 'Tour de la butte', pts: [[700, 120], [880, -60], [1060, 120], [900, 300], [700, 120]] },
    { id: 'r_lib', kind: 'race', name: 'Sprint du boulevard de la Liberté', pts: [[77, 104], [56, 264], [105, 429]] },
    { id: 'd_drift', kind: 'drift', name: 'Dérapage', at: [45, 283], time: 60, text: 'Glisse le plus longtemps possible (frein à main) : 60 s' },
    { id: 'd_jump', kind: 'jump', name: 'Sauts de la carrière Misery', at: [640, 300], time: 60, text: 'Décolle et vole le plus loin possible : 60 s' },
    { id: 'd_deliv', kind: 'deliv', name: 'Livraison express', at: [118, -139], text: 'Porte le colis à l’adresse avant la fin du chrono' },
    { id: 'd_cops', kind: 'cops', name: 'Semer la police', at: [300, 300], time: 150, text: 'Deux étoiles aux trousses : sème-les avant 2 min 30' },
    { id: 'd_smash', kind: 'smash', name: 'Destruction', at: [520, 380], time: 60, text: 'Casse un maximum de mobilier et de clôtures en 60 s' },
  ];
  const MEDALS = [['Or', 20], ['Argent', 16], ['Bronze', 13]]; // average speed (m/s) for each medal on a race
  let acts = null, run = null, actHud = null, ghostMesh = null;
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s % 1) * 10);
  function actsBuild() {
    if (acts) return; acts = [];
    for (const d of ACT_DEF) {
      const a = { ...d };
      if (d.kind === 'race') { // the route on the street graph through the points, cut into checkpoints every 110 m
        let path = []; for (let i = 0; i + 1 < d.pts.length; i++) { const seg = route(...d.pts[i], ...d.pts[i + 1]); path = path.concat(path.length ? seg.slice(1) : seg); }
        let L = 0; const cps = [path[0]]; let acc = 0;
        for (let i = 1; i < path.length; i++) { const s = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L += s; acc += s; if (acc > 110 || i === path.length - 1) { cps.push(path[i]); acc = 0; } }
        a.path = path; a.len = L; a.cps = cps; a.start = path[0];
      } else a.start = roadPoint(...d.at);
      acts.push(a);
    }
  }
  function actMarkers() { // start markers (re-added when a mission cleared them)
    for (const a of acts) if (!a.mk || !markers.includes(a.mk)) a.mk = addMarker(a.start[0], a.start[1], 6, a.kind === 'race' ? 0x3ac8ff : 0xff9a2a);
  }
  function actHide() { for (const a of acts || []) if (a.mk) { scene.remove(a.mk.beam, a.mk.ring); const i = markers.indexOf(a.mk); if (i >= 0) markers.splice(i, 1); a.mk = null; } }
  function hud(title, text) { // the mission panel (title, line, arrow to the target)
    if (!title) { objEl.hidden = true; objBar(null); objDir(null); return; }
    objective(title, text);
  }
  function startAct(a) {
    const L = locals[0], c = L.car;
    run = { a, t: 0, count: a.kind === 'race' ? 3 : 0, score: 0, cp: 1, trail: [], trailT: 0 };
    actHide();
    if (a.kind === 'race') {
      const [x, z] = a.path[0], [x2, z2] = a.path[Math.min(3, a.path.length - 1)]; c.place(x, z, heading(x, z, x2, z2)); c.vx = c.vz = 0;
      run.cpMk = addMarker(...a.cps[1], 9, a.cps.length === 2 ? 0xffffff : 0x3ac8ff);
      const g = Profile.cur && Profile.cur.records['ghost_' + a.id]; if (g) { run.ghost = g; ghostMesh = makeGhost(c.style); }
    } else if (a.kind === 'deliv') {
      const shops = (W.shops || []).filter(s => { const d = Math.hypot(s.x - c.x, s.z - c.z); return d > 350 && d < 800 && nodeOk(nearestNode(s.x, s.z)); });
      const s = shops[(R() * shops.length) | 0] || { x: 600, z: 200, n: 'Le quai' }, [tx, tz] = roadPoint(s.x, s.z);
      const len = route(c.x, c.z, tx, tz).reduce((acc, p, i, A) => acc + (i ? Math.hypot(p[0] - A[i - 1][0], p[1] - A[i - 1][1]) : 0), 0);
      run.dest = [tx, tz]; run.destName = s.n || 'le client'; run.limit = Math.round(len / 13 + 12); run.mk = addMarker(tx, tz, 7, 0xffffff);
    } else if (a.kind === 'cops') { L.heat = 2.5; L.calm = 0; }
    else if (a.kind === 'smash') run.base = brokenCount();
    flashFor(L, a.name, a.kind === 'race' ? 'Départ dans 3 secondes' : a.text || (run.destName ? 'Livre ' + run.destName : ''));
  }
  function brokenCount() { let n = 0; for (const f of furniture) if (f.broken) n++; for (const p of Fences.panels) if (p.broken) n++; return n; }
  function makeGhost(style) {
    const m = makeCar(0x9ad7ff, null, false, style || 'saloon', { guns: false });
    m.traverse(o => { if (o.material) { o.material = [].concat(o.material).map(x => { const y = x.clone(); y.transparent = true; y.opacity = 0.35; y.depthWrite = false; return y; }); if (o.material.length === 1) o.material = o.material[0]; } });
    scene.add(m); return m;
  }
  function dropGhost() { if (!ghostMesh) return; scene.remove(ghostMesh); ghostMesh.traverse(o => { for (const m of [].concat(o.material || [])) if (m && !m.userData.shared) m.dispose(); }); ghostMesh = null; }
  function endAct(ok, line) {
    const L = locals[0], a = run.a; let rec = false, medal = '';
    if (ok) {
      if (a.kind === 'race') {
        const avg = a.len / run.t; medal = (MEDALS.find(([, v]) => avg >= v) || [''])[0];
        rec = Profile.record('race_' + a.id, +run.t.toFixed(1));
        if (rec) Profile.record('ghost_' + a.id, run.trail, () => true);
        L.respect += medal === 'Or' ? 300 : medal === 'Argent' ? 180 : medal === 'Bronze' ? 100 : 40;
      } else {
        rec = Profile.record('defi_' + a.id, Math.round(run.score), (x, y) => x > y);
        L.respect += Math.min(400, Math.round(run.score / (a.kind === 'cops' ? 1 : 10)) + 50);
      }
      saveBank(L);
    }
    flashFor(L, ok ? (medal ? 'Médaille ' + medal : 'Terminé') + (rec ? ' · record !' : '') : 'Raté', line);
    for (const m of [run.cpMk, run.mk]) if (m) { scene.remove(m.beam, m.ring); const i = markers.indexOf(m); if (i >= 0) markers.splice(i, 1); }
    dropGhost(); hud(null); run = null;
  }
  function actStep(dt) {
    const free = mode === 'solo' && !mission && !gm && locals.length === 1;
    if (!free) { if (acts) actHide(); if (run) { dropGhost(); hud(null); run = null; } return; }
    actsBuild(); const L = locals[0], c = L.car;
    if (!run) {
      actMarkers();
      for (const a of acts) if (c.alive && Math.hypot(a.start[0] - c.x, a.start[1] - c.z) < 6 && c.speed < 8) { startAct(a); break; }
      return;
    }
    const a = run.a;
    if (!c.alive) return endAct(false, 'Ta caisse est en morceaux');
    if (run.count > 0) { run.count -= dt; c.vx = c.vz = 0; hud(a.name, run.count > 0 ? String(Math.ceil(run.count)) : 'Partez !'); return; }
    run.t += dt;
    if (a.kind === 'race') {
      run.trailT += dt; if (run.trailT >= 0.2) { run.trailT = 0; run.trail.push(Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10, Math.round(c.h * 100) / 100); }
      if (run.ghost && ghostMesh) { const k = Math.min(run.ghost.length / 3 - 1, run.t / 0.2), i = Math.floor(k), f = k - i, G_ = run.ghost, j = Math.min(i + 1, G_.length / 3 - 1);
        const gx_ = G_[i * 3] + (G_[j * 3] - G_[i * 3]) * f, gz = G_[i * 3 + 1] + (G_[j * 3 + 1] - G_[i * 3 + 1]) * f; ghostMesh.position.set(gx_, surfaceH(gx_, gz) + 0.34, gz); ghostMesh.rotation.y = G_[i * 3 + 2]; }
      const [x, z] = a.cps[run.cp];
      if (Math.hypot(x - c.x, z - c.z) < 11) {
        run.cp++; sfx.pick();
        if (run.cp >= a.cps.length) return endAct(true, fmtT(run.t) + ' · ' + Math.round(a.len) + ' m');
        run.cpMk.set(...a.cps[run.cp]); if (run.cp === a.cps.length - 1) { run.cpMk.ring.material.color.setRGB(3, 3, 3); }
      }
      if (Math.hypot(x - c.x, z - c.z) > 320) return endAct(false, 'Trop loin du parcours');
      const best = Profile.cur && Profile.cur.records['race_' + a.id];
      hud(a.name, fmtT(run.t) + ' · ' + run.cp + ' / ' + (a.cps.length - 1) + (best ? ' · record ' + fmtT(best) : ''));
      objDir(x, z);
      return;
    }
    if (a.kind === 'drift') { const [fx, fz] = c.fwd, lat = Math.abs(c.vx * -fz + c.vz * fx); if (c.speed > 8 && (c.drift > 0 || lat > 3) && c.air < 0.2) { run.combo = Math.min(5, (run.combo || 1) + dt * 0.4); run.score += c.speed * dt * run.combo; } else run.combo = 1; }
    if (a.kind === 'jump') { if (c.air > 0.3) { run.fly = (run.fly || 0) + c.speed * dt; } else if (run.fly) { run.score = Math.max(run.score, run.fly); if (run.fly > 8) flashFor(L, 'Saut de ' + Math.round(run.fly) + ' m', ''); run.fly = 0; } }
    if (a.kind === 'smash') run.score = brokenCount() - run.base;
    if (a.kind === 'cops') { run.score = Math.max(0, a.time - run.t); if ((L.heat || 0) < 1 && run.t > 3) return endAct(true, 'Semés en ' + fmtT(run.t)); }
    if (a.kind === 'deliv') {
      const d = Math.hypot(run.dest[0] - c.x, run.dest[1] - c.z); objDir(...run.dest);
      if (d < 8) { run.score = Math.round((run.limit - run.t) * 10); return endAct(true, 'Livré avec ' + Math.round(run.limit - run.t) + ' s d’avance'); }
      if (run.t > run.limit) return endAct(false, 'Trop tard pour ' + run.destName);
      hud(a.name, 'Livrer ' + run.destName + ' · ' + fmtT(Math.max(0, run.limit - run.t))); return;
    }
    const left = a.time - run.t, unit = a.kind === 'jump' ? ' m' : a.kind === 'smash' ? ' casses' : a.kind === 'cops' ? ' s' : ' pts';
    hud(a.name, fmtT(Math.max(0, left)) + ' · ' + Math.round(run.score) + unit); objDir(null);
    if (left <= 0) { if (a.kind === 'cops') return endAct(false, 'La police t’a gardé en vue'); endAct(run.score > 0, Math.round(run.score) + unit); }
  }
  function actMinimap(add) { if (!acts || run || mode !== 'solo' || mission) return; for (const a of acts) add({ x: a.start[0], z: a.start[1] }, a.kind === 'race' ? '#3ac8ff' : '#ff9a2a'); }
  function actRecords() { // for the campaign screen
    return ACT_DEF.map(d => { const p = Profile.cur, r = p && (d.kind === 'race' ? p.records['race_' + d.id] : p.records['defi_' + d.id]); return { name: d.name, kind: d.kind, best: r === undefined ? null : d.kind === 'race' ? fmtT(r) : r + (d.kind === 'jump' ? ' m' : d.kind === 'smash' ? ' casses' : d.kind === 'deliv' ? ' pts' : d.kind === 'cops' ? ' s d’avance' : ' pts') }; });
  }
