  // =====================================================================================
  // split-screen modes: capture the flag (butte vs boulevard), king of the hill (place Jean-Macé), checkpoint race
  // =====================================================================================
  let gm = null;
  const MODE_NAMES = { 2: 'Capture du drapeau', 3: 'Roi de la colline', 4: 'Course de checkpoints' };
  function flagMesh(team) {
    const g = new THREE.Group(), T = TEAMS[team];
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 8), chrome); pole.position.y = 1.6; g.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95, 8, 4), new THREE.MeshStandardMaterial({ color: hd.lin(T.body), emissive: hd.lin(T.body), emissiveIntensity: 0.35, side: THREE.DoubleSide, roughness: 0.7 }));
    cloth.position.set(0.78, 2.7, 0); g.add(cloth); g.userData.cloth = cloth;
    const p0 = cloth.geometry.attributes.position.array.slice(); cloth.userData.p0 = p0;
    g.traverse(o => { o.userData.hdLinear = true; o.castShadow = !!o.geometry; }); scene.add(g); return g;
  }
  const CP_ROUTE = [[160, -440], [-150, -537], [-86, -374], [-200, -150], [-232, 352], [-300, 540], [45, 283], [100, 20]];
  function setupMode(k) {
    gm = { kind: k, t: 0, objs: [] };
    if (k === 2) { // flags at the two bases
      gm.score = [0, 0];
      gm.flags = [0, 1].map(t => { const b = bases()[t], [x, z] = [b.x + b.ux * 14, b.z + b.uz * 14]; const m = addMarker(x, z, 4, TEAMS[t].body); return { team: t, home: [x, z], x, z, carrier: null, atHome: true, mesh: flagMesh(t), marker: m, idle: 0 }; });
      Match.goal = 3;
    } else if (k === 3) {
      const [x, z] = roadPoint(...P.jeanMace); gm.hill = addMarker(x, z, 26, 0xf2c81e); gm.owner = null;
      for (const r of rivals) r.ai.goal = { x, z };
      for (const L of locals) L.hillT = 0;
      Match.goal = 60;
    } else if (k === 4) {
      benchRivals();
      gm.cps = CP_ROUTE.map(([x, z], i) => { const [a, b] = roadPoint(x, z); return addMarker(a, b, 9, i === CP_ROUTE.length - 1 ? 0xffffff : 0x3ac8ff); });
      for (const L of locals) { L.cp = 0; L.kills = 0; }
      gm.count = 3.5; Match.goal = gm.cps.length;
    }
    updateClock();
  }
  function stopMode() { if (!gm) return; if (gm.flags) for (const f of gm.flags) scene.remove(f.mesh); clearMarkers(); if (gm.kind === 4) restoreRivals(); gm = null; }
  function modeStep(dt) {
    if (!gm) return;
    gm.t += dt;
    const now = performance.now();
    if (gm.kind === 2) {
      const cars = [...allPlayerCars(), ...rivals].filter(c => c.alive && c.team >= 0);
      for (const f of gm.flags) {
        if (f.carrier && !f.carrier.alive) { f.carrier = null; f.idle = 0; flashAll('Drapeau ' + (f.team ? 'chantenaysien' : 'des Rapaces') + ' à terre', ''); }
        if (f.carrier) { f.x = f.carrier.x; f.z = f.carrier.z; }
        else if (!f.atHome) { f.idle += dt; if (f.idle > 25) { f.atHome = true; [f.x, f.z] = f.home; } }
        for (const c of cars) {
          if (f.carrier || Math.hypot(c.x - f.x, c.z - f.z) > 4.5) continue;
          if (c.team !== f.team) { f.carrier = c; f.atHome = false; f.idle = 0; sfx.pick(); flashAll((c.owner && c.owner.slot !== undefined ? 'J' + (c.owner.slot + 1) : TEAMS[c.team].one) + ' a le drapeau !', 'Ramène-le à ta base'); break; }
          if (!f.atHome) { f.atHome = true; [f.x, f.z] = f.home; sfx.pick(); flashAll('Drapeau ramené', TEAMS[f.team].short); break; }
        }
        // capture: carrier reaches its own flag, which must be at home
        if (f.carrier) { const own = gm.flags[f.carrier.team]; if (own.atHome && Math.hypot(f.carrier.x - own.home[0], f.carrier.z - own.home[1]) < 6) {
          const tm = f.carrier.team; gm.score[tm]++; if (f.carrier.owner && f.carrier.local) { f.carrier.owner.kills++; f.carrier.owner.respect += 300; }
          flashAll('Capture ! ' + TEAMS[tm].short, gm.score[0] + ' – ' + gm.score[1]); say('Drapeau capturé pour les ' + TEAMS[tm].short + ' !', { cancel: true });
          f.carrier = null; f.atHome = true; [f.x, f.z] = f.home; for (const L of locals) rumbleFor(L, 0.5, 0.6, 300);
        } }
        const y = f.carrier ? f.carrier.mesh.position.y + 1.1 : surfaceH(f.x, f.z) + 0.2;
        f.mesh.position.set(f.x, y, f.z); f.mesh.rotation.y = now / 1400;
        const cl = f.mesh.userData.cloth, pa = cl.geometry.attributes.position, p0 = cl.userData.p0;
        for (let i = 0; i < pa.count; i++) { const x = p0[i * 3]; pa.array[i * 3 + 2] = Math.sin(x * 3 + now / 160) * 0.12 * (x + 0.75); } pa.needsUpdate = true;
        f.marker.set(f.x, f.z); f.marker.beam.visible = !f.carrier;
      }
      for (const r of rivals) { // bots: grab the other flag, carriers go home
        const enemyFlag = gm.flags[1 - r.team], mine = gm.flags[r.team];
        r.ai.goal = enemyFlag.carrier === r ? { x: mine.home[0], z: mine.home[1] } : !mine.atHome && !mine.carrier ? { x: mine.x, z: mine.z } : { x: enemyFlag.x, z: enemyFlag.z };
        if (enemyFlag.carrier === r) { r.ai.mode = 'cruise'; }
      }
    } else if (gm.kind === 3) {
      const h = gm.hill, inside = c => c.alive && Math.hypot(c.x - h.x, c.z - h.z) < h.r;
      const ps = locals.filter(L => inside(L.car)), bots = rivals.filter(inside);
      const teams = new Set(ps.map(L => teamMode ? 't' + L.team : 'p' + L.slot)); bots.forEach(r => teams.add(teamMode ? 't' + r.team : 'bots'));
      for (const R of Net.remotes.values()) if (inside(R.car)) teams.add('r' + R.peer);
      const owner = teams.size === 1 ? [...teams][0] : null;
      for (const L of ps) if (owner && (teamMode ? 't' + L.team : 'p' + L.slot) === owner) { L.hillT += dt; L.kills = Math.floor(L.hillT); }
      if (owner && owner !== gm.owner && owner[0] === 'p') say('Tu tiens la place !', { rate: 1.2 });
      if (owner !== gm.owner) { gm.owner = owner; h.ring.material.color.setHex(owner ? (owner === 'bots' ? 0xff3b3b : 0x7be07b) : 0xf2c81e).multiplyScalar(3); }
      h.beam.material.opacity = teams.size > 1 ? 0.35 + Math.sin(now / 90) * 0.15 : 0.2;
    } else if (gm.kind === 4) {
      if (gm.count > 0) {
        const before = Math.ceil(gm.count); gm.count -= dt; const after = Math.ceil(gm.count);
        for (const L of locals) { L.car.vx = L.car.vz = 0; }
        if (after !== before) { flashAll(after > 0 ? String(after) : 'Partez !', after > 0 ? 'Course de checkpoints' : ''); sfx.gun(after > 0); }
      }
      for (const L of locals) {
        const cp = gm.cps[L.cp]; if (!cp) continue;
        if (Math.hypot(L.car.x - cp.x, L.car.z - cp.z) < cp.r + 2) { L.cp++; L.kills = L.cp; L.respect += 50; sfx.pick(); flashFor(L, L.cp >= gm.cps.length ? 'Arrivée !' : 'Checkpoint ' + L.cp + ' / ' + gm.cps.length, ''); }
      }
      gm.cps.forEach((m, i) => { const next = locals.some(L => L.cp === i); m.beam.material.opacity = next ? 0.3 + Math.sin(now / 150) * 0.1 : 0.05; m.ring.visible = next || locals.some(L => L.cp < i); });
    }
    if (locals.length === 1 || true) {
      const txt = gm.kind === 2 ? 'Rapaces ' + gm.score[0] + ' – ' + gm.score[1] + ' Chantenaysiens' : gm.kind === 3 ? (gm.owner ? (gm.owner === 'bots' ? 'Les Rapaces tiennent la place' : gm.owner[0] === 'r' ? ((Net.remotes.get(gm.owner.slice(1)) || {}).nick || 'Un joueur') + ' tient la place' : gm.owner[0] === 't' ? TEAMS[+gm.owner[1]].short + ' tiennent la place' : 'J' + (+gm.owner.slice(1) + 1) + ' tient la place') : 'Place libre ou disputée')
        : locals.map(L => (mode === 'online' ? 'Toi' : 'J' + (L.slot + 1)) + ' ' + Math.min(L.cp, gm.cps.length) + '/' + gm.cps.length).join(' · ') + (mode === 'online' && Net.remotes.size ? ' · en tête : ' + Math.max(0, ...[...Net.remotes.values()].map(R => R.kills)) : '');
      objective(MODE_NAMES[gm.kind], txt); objDir(null);
    }
  }
  function modeTeamScores() { return gm && gm.kind === 2 ? gm.score.slice() : null; }
  function goalText() { return gm ? (gm.kind === 2 ? '3 captures pour gagner' : gm.kind === 3 ? '60 points pour gagner' : gm.cps.length + ' checkpoints') : ''; }
  function rematchMode() { if (!gm) return; const k = gm.kind; stopMode(); setupMode(k); }
