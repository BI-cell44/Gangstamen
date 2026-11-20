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
  // (17 nov., user) the Rapaces' flag on the place des Garennes, up the butte; the Chantenaysiens' in front of the town hall
  const FLAG_AT = [[864, 30], [160, -440]];
  // (17 nov., user) the race is a loop: start on the grid of the boulevard de la Liberté (raceGrid, game/teams.js), first
  // checkpoint at RACE_CP1, then the town hall… the station, and the finish line back on the grid; one or more laps
  const CP_ROUTE = [RACE_CP1, [160, -440], [-150, -537], [-86, -374], [-200, -150], [-232, 352], [-300, 540]];
  // goal: the host's Match.goal for an online guest (already in the host's units), else the menu's choice
  function setupMode(k, goal) {
    gm = { kind: k, t: 0, objs: [] };
    if (k === 2) { // flags at the two bases
      gm.score = [0, 0];
      // (19 nov., user) each flag on its team's base picked in the menu
      const at = t => gamePlaces ? [START_PLACES[gamePlaces[2 + t]][1], START_PLACES[gamePlaces[2 + t]][2]] : FLAG_AT[t];
      gm.flags = [0, 1].map(t => { const [x, z] = roadPoint(...at(t)); const m = addMarker(x, z, 4, TEAMS[t].body); return { team: t, home: [x, z], x, z, carrier: null, atHome: true, mesh: flagMesh(t), marker: m, idle: 0 }; });
      Match.goal = goal ?? modeGoalSetting(2);
    } else if (k === 3) {
      // (19 nov., user) the place to hold is picked in the menu (the place Jean-Macé itself for the first one)
      const hp = gamePlaces ? gamePlaces[1] : 0, [x, z] = roadPoint(...(hp ? START_PLACES[hp].slice(1, 3) : P.jeanMace));
      gm.hill = addMarker(x, z, 26, 0xf2c81e); gm.owner = null; gm.hillName = placeName(hp);
      for (const r of rivals) r.ai.goal = { x, z };
      for (const L of locals) L.hillT = 0;
      Match.goal = goal ?? modeGoalSetting(3);
    } else if (k === 4) {
      benchRivals();
      const g = raceGrid();
      gm.start = [g.x, g.z];
      gm.cps = CP_ROUTE.map(([x, z]) => { const [a, b] = roadPoint(x, z); return addMarker(a, b, 9, OBJ_COL); });
      gm.cps.push(addMarker(g.x, g.z, 9, OBJ_COL));
      gm.cps.forEach((m, i) => { m.beam.visible = m.ring.visible = i === 0; });
      const n = gm.cps.length;
      gm.laps = Math.max(1, goal ? Math.round(goal / n) : modeGoalSetting(4) || 1);
      for (const L of locals) { L.cp = 0; L.kills = 0; }
      gm.count = 3.5; Match.goal = gm.laps * n;
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
      // (20 nov.) online, the host decides who takes, brings back and captures the flags; a guest shows the host's state
      // (applyFlags) and only moves a carried flag with its carrier
      const guest = mode === 'online' && !Net.isHost;
      for (const f of gm.flags) {
        if (guest) { if (f.carrier) { f.x = f.carrier.x; f.z = f.carrier.z; } }
        else if (f.carrier && !f.carrier.alive) { f.carrier = null; f.idle = 0; flashAll('Drapeau ' + (f.team ? 'chantenaysien' : 'des Rapaces') + ' à terre', ''); }
        if (f.carrier) { f.x = f.carrier.x; f.z = f.carrier.z; }
        else if (!f.atHome) { f.idle += dt; if (f.idle > 25) { f.atHome = true; [f.x, f.z] = f.home; } }
        if (!guest) for (const c of cars) {
          if (f.carrier || Math.hypot(c.x - f.x, c.z - f.z) > 4.5) continue;
          if (c.team !== f.team) { f.carrier = c; f.atHome = false; f.idle = 0; sfx.pick(); flashAll((c.owner && c.owner.slot !== undefined ? 'J' + (c.owner.slot + 1) : TEAMS[c.team].one) + ' a le drapeau !', 'Ramène-le à ta base'); break; }
          if (!f.atHome) { f.atHome = true; [f.x, f.z] = f.home; sfx.pick(); flashAll('Drapeau ramené', TEAMS[f.team].short); break; }
        }
        // capture: carrier reaches its own flag, which must be at home
        if (f.carrier && !guest) { const own = gm.flags[f.carrier.team]; if (own.atHome && Math.hypot(f.carrier.x - own.home[0], f.carrier.z - own.home[1]) < 6) {
          const tm = f.carrier.team; gm.score[tm]++; if (f.carrier.owner && f.carrier.local) { f.carrier.owner.kills++; f.carrier.owner.respect += 300; }
          if (mode === 'online') gm.capBy = [idOfCar(f.carrier), gm.score[0] + gm.score[1]];
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
      const n = gm.cps.length;
      for (const L of locals) {
        if (gm.count > 0 || L.cp >= Match.goal || !L.car.alive) continue;
        const cp = gm.cps[L.cp % n];
        if (Math.hypot(L.car.x - cp.x, L.car.z - cp.z) < cp.r + 2) {
          L.cp++; L.kills = L.cp; L.respect += 50; sfx.pick();
          const i = L.cp % n, lap = Math.floor(L.cp / n);
          flashFor(L, L.cp >= Match.goal ? 'Arrivée !' : i === 0 ? 'Tour ' + (lap + 1) + ' / ' + gm.laps : 'Checkpoint ' + i + ' / ' + n, L.cp >= Match.goal ? '' : i === n - 1 ? 'Prochain : la ligne d’arrivée' : '');
        }
      }
      // only the checkpoints a player has to reach next are shown (before, all of them were, and the players started
      // beside the last one)
      // (17 nov., user) each player's next checkpoint bright and pulsing, the one after it faint
      gm.cps.forEach((m, i) => { const next = locals.some(L => L.cp < Match.goal && L.cp % n === i), after = !next && locals.some(L => L.cp + 1 < Match.goal && (L.cp + 1) % n === i);
        m.beam.visible = m.ring.visible = next || after; m.beam.material.opacity = next ? 0.3 + Math.sin(now / 150) * 0.1 : 0.06; m.ring.material.opacity = next ? 0.8 : 0.3; });
    }
    if (locals.length === 1 || true) {
      const txt = gm.kind === 2 ? 'Rapaces ' + gm.score[0] + ' – ' + gm.score[1] + ' Chantenaysiens' : gm.kind === 3 ? (gm.owner ? (gm.owner === 'bots' ? 'Les Rapaces tiennent la place' : gm.owner[0] === 'r' ? ((Net.remotes.get(gm.owner.slice(1)) || {}).nick || 'Un joueur') + ' tient la place' : gm.owner[0] === 't' ? TEAMS[+gm.owner[1]].short + ' tiennent la place' : 'J' + (+gm.owner.slice(1) + 1) + ' tient la place') : 'Place libre ou disputée')
        : locals.map(L => (mode === 'online' ? 'Toi' : 'J' + (L.slot + 1)) + ' ' + raceText(L.cp)).join(' · ') + (mode === 'online' && Net.remotes.size ? ' · en tête : ' + raceText(Math.max(0, ...[...Net.remotes.values()].map(R => R.kills))) : '');
      objective(MODE_NAMES[gm.kind] + (gm.kind === 3 && gm.hillName ? ' · ' + gm.hillName : ''), txt); objDir(null);
    }
  }
  function raceText(cp) { const n = gm.cps.length, c = Math.min(cp, Match.goal); if (gm.laps === 1) return c + '/' + n; const lap = Math.min(gm.laps, Math.floor(c / n) + 1); return 'T' + lap + '/' + gm.laps + ' ' + (c >= Match.goal ? n : c % n) + '/' + n; }
  // (17 nov.) where a player has to go next (green chevron on the rim of his minimap) and where a wrecked car comes back
  function scoreText(k) { return !gm ? k + ' KO' : gm.kind === 2 ? k + (k > 1 ? ' captures' : ' capture') : gm.kind === 3 ? k + ' points' : k >= Match.goal ? 'Arrivée' : 'Checkpoints ' + raceText(k); }
  function modeTarget(L) {
    if (!gm || !L) return null;
    if (gm.kind === 2) { // (17 nov., user) flag: bring it home, chase whoever has ours, pick ours up, or go for theirs
      const c = L.car, t = c.team; if (!(t === 0 || t === 1)) return null;
      const mine = gm.flags[t], theirs = gm.flags[1 - t];
      if (theirs.carrier === c) return { x: mine.home[0], z: mine.home[1], col: TEAMS[t].css };
      if (mine.carrier) return { x: mine.carrier.x, z: mine.carrier.z, col: TEAMS[t].css }; // chevron in the colour of the flag it points at
      if (!mine.atHome) return { x: mine.x, z: mine.z, col: TEAMS[t].css };
      if (theirs.carrier) return { x: mine.home[0], z: mine.home[1], col: TEAMS[t].css }; // a team-mate has it: back to base with him
      return { x: theirs.x, z: theirs.z, col: TEAMS[1 - t].css };
    }
    if (gm.kind !== 4 || L.cp >= Match.goal) return null;
    const m = gm.cps[L.cp % gm.cps.length]; return { x: m.x, z: m.z, col: OBJ_CSS };
  }
  function raceRespawn(L) {
    if (!gm || gm.kind !== 4) return null;
    const n = gm.cps.length, i = L.cp % n, [x, z] = i === 0 ? gm.start : [gm.cps[i - 1].x, gm.cps[i - 1].z], t = gm.cps[i];
    return [x, z, Math.atan2(-(t.x - x), -(t.z - z))];
  }
  function modeTeamScores() { return gm && gm.kind === 2 ? gm.score.slice() : null; }
  function goalText() { return gm ? (gm.kind === 2 ? Match.goal + (Match.goal > 1 ? ' captures' : ' capture') + ' pour gagner' : gm.kind === 3 ? Match.goal + ' points pour gagner' : (gm.laps > 1 ? gm.laps + ' tours de ' : '') + gm.cps.length + ' checkpoints') : ''; }
  // online flags: a car named by its peer (players) or 'b' + index (the host's Rapaces)
  function idOfCar(c) { if (!c) return null; const L = locals.find(L => L.car === c); if (L) return Net.me; for (const R of Net.remotes.values()) if (R.car === c) return R.peer; const i = rivals.indexOf(c); return i >= 0 ? 'b' + i : null; }
  function carOfId(id) { if (id == null) return null; if (id === Net.me) return locals[0] && locals[0].car; if (typeof id === 'string' && /^b\d+$/.test(id)) return rivals[+id.slice(1)] || null; const R = Net.remotes.get(id); return R ? R.car : null; }
  // the host's presence: [score 0, score 1, [x, z, at home, carrier] per flag, last capture [carrier, captures so far]]
  function netFlags() { return gm && gm.kind === 2 ? [gm.score[0], gm.score[1], gm.flags.map(f => [Math.round(f.x * 10) / 10, Math.round(f.z * 10) / 10, f.atHome ? 1 : 0, idOfCar(f.carrier)]), gm.capBy || null] : null; }
  // a guest takes the host's state, with the messages a change brings
  function applyFlags(cf) {
    if (!gm || gm.kind !== 2 || !Array.isArray(cf) || !Array.isArray(cf[2]) || cf[2].length !== 2) return;
    const s = [+cf[0] || 0, +cf[1] || 0];
    if (s[0] + s[1] > gm.score[0] + gm.score[1]) {
      const tm = s[0] > gm.score[0] ? 0 : 1, cap = Array.isArray(cf[3]) ? cf[3] : null;
      flashAll('Capture ! ' + TEAMS[tm].short, s[0] + ' – ' + s[1]); say('Drapeau capturé pour les ' + TEAMS[tm].short + ' !', { cancel: true }); sfx.pick();
      // my own capture counts for me
      if (cap && cap[0] === Net.me && locals[0]) { locals[0].kills++; locals[0].respect += 300; for (const L of locals) rumbleFor(L, 0.5, 0.6, 300); }
    }
    gm.score = s;
    gm.flags.forEach((f, t) => {
      const [x, z, home, id] = cf[2][t] || []; const car = carOfId(id);
      if (car && car !== f.carrier) { sfx.pick(); flashAll((car === (locals[0] && locals[0].car) ? 'Tu as' : car.owner && car.owner.nick ? car.owner.nick + ' a' : TEAMS[car.team] ? TEAMS[car.team].one + ' a' : 'Quelqu’un a') + ' le drapeau !', car === (locals[0] && locals[0].car) ? 'Ramène-le à ta base' : ''); }
      else if (!car && f.carrier && !home) flashAll('Drapeau ' + (t ? 'chantenaysien' : 'des Rapaces') + ' à terre', '');
      else if (home && !f.atHome && !car && !f.carrier) flashAll('Drapeau ramené', TEAMS[t].short);
      f.carrier = car; f.atHome = !!home;
      if (!car && Number.isFinite(+x) && Number.isFinite(+z)) { f.x = +x; f.z = +z; }
    });
  }
  // for the tests: the state of the split / online mode
  function modeInfo() { return gm && { kind: gm.kind, hill: gm.hill && [gm.hill.x, gm.hill.z, gm.hill.r], owner: gm.owner, flags: gm.flags && gm.flags.map(f => [f.x, f.z, f.atHome, !!f.carrier]), score: gm.score }; }
  function rematchMode() { if (!gm) return; const k = gm.kind, g = Match.goal; stopMode(); setupMode(k, g); }
