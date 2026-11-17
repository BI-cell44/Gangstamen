  // ---------- races and challenges in the open world (cycle 11) ----------
  // Solo, outside missions: start markers on the map (and the minimap). Drive into one to start. Races follow real
  // streets with checkpoints, a ghost of the best run and medals; challenges: drift, jump, delivery, lose the police,
  // destruction. Records go to the save (Profile.record).
  const ACT_DEF = [
    // (15 nov.) longer runs now that the map reaches Sainte-Anne and the quai de la Fosse: new ids, the records of the
    // old short routes would not compare
    { id: 'r_anne2', kind: 'race', name: 'Sainte-Anne → quai de la Fosse', pts: [[711, 96], [935, 95], [1180, -90], [1300, -330], [1650, -640]] },
    // (17 nov., user) same loop, started on its south-east side: it started beside « Sainte-Anne → quai de la Fosse »
    { id: 'r_butte2', kind: 'race', name: 'Tour de la butte', pts: [[900, 300], [700, 120], [880, -60], [1060, 120], [900, 300]] },
    { id: 'r_lib2', kind: 'race', name: 'Sprint Liberté – Cardiff', pts: [[160, -440], [77, 104], [56, 264], [105, 429], [450, 380], [760, 300]] },
    { id: 'd_drift', kind: 'drift', name: 'Dérapage', at: [45, 283], time: 60, text: 'Glisse le plus longtemps possible (frein à main) : 60 s' },
    { id: 'd_jump', kind: 'jump', name: 'Sauts de la carrière Misery', at: [640, 300], time: 60, text: 'Décolle et vole le plus loin possible : 60 s' },
    { id: 'd_deliv', kind: 'deliv', name: 'Livraison express', at: [118, -139], text: 'Porte le colis à l’adresse avant la fin du chrono' },
    { id: 'd_cops', kind: 'cops', name: 'Semer la police', at: [300, 300], time: 150, text: 'Deux étoiles aux trousses : sème-les avant 2 min 30' },
    { id: 'd_smash', kind: 'smash', name: 'Destruction', at: [520, 380], time: 60, text: 'Casse un maximum de mobilier et de clôtures en 60 s' },
  ];
  // what to do and where to go, shown before the start (briefing) and kept on screen during the run (user feedback:
  // the first texts flashed by too fast and did not say where to go)
  const HOW = {
    race: ['Suis les balises bleues dans l’ordre jusqu’à l’arrivée (balise blanche). La flèche verte et la minicarte montrent la prochaine.', 'Suis la flèche jusqu’à la prochaine balise'],
    drift: ['Fais glisser la voiture avec le frein à main, où tu veux dans le quartier. Plus la glisse dure, plus elle rapporte.', 'Dérape au frein à main, où tu veux'],
    jump: ['Prends de l’élan et décolle sur les buttes de la carrière. Seul ton plus long saut compte. Reste dans la carrière.', 'Décolle sur les buttes de la carrière'],
    deliv: ['Roule jusqu’à la balise blanche avant la fin du chrono. La flèche verte et le point blanc de la minicarte montrent l’adresse.', 'Suis la flèche jusqu’à la balise blanche'],
    cops: ['La police te recherche. Éloigne-toi et reste hors de leur vue jusqu’à ce que les étoiles disparaissent.', 'Fuis hors de leur vue jusqu’à perdre les étoiles'],
    smash: ['Renverse bancs, poubelles, abribus, clôtures et haies, où tu veux dans le quartier.', 'Casse mobilier et clôtures, où tu veux'],
  };
  const KIND_NAME = { race: 'Course', drift: 'Défi', jump: 'Défi', deliv: 'Défi', cops: 'Défi', smash: 'Défi' };
  let after = null, hintOn = false;
  const MEDALS = [['Or', 20], ['Argent', 16], ['Bronze', 13]]; // average speed (m/s) for each medal on a race
  let acts = null, run = null, actHud = null, ghostMesh = null;
  const fmtT = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s % 1) * 10);
  function nearActStart(x, z, m) { actsBuild(); return acts.some(a => Math.hypot(a.start[0] - x, a.start[1] - z) < m); } // (spawnmap.js)
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
    for (const a of acts) if (unlocked(a.id) && (!a.mk || !markers.includes(a.mk))) a.mk = addMarker(a.start[0], a.start[1], 6, a.kind === 'race' ? 0x3ac8ff : 0xff9a2a);
  }
  function actReset() { if (acts) actHide(); if (run) { dropGhost(); run = null; } actPanel(null); after = null; hintOn = false; } // (16 nov.) back to the menu: nothing left running
  function actHide() { for (const a of acts || []) if (a.mk) { scene.remove(a.mk.beam, a.mk.ring); const i = markers.indexOf(a.mk); if (i >= 0) markers.splice(i, 1); a.mk = null; } }
  function actPanel(title, text) { // the mission panel (title, line, arrow to the target)
    if (!title) { objEl.hidden = true; objBar(null); objDir(null); return; }
    objective(title, text);
  }
  function startAct(a) {
    const L = locals[0], c = L.car;
    run = { a, t: 0, count: 7, score: 0, cp: 1, trail: [], trailT: 0 }; after = null; hintOn = false; // 7 s of briefing, car held (fire to start at once)
    actHide();
    if (a.kind === 'race') {
      const [x, z] = a.path[0], [x2, z2] = a.path[Math.min(3, a.path.length - 1)]; c.place(x, z, heading(x, z, x2, z2)); c.vx = c.vz = 0;
      run.cpMk = addMarker(...a.cps[1], 9, a.cps.length === 2 ? 0xffffff : 0x3ac8ff);
      if (a.cps.length > 2) { run.cpNext = addMarker(...a.cps[2], 5, a.cps.length === 3 ? 0xffffff : 0x3ac8ff); run.cpNext.beam.material.opacity = 0.1; } // the one after, fainter: shows which way the route turns
      const g = Profile.cur && Profile.cur.records['ghost_' + a.id]; if (g) { run.ghost = g; ghostMesh = makeGhost(c.style); }
    } else if (a.kind === 'deliv') {
      const far = (lo, hi) => (W.shops || []).filter(s => { const d = Math.hypot(s.x - c.x, s.z - c.z); return d > lo && d < hi && nodeOk(nearestNode(s.x, s.z)); });
      let shops = far(900, 1700); if (shops.length < 5) shops = far(500, 1700); // (15 nov.) farther across the town than before (350 to 800 m)
      const s = shops[(R() * shops.length) | 0] || { x: 600, z: 200, n: 'Le quai' }, [tx, tz] = roadPoint(s.x, s.z);
      const len = route(c.x, c.z, tx, tz).reduce((acc, p, i, A) => acc + (i ? Math.hypot(p[0] - A[i - 1][0], p[1] - A[i - 1][1]) : 0), 0);
      run.dest = [tx, tz]; run.destName = s.n || 'le client'; run.limit = Math.round(len / 13 + 12); run.mk = addMarker(tx, tz, 7, 0xffffff);
    } else if (a.kind === 'cops') { L.heat = 2.5; L.calm = 0; L.unseen = 0; }
    else if (a.kind === 'smash') run.last = brokenCount();
  }
  function brokenCount() { let n = 0; for (const f of furniture) if (f.broken) n++; for (const p of Fences.panels) if (p.broken) n++; return n + LightPoles.broken; }
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
    const gain = ok ? ' · respect gagné' : '';
    after = { title: a.name + ' : ' + (ok ? (medal ? 'médaille ' + medal : 'réussi') + (rec ? ', nouveau record !' : '') : 'raté'), text: line + gain, t: 7 }; // the result stays 7 s on the panel
    sfx.pick();
    for (const m of [run.cpMk, run.cpNext, run.mk]) if (m) { scene.remove(m.beam, m.ring); const i = markers.indexOf(m); if (i >= 0) markers.splice(i, 1); }
    dropGhost(); actPanel(null); run = null;
  }
  function actStep(dt) {
    const free = mode === 'solo' && soloKind === 'free' && !mission && !gm && locals.length === 1; // (16 nov.) not in « Chasse aux Rapaces »
    if (!free) { if (run || after || hintOn) actReset(); else if (acts) actHide(); return; } // (16 nov., user) the hint panel too: it stayed up in « Chasse aux Rapaces »
    actsBuild(); const L = locals[0], c = L.car;
    if (!run) {
      actMarkers();
      if (after) { after.t -= dt; objective(after.title, after.text); objDir(null); if (after.t <= 0) { after = null; actPanel(null); } return; }
      // near a start marker: say what it is and how to start it
      let nearA = null, nd = 45; for (const a of acts) { const d = Math.hypot(a.start[0] - c.x, a.start[1] - c.z); if (unlocked(a.id) && d < nd) { nd = d; nearA = a; } }
      if (nearA) { hintOn = true; objective(KIND_NAME[nearA.kind] + ' : ' + nearA.name, 'Arrête-toi dans la balise ' + (nearA.kind === 'race' ? 'bleue' : 'orange') + ' pour commencer'); objDir(nearA.start[0], nearA.start[1]); }
      else if (hintOn) { hintOn = false; actPanel(null); }
      if (nearA && c.alive && nd < 6 && c.speed < 8) startAct(nearA);
      return;
    }
    const a = run.a;
    if (!c.alive) return endAct(false, 'Ta caisse est en morceaux');
    if (run.count > 0) { // briefing: the full instruction, readable, then go
      run.count -= dt; c.vx = c.vz = 0; if (L._inp && L._inp.fire && run.count > 0.6) run.count = 0.6;
      const extra = a.kind === 'deliv' ? '\nAdresse : ' + run.destName + ' · ' + run.limit + ' s' : a.kind === 'race' ? '\n' + Math.round(a.len) + ' m · ' + (a.cps.length - 1) + ' balises' : a.time ? '\nDurée : ' + a.time + ' s' : '';
      actPanel(KIND_NAME[a.kind] + ' : ' + a.name, HOW[a.kind][0] + extra + '\n' + (run.count > 0.6 ? 'Départ dans ' + Math.ceil(run.count) + ' s (tir : partir tout de suite)' : 'Partez !'));
      const tgt = a.kind === 'race' ? a.cps[1] : a.kind === 'deliv' ? run.dest : null; if (tgt) objDir(tgt[0], tgt[1]); else objDir(null);
      return;
    }
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
        if (run.cpNext) { if (run.cp + 1 < a.cps.length) { run.cpNext.set(...a.cps[run.cp + 1]); if (run.cp + 1 === a.cps.length - 1) run.cpNext.ring.material.color.setRGB(3, 3, 3); } else { run.cpNext.beam.visible = run.cpNext.ring.visible = false; } }
      }
      if (Math.hypot(x - c.x, z - c.z) > 320) return endAct(false, 'Trop loin du parcours');
      const best = Profile.cur && Profile.cur.records['race_' + a.id];
      actPanel(a.name, (run.cp === a.cps.length - 1 ? 'Dernière ligne droite : fonce vers la balise blanche' : HOW.race[1]) + '\n' + fmtT(run.t) + ' · balise ' + run.cp + ' / ' + (a.cps.length - 1) + (best ? ' · record ' + fmtT(best) : ''));
      objDir(x, z);
      return;
    }
    if (a.kind === 'drift') { const [fx, fz] = c.fwd, lat = Math.abs(c.vx * -fz + c.vz * fx); if (c.speed > 8 && (c.drift > 0 || lat > 3) && c.air < 0.2) { run.combo = Math.min(5, (run.combo || 1) + dt * 0.4); run.score += c.speed * dt * run.combo; } else run.combo = 1; }
    if (a.kind === 'jump') { if (c.air > 0.3) { run.fly = (run.fly || 0) + c.speed * dt; } else if (run.fly) { run.score = Math.max(run.score, run.fly); if (run.fly > 8) flashFor(L, 'Saut de ' + Math.round(run.fly) + ' m', ''); run.fly = 0; } }
    if (a.kind === 'smash') { const n = brokenCount(); if (n > run.last) run.score = (run.score || 0) + n - run.last; run.last = n; } // each new break counts; things broken earlier get repaired far from the player, which made the total go down, below zero (user, 15 Nov.)
    if (a.kind === 'cops') { run.score = Math.max(0, a.time - run.t); if ((L.heat || 0) < 1 && run.t > 3) return endAct(true, 'Semés en ' + fmtT(run.t)); }
    if (a.kind === 'deliv') {
      const d = Math.hypot(run.dest[0] - c.x, run.dest[1] - c.z); objDir(...run.dest);
      if (d < 8) { run.score = Math.round((run.limit - run.t) * 10); return endAct(true, 'Livré avec ' + Math.round(run.limit - run.t) + ' s d’avance'); }
      if (run.t > run.limit) return endAct(false, 'Trop tard pour ' + run.destName);
      actPanel(a.name, HOW.deliv[1] + ' (' + run.destName + ')\nReste ' + fmtT(Math.max(0, run.limit - run.t))); return;
    }
    const left = a.time - run.t, unit = a.kind === 'jump' ? ' m' : a.kind === 'smash' ? ' casses' : a.kind === 'cops' ? ' s' : ' pts';
    let line = HOW[a.kind][1]; objDir(null);
    if (a.kind === 'jump') { const d = Math.hypot(a.start[0] - c.x, a.start[1] - c.z); if (d > 110) { line = 'Reviens dans la carrière (suis la flèche)'; objDir(a.start[0], a.start[1]); } }
    actPanel(a.name, line + '\nReste ' + fmtT(Math.max(0, left)) + ' · ' + Math.round(run.score) + unit);
    if (left <= 0) { if (a.kind === 'cops') return endAct(false, 'La police t’a gardé en vue'); endAct(run.score > 0, Math.round(run.score) + unit); }
  }
  function actMinimap(add) {
    if (run) { const a = run.a;
      if (a.kind === 'race') for (let k = a.cps.length - 1; k >= run.cp; k--) add({ x: a.cps[k][0], z: a.cps[k][1] }, k === run.cp ? '#ffffff' : k === a.cps.length - 1 ? '#ffe14a' : '#3ac8ff');
      if (run.dest) add({ x: run.dest[0], z: run.dest[1] }, '#ffffff');
      if (a.kind === 'jump') add({ x: a.start[0], z: a.start[1] }, '#ff9a2a');
      return; }
    if (!acts || mode !== 'solo' || mission) return; for (const a of acts) if (unlocked(a.id)) add({ x: a.start[0], z: a.start[1] }, a.kind === 'race' ? '#3ac8ff' : '#ff9a2a'); }
  function actRecords() { // for the campaign screen
    return ACT_DEF.map(d => { const p = Profile.cur, r = p && (d.kind === 'race' ? p.records['race_' + d.id] : p.records['defi_' + d.id]); return { id: d.id, name: d.name, kind: d.kind, best: r === undefined ? null : d.kind === 'race' ? fmtT(r) : r + (d.kind === 'jump' ? ' m' : d.kind === 'smash' ? ' casses' : d.kind === 'deliv' ? ' pts' : d.kind === 'cops' ? ' s d’avance' : ' pts') }; });
  }
