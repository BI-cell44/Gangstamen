  // =====================================================================================
  // the campaign: seven missions in the spirit of a 70s/90s car-combat B-movie
  // =====================================================================================
  const P = { // places, in game metres (OpenStreetMap)
    liberte: [100, 20], jeanMace: [45, 283], gare: [-300, 540], eglise: [-232, 352], bourg: [-237, 361],
    cardiff: [360, 430], mairie: [160, -440], marseillaise: [-150, -537], nation: [-86, -374],
  };
  const roadPoint = (x, z) => { const n = nearestNodeTo(x, z); return [G.x[n], G.z[n]]; };
  const headTo = (a, b) => heading(a[0], a[1], b[0], b[1]);
  function placePlayer(at, toward) {
    const L = locals[0], [x, z] = roadPoint(...at), n = nearestNodeTo(x, z), nb = G.adj[n].reduce((b, v) => !toward || Math.hypot(G.x[v] - toward[0], G.z[v] - toward[1]) < Math.hypot(G.x[b] - toward[0], G.z[b] - toward[1]) ? v : b, G.adj[n][0]);
    L.car.place(x, z, heading(x, z, G.x[nb], G.z[nb])); L.spawn = [x, z, L.car.h]; L.car.hp = 100; L.car.alive = true; L.car.vx = L.car.vz = 0; L.deadT = 0;
    const u = L.car.mesh.userData; if (u.mBody) u.mBody.color.setHex(u.base); if (u.mPaint) u.mPaint.color.setHex(u.paint);
    { const [fx, fz] = L.car.fwd; L.cam.position.set(x - fx * 9, surfaceH(x, z) + 70, z - fz * 9); } // (16 nov.) the camera comes down from the sky, not across the district
  }
  const MISSIONS = [
    { id: 'retour', title: 'Retour au quartier', where: 'Boulevard de la Liberté',
      intro: [['radio', 'Chantenay FM, 92.4, il est dix-huit heures. Un an que les Rapaces de la Butte font la loi dans le quartier…'], ['toi', 'Un an que je suis parti. Rien n’a changé. Ou alors en pire.'],
        ['dede', 'Petit ! C’est toi ? Ta caisse fait un bruit de casserole. Passe au garage, je vais te la remettre d’aplomb.'], ['dede', 'C’est sur le boulevard, tu verras le panneau bleu. Et méfie-toi : les Rapaces surveillent la rue.']],
      outro: [['dede', 'Voilà. Ici tu peux réparer, recharger les armes, gonfler le moteur… et repeindre la caisse quand les flics te cherchent.'], ['dede', 'Ça se paie en respect. Et du respect, tu vas en gagner. Nadia t’attend place Jean-Macé.']],
      setup(m) { placePlayer([118, -139], P.jeanMace); m.dest = addMarker(GARAGE.x, GARAGE.z, 5, OBJ_COL); m.rap = [missionRapace(...roadPoint(70, 260), 0, { hp: 50 })]; },
      update(m) { objective('Retour au quartier', 'Rejoins le Garage de Chantenay'); objDir(GARAGE.x, GARAGE.z); return m.garageVisited ? 'win' : null; },
      garage: true },
    { id: 'jeanmace', title: 'La place Jean-Macé', where: 'Place Jean-Macé',
      intro: [['nadia', 'Te voilà enfin. La place Jean-Macé, c’était chez nous. Maintenant les Rapaces y garent leurs caisses noires.'], ['nadia', 'Tiens la place quarante-cinq secondes. Tant qu’un Rapace roule dans le cercle, le compteur s’arrête.'], ['toi', 'Quarante-cinq secondes. Facile.'], ['nadia', 'Ils vont arriver de partout. Bonne chance.']],
      outro: [['nadia', 'La place est à nous ! Les gens ressortent sur les terrasses.'], ['radio', 'Flash spécial : les Rapaces viennent de perdre la place Jean-Macé. On n’avait pas vu ça depuis longtemps.'], ['nadia', 'Prochaine étape : j’ai un colis à mettre dans le train de dix-huit heures douze. Il me faut une escorte.']],
      setup(m) { placePlayer([73, 132], P.jeanMace); m.zone = addMarker(...roadPoint(...P.jeanMace), 34, OBJ_COL); m.hold = 0; m.need = 45;
        for (let i = 0; i < 4; i++) { const [x, z] = roadPoint(P.jeanMace[0] + (i % 2 ? 140 : -140), P.jeanMace[1] + (i < 2 ? 90 : -90)); missionRapace(x, z, 0, { respawn: true, goal: { x: m.zone.x, z: m.zone.z } }); } },
      update(m, dt) {
        const c = locals[0].car, inZ = Math.hypot(c.x - m.zone.x, c.z - m.zone.z) < m.zone.r;
        const foes = rivals.filter(r => r.alive && Math.hypot(r.x - m.zone.x, r.z - m.zone.z) < m.zone.r).length;
        if (inZ && !foes && c.alive) m.hold += dt;
        objective('La place Jean-Macé', inZ ? (foes ? foes + ' Rapace' + (foes > 1 ? 's' : '') + ' dans le cercle !' : 'Tiens la place : ' + Math.ceil(m.need - m.hold) + ' s') : 'Entre dans le cercle jaune');
        objBar(m.hold / m.need); objDir(inZ ? null : m.zone.x, m.zone.z);
        return m.hold >= m.need ? 'win' : null;
      } },
    { id: 'gare', title: 'Le train de 18 h 12', where: 'Gare de Chantenay',
      intro: [['nadia', 'Le colis est dans ma 205. Je l’emmène à la gare de Chantenay, toi tu me couvres.'], ['nadia', 'Si les Rapaces me rattrapent, c’est fini. Reste près de moi, je ne roule pas sans toi.'], ['duc', 'Une 205 jaune qui descend vers la gare… Allez me chercher ça, les gars.']],
      outro: [['nadia', 'Le colis est dans le train. On leur a mis une belle claque.'], ['nadia', 'Mais le Vautour, leur lieutenant, a vu ma plaque. Il traîne vers l’église Saint-Martin.']],
      setup(m) {
        placePlayer([60, 250], P.gare);
        const [x, z] = roadPoint(52, 230); m.esc = extraCar(0xf2c81e, 0x1e7a3a, 'p205', { team: 1, hp: 120, friendly: true, guns: false });
        m.rt = route(x, z, ...P.gare); m.esc.place(x, z, headTo([x, z], m.rt[Math.min(2, m.rt.length - 1)])); m.esc.ri = 0;
        m.dest = addMarker(...m.rt[m.rt.length - 1], 9, OBJ_COL); m.wave = 0; m.t = 0;
      },
      update(m, dt) {
        const c = locals[0].car, e = m.esc; m.t += dt;
        if (!e.alive) return 'fail';
        const far = Math.hypot(c.x - e.x, c.z - e.z) > 55;
        const [inp, done] = followRoute(e, m.rt, dt, 13, { wait: far, careful: true });
        drive(e, inp, dt);
        if (m.wave < 3 && m.t > 8 + m.wave * 22) { // ambushes along the way
          m.wave++; for (let i = 0; i < 2; i++) { const ahead = m.rt[Math.min(m.rt.length - 1, e.ri + 6 + i * 3)]; const [x, z] = roadPoint(ahead[0] + (R() - 0.5) * 60, ahead[1] + (R() - 0.5) * 60); const r = missionRapace(x, z, 0); r.ai.mode = 'hunt'; r.ai.tgt = e; }
          flashFor(locals[0], 'Embuscade !', 'Protège la 205');
        }
        objective('Le train de 18 h 12', far ? 'Nadia t’attend : reviens près d’elle' : 'Escorte la 205 jusqu’à la gare · 205 : ' + Math.round(e.hp / e.maxHp * 100) + ' %');
        objBar(e.hp / e.maxHp); objDir(far ? e.x : m.dest.x, far ? e.z : m.dest.z);
        return done ? 'win' : null;
      }, fail: 'La 205 de Nadia est détruite' },
    { id: 'vautour', title: 'Le Vautour', where: 'Église Saint-Martin',
      intro: [['vautour', 'Alors c’est toi, le revenant ? Viens me chercher. Mes potes m’attendent au bord de Loire.'], ['nadia', 'Il file par le boulevard de Cardiff vers la Gare Maritime, pour sauter dans le bac. S’il embarque, il est intouchable. Démolis-le avant !']],
      outro: [['vautour', 'Argh… ma caisse… Le Grand Duc va me tuer.'], ['radio', 'Accrochage spectaculaire du côté de Saint-Martin. Le quartier respire un peu mieux ce soir.'], ['dede', 'Petit… tu as fait du bruit. Les flics commencent à poser des questions.']],
      setup(m) {
        placePlayer([-260, 330], P.cardiff);
        const [x, z] = roadPoint(...P.eglise); m.f = extraCar(0x2a2d33, 0xc8202f, 'saloon', { team: 0, hp: 150, bot: true });
        // (16 nov.) the quai de la Fosse is in the map now: he no longer vanishes at Cardiff, he runs on to the ferry at the Gare Maritime
        m.rt = route(x, z, ...roadPoint(1345, -420)); m.f.place(x, z, headTo([x, z], m.rt[Math.min(2, m.rt.length - 1)])); m.f.maxV = 31; m.f.ri = 0;
        m.dest = addMarker(...m.rt[m.rt.length - 1], 10, OBJ_COL); m.t = 0;
      },
      update(m, dt) {
        const f = m.f; m.t += dt;
        if (!f.alive) return 'win';
        const go = m.t > 3; const [inp, done] = followRoute(f, m.rt, dt, 26, { wait: !go });
        f.ai = { mode: 'hunt' }; drive(f, inp, dt);
        if (m.t > 5 && R() < dt * 1.1) { const c = locals[0].car, d = Math.hypot(c.x - f.x, c.z - f.z), [fx, fz] = f.fwd; if (d < 40 && ((c.x - f.x) * fx + (c.z - f.z) * fz) < 0) dropMineFrom(f); }
        objective('Le Vautour', 'Démolis le Vautour avant le bac · ' + Math.round(f.hp / f.maxHp * 100) + ' %'); objBar(f.hp / f.maxHp); objDir(f.x, f.z);
        return done ? 'fail' : null;
      }, fail: 'Le Vautour a sauté dans le bac à la Gare Maritime' },
    { id: 'police', title: 'Pin-pon', where: 'Boulevard de la Liberté', police: true,
      intro: () => [['radio', 'Avis à la population : la police nationale ratisse Chantenay à la recherche d’' + carWanted() + '.'], ['dede', 'C’est toi qu’ils cherchent. Sème-les, puis viens au garage : une peinture neuve et ils ne te reconnaîtront plus.']],
      outro: [['dede', 'Et voilà une caisse toute neuve. Les flics peuvent toujours courir.'], ['nadia', 'Bien joué. Maintenant, les Rapaces se cachent sur les quais, du côté de la Loire. Il va pleuvoir cette nuit…']],
      setup(m) { placePlayer([140, -264], P.mairie); m.paintAt = upg().paint; locals[0].heat = 3.5; locals[0].calm = 0; for (let i = 0; i < 3; i++) spawnCop(locals[0]); m.dest = addMarker(GARAGE.x, GARAGE.z, 5, OBJ_COL); m.phase = 0; },
      update(m) {
        const L = locals[0], st = stars(L);
        if (st > 0) { objective('Pin-pon', 'Sème la police (' + '★'.repeat(st) + ') ou va directement repeindre la caisse au garage'); }
        else objective('Pin-pon', 'Les flics t’ont perdu. Passe au garage pour te faire oublier');
        objDir(GARAGE.x, GARAGE.z); objBar(null);
        return m.painted || (m.garageVisited && st === 0) ? 'win' : null;
      }, garage: true },
    { id: 'quais', title: 'Orage sur la Loire', where: 'Bords de Loire', weather: ['night', 1],
      intro: [['nadia', 'Quatre Rapaces planquent leurs caisses au bord de la Loire. De nuit, sous l’orage, ils ne t’attendent pas.'], ['nadia', 'Tu as trois minutes avant qu’ils ne déménagent. Ramasse les roquettes sur la route, ça aide.']],
      outro: [['radio', 'Nuit agitée sur les quais : quatre voitures en flammes, et l’orage qui n’arrange rien.'], ['duc', 'Tu m’as pris la place, la gare, mon lieutenant et mes quais. Monte sur la Butte, si tu oses.']],
      setup(m) {
        placePlayer([60, 280], [200, 470]); m.left = m.left0 = Math.round(180 * campDiff().time); m.kills = 0;
        const spots = [[150, 470], [240, 452], [320, 480], [300, 420]];
        m.r = spots.map(([x, z]) => { const [a, b] = roadPoint(x, z); return missionRapace(a, b, 0, { hp: 70 }); });
        const L = locals[0]; L.ammo = L.ammo || { rockets: 0, mines: 0, nitro: 0 }; L.ammo.rockets = Math.max(L.ammo.rockets, 3); L.weapon = 'rockets';
      },
      update(m, dt) {
        m.left -= dt; const alive = m.r.filter(r => r.alive);
        const near_ = alive.reduce((b, r) => !b || Math.hypot(r.x - locals[0].car.x, r.z - locals[0].car.z) < Math.hypot(b.x - locals[0].car.x, b.z - locals[0].car.z) ? r : b, null);
        objective('Orage sur la Loire', 'Rapaces restants : ' + alive.length + ' · ' + fmtClock(m.left)); objBar(m.left / m.left0);
        objDir(near_ ? near_.x : null, near_ ? near_.z : 0);
        if (!alive.length) return 'win';
        return m.left <= 0 ? 'fail' : null;
      }, fail: 'Les Rapaces ont filé avec leurs caisses' },
    { id: 'butte', title: 'La Butte', where: 'Haut de la Butte',
      intro: [['duc', 'Bienvenue chez moi. Du haut de la Butte, je vois tout Chantenay.'], ['duc', 'Ma Mercedes est blindée, mes roquettes te suivent partout. Tu vas regretter d’être revenu.'], ['nadia', 'Tout le quartier écoute la radio. Finis-le.']],
      outro: [['radio', 'C’est officiel : les Rapaces de la Butte, c’est fini ! Le Grand Duc a été vu partant à pied vers Saint-Herblain.'], ['nadia', 'Chantenay est à nous. Enfin, à tout le monde.'], ['dede', 'Passe quand tu veux au garage, petit. Le café est offert.'], ['radio', 'Et pour fêter ça, on remet le son. Chantenay FM, la radio du quartier !']],
      setup(m) {
        const b = bases()[0]; placePlayer(roadPoint(b.x - b.ux * 160, b.z - b.uz * 160), [b.x, b.z]);
        m.boss = missionRapace(...roadPoint(b.x, b.z), 0, { hp: 320, style: 'saloon', paint: 0x0d0d10, stripe: 0xd8a43c }); m.boss.boss = true; m.boss.fireCd = 4;
        for (let i = 0; i < 3; i++) { const [x, z] = roadPoint(b.x + (R() - 0.5) * 120, b.z + (R() - 0.5) * 120); missionRapace(x, z, 0, { respawn: i < 2 }); }
      },
      update(m, dt) {
        const B = m.boss, c = locals[0].car;
        if (!B.alive) return 'win';
        B.fireCd -= dt;
        const d = Math.hypot(c.x - B.x, c.z - B.z);
        if (B.fireCd <= 0 && d < 110 && c.alive) { B.fireCd = 3.2; fireRocket(B, c); flashFor(locals[0], 'Roquette !', 'Évite-la'); }
        objective('La Butte', 'Démolis le Grand Duc · ' + Math.round(B.hp / 320 * 100) + ' %'); objBar(B.hp / 320); objDir(B.x, B.z);
        return null;
      } },
  ];
  // what the police radio calls the player's car: its real model and colour (all feminine nouns)
  const PAINT_NAMES = ['violette', 'rouge', 'bleue', 'noire', 'blanche', 'verte', 'orange', 'jaune', 'turquoise', 'rose framboise'];
  const MODEL_NAMES = { saloon: 'berline', p205: '205', hatch: 'compacte', r5: 'R5', twingo: 'Twingo' };
  function carWanted() {
    const L = locals[0], p = CAR_PAINTS.indexOf(carChoice(0).paint);
    return 'une ' + (MODEL_NAMES[(L && L.car.style) || carChoice(0).style.k] || 'voiture') + ' ' + (PAINT_NAMES[p] || 'repérée dans le quartier');
  }
  function dropMineFrom(c) { if (mines.filter(m => m.owner === c).length < 6) dropMine(c); }
  const camp = () => settings.camp || (settings.camp = { done: [] });
  let cur = null;
  const launchMission = i => Busy.run('mission · ' + MISSIONS[i].title, () => startMission(i));
  function startMission(i) {
    const M = MISSIONS[i]; if (!M) return;
    if (!started || mode !== 'solo') startGame('solo');
    cleanupMission();
    mission = { ...M, idx: i, noPolice: !M.police }; cur = mission;
    setupMatch(0, 0); benchRivals();
    for (const L of locals) { L.heat = 0; L.kills = 0; L.calm = 0; L.deadT = 0; }
    for (const c of npcs.slice()) if (c.npc === 'cop') removeNpc(c); // a fresh start: no police left over from the last try
    for (const mn of mines) scene.remove(mn.m); mines.length = 0;
    if (M.weather) { mission.savedAmb = [settings.tod, settings.rain]; hd.setTod(M.weather[0]); hd.setRain(M.weather[1]); hd.amb.t = 3; hd.amb.rain = M.weather[1]; hd.amb.wet = 1; }
    M.setup(mission);
    { const L = locals[0]; mission.snap = { respect: L.respect, ammo: { ...(L.ammo || {}) }, weapon: L.weapon }; }
    flash(M.title, M.where);
    dialogue(typeof M.intro === 'function' ? M.intro() : M.intro, () => { mission.live = true; sfx.pick(); });
  }
  function cleanupMission() {
    if (!cur) return;
    clearMarkers(); clearExtras();
    if (cur.savedAmb) { settings.tod = cur.savedAmb[0]; settings.rain = cur.savedAmb[1]; applyAmbience(); }
    restoreRivals(); objEl.hidden = true; objBar(null); objDir(null);
    cur = null; mission = null;
  }
  const mEl = document.createElement('div'); mEl.id = 'mres'; mEl.hidden = true; document.body.append(mEl);
  function endMission(res) {
    const m = mission; m.live = false;
    const win = res === 'win', i = m.idx;
    if (res === 'dead' && m.snap) { const L = locals[0]; L.respect = m.snap.respect; L.ammo = { ...m.snap.ammo }; L.weapon = m.snap.weapon; } // back to how things stood at the start
    if (win) { const c = camp(); if (!c.done.includes(m.id)) c.done.push(m.id); saveSettings(); locals[0].respect += 200 + i * 50; saveBank(locals[0]); }
    const show = () => {
      blocking = true; mEl.hidden = false;
      const next = win && MISSIONS[i + 1];
      mEl.innerHTML = '<div class="card"><h2></h2><p></p><div class="menu"></div></div>';
      mEl.querySelector('h2').textContent = win ? (i === MISSIONS.length - 1 ? 'Chantenay est libre !' : 'Mission réussie') : 'Mission ratée';
      mEl.querySelector('p').textContent = win ? m.title + ' · +' + (200 + i * 50) + ' respect' : res === 'dead' ? 'Ta caisse est en morceaux. La mission reprend depuis le début.' : (m.fail || 'Ce n’est que partie remise');
      const menu = mEl.querySelector('.menu');
      const btn = (t, f, big) => { const b = document.createElement('button'); b.className = big ? 'big' : 'mbtn'; b.textContent = t; b.addEventListener('click', () => { mEl.hidden = true; blocking = false; f(); }); menu.append(b); return b; };
      const first = next ? btn('Mission suivante · ' + next.title, () => launchMission(i + 1), true) : btn(win ? 'Rouler librement' : 'Réessayer', () => win ? freeRoam() : launchMission(i), true);
      if (next || !win) btn(win ? 'Rejouer' : 'Rouler librement', () => win ? launchMission(i) : freeRoam());
      btn('Menu de la campagne', () => { cleanupMission(); toMenu(); });
      first.focus();
    };
    say(win ? 'Mission réussie !' : 'Mission ratée.', { cancel: true, pitch: 1.05 });
    if (win) dialogue(m.outro, show); else if (res === 'dead') setTimeout(show, 600); else show();
  }
  function freeRoam() { cleanupMission(); scatterRivals(); soloKind = 'free'; setupMatch(0, 0); flash('Chantenay', 'Bac à sable · roule librement'); }
  function toMenu(view) { // back to the title screen without reloading (16 nov.: also « Quitter vers le menu » of the pause)
    started = false; paused = false; fromPause = false; document.body.classList.remove('ingame', 'split'); $('title').hidden = false; renderCampaign(); showView(view || 'vCamp');
    if (typeof showroom === 'function') showroom(true);
    for (const L of locals) scene.remove(L.car.mesh); locals = [];
    for (const c of npcs.slice()) removeNpc(c); for (const p of peds) p.on = false; crowd.begin(); crowd.end(); People.hideAll(); active = false; sfx.engine(0, false); sfx.siren(0);
    // (16 nov., user) a fresh start next time: no challenge still running, no power-ups or mines lying about, no mode objects
    try { actReset(); } catch (e) { } { const t = $('ticker'); if (t) t.classList.remove('on'); } { const p = $('postcard'); if (p) p.hidden = true; } for (const mn of mines) scene.remove(mn.m); mines.length = 0; for (const pu of pus) { pu.on = false; if (pu.g) pu.g.visible = false; } try { stopMode(); } catch (e) { } SpawnMap.close();
  }
  function renderCampaign() {
    const box = $('campList'); if (!box) return; box.innerHTML = '';
    const done = camp().done;
    MISSIONS.forEach((M, i) => {
      const open = i === 0 || done.includes(MISSIONS[i - 1].id) || done.includes(M.id);
      const b = document.createElement('button'); b.className = 'mbtn campBtn';
      b.innerHTML = '<b></b><span></span>'; b.children[0].textContent = (i + 1) + '. ' + M.title + (done.includes(M.id) ? '  ✓' : '');
      b.children[1].textContent = open ? M.where : 'Verrouillée'; b.disabled = !open;
      b.addEventListener('click', () => launchMission(i));
      box.append(b);
    });
    { // difficulty switch (15 nov.)
      const d = document.createElement('button'); d.className = 'mbtn'; d.style.marginTop = '8px';
      const lab = () => { d.textContent = 'Difficulté : ' + campDiff().name + ' ◀ ▶'; }; lab();
      d.addEventListener('click', () => { settings.campDiff = ((settings.campDiff ?? 1) + 1) % 3; saveSettings(); lab(); });
      d.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { settings.campDiff = ((settings.campDiff ?? 1) + (e.key === 'ArrowLeft' ? 2 : 1)) % 3; saveSettings(); lab(); e.preventDefault(); } });
      box.prepend(d);
    }
    const prog = $('campProg'); if (prog) prog.textContent = done.length + ' / ' + MISSIONS.length + ' missions · respect en banque : ' + (settings.bank || 0);
    // (16 nov., user) the records of the races and challenges and the postcards are shown beside the map of free driving (spawnmap.js)
  }

  // =====================================================================================
  // frame hooks
  // =====================================================================================
  function tick(dt) { // every frame, even while the world waits
    if (dq) {
      dq.t += dt; const n = Math.min(dq.text.length, Math.floor(dq.t * 45));
      if (n !== dq.shown) { dq.shown = n; dlgEl.querySelector('.dlgTxt').textContent = dq.text.slice(0, n); }
      const Pd = pads.find(p => p.gp); if (Pd && Pd.press[0]) dlgAdvance(); if (Pd && Pd.press[9]) dlgSkip();
    }
    if (garageOpen) garagePad();
  }
  function gameStep(dt) { // inside the world step
    const now = performance.now();
    step(dt);
    puStep(dt, now); rocketStep(dt); mineStep(dt, now); shieldStep(dt); furnitureStep(dt); Fences.step(dt); LightPoles.step(dt); actStep(dt); discoverStep(dt); guideStep(dt); dailyStep(dt);
    for (const L of locals) {
      L.specCd = (L.specCd || 0) - dt;
      const c = L.car;
      if (c.nitro > 0) { c.nitro -= dt; if (R() < dt * 30) { const [fx, fz] = c.fwd; hd.fire(c.x - fx * 2.3, c.mesh.position.y + 0.3, c.z - fz * 2.3, -fx * 8, 0.3, -fz * 8, 0.45, 0.12, 1.4); } }
      // garage forecourt (solo and campaign)
      if (mode === 'solo' && GARAGE.pad && !garageOpen && c.alive) {
        garageCool -= dt;
        for (const G of GARAGES) { // the menu opens on the way in (drive out and back in to open it again)
          const inn = G.inside ? G.inside(c) : Math.hypot(c.x - G.x, c.z - G.z) < 6;
          if (!inn) { G.ready = true; continue; }
          if (G.ready !== false && c.speed < 7 && garageCool <= 0) { G.ready = false; curGarage = G; openGarage(L); break; }
        }
      }
    }
    for (const G of GARAGES) if (G.pad) { G.pad.ring.visible = mode === 'solo'; G.pad.ring.material.opacity = 0.5 + Math.sin(now / 250) * 0.3; }
    for (const m of markers) { m.ring.rotation.y += dt * 0.6; m.beam.material.opacity = 0.16 + Math.sin(now / 300) * 0.05; }
    hud(dt); modeStep(dt);
    if (mission && mission.live) {
      const c0 = locals[0] && locals[0].car;
      if (c0 && !c0.alive) { mission.deadFor = (mission.deadFor || 0) + dt; if (mission.deadFor > 1.6) endMission('dead'); } // wrecked: the mission starts over
      else { const r = mission.update(mission, dt); if (r) endMission(r); }
    }
  }
  let furnitureBuilt = false;
  // the weapons line of a player: what he carries, the one fired (▶), the keys on a keyboard (not on a touch screen)
  // (21 nov., audit UX) drawn icons instead of emojis (N₂O did not say « nitro », and emojis differ from one system to the next)
  const svgI = (d, extra = '') => '<svg class="wi" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' + d + '"/>' + extra + '</svg>';
  const WICON = {
    rockets: svgI('M12 1.5c3.2 2.3 5 6.4 5 10.5l-1.6 3.5H8.6L7 12c0-4.1 1.8-8.2 5-10.5zM12 7.2a2 2 0 100 4 2 2 0 000-4zM7 13.5l-3 4.5 4 .5zM17 13.5l3 4.5-4 .5zM9.6 16.5h4.8L13 22h-2z'),
    mines: svgI('M12 7a6 6 0 110 12 6 6 0 010-12z', '<path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 2.5v3M12 20.5v1.5M2.8 13h2.6M18.6 13h2.6M5.2 6.2l2 2M16.8 17.8l1.6 1.6M18.8 6.2l-2 2M7.2 17.8l-1.6 1.6"/>'),
    nitro: svgI('M10 1.5h4v3h-4zM9 5h6l1.5 3.5V20a2.5 2.5 0 01-2.5 2.5h-4A2.5 2.5 0 017.5 20V8.5zM12.8 9l-3.3 5h2.2l-.9 4.5 3.7-5.6h-2.3z'),
    shield: svgI('M12 1.8l8.2 3.1v6.2c0 5.2-3.5 9.4-8.2 11.1-4.7-1.7-8.2-5.9-8.2-11.1V4.9z'),
  };
  function ammoText(L, keys) {
    const a = L.ammo || {}, items = [['rockets', WICON.rockets, a.rockets], ['mines', WICON.mines, a.mines], ['nitro', WICON.nitro, a.nitro]].filter(x => x[2] > 0);
    const sc = schemeOf(L.ctl), key = sc && sc.sp ? keyName(sc.sp[0]) : 'B', swk = sc && sc.sw ? keyName(sc.sw[0]) : 'RB';
    const txt = items.map(([k, ic, n]) => (L.weapon === k ? '▶' : '') + ic + ' ' + n).join(' &nbsp; ') + (L.car.shield > 0 ? ' &nbsp; ' + WICON.shield + ' ' + Math.ceil(L.car.shield) : '') + (keys && items.length ? ' &nbsp; [' + key + ']' : '') + (keys && items.length > 1 ? ' [' + swk + ' ⇄]' : '');
    const cur = items.find(x => x[0] === L.weapon) || items[0];
    return { txt, items, lab: cur ? cur[1] + ' ' + cur[2] : 'SPÉ' };
  }
  function hud() {
    const el = $('ammo'); if (!el) return;
    if (locals.length > 1) { // (17 nov., user) split screen: each player's weapons under his score (before: not shown at all)
      el.hidden = true;
      for (const L of locals) { const h = L.hud; if (!h || !h.pw) continue; const touchP = L.slot === 0 && touchDev && (settings.tctl0 || 'touch') === 'touch', r = ammoText(L, !touchP);
        h.pw.hidden = !r.txt; if (h.pw.dataset.t !== r.txt) { h.pw.dataset.t = r.txt; h.pw.innerHTML = r.txt; }
        if (touchP) { const tb = $('tSpec'); if (tb && tb.dataset.t !== r.lab) { tb.dataset.t = r.lab; tb.innerHTML = r.lab; } } }
      return;
    }
    const L = locals[0]; if (!L) { el.hidden = true; return; }
    const a = L.ammo || {}, items = [['rockets', WICON.rockets, a.rockets], ['mines', WICON.mines, a.mines], ['nitro', WICON.nitro, a.nitro]].filter(x => x[2] > 0);
    el.hidden = !items.length && !(L.car.shield > 0);
    const sc = schemeOf(L.ctl), key = sc && sc.sp ? keyName(sc.sp[0]) : 'B', swk = sc && sc.sw ? keyName(sc.sw[0]) : 'RB';
    const txt = items.map(([k, ic, n]) => (L.weapon === k ? '▶' : '') + ic + ' ' + n).join(' &nbsp; ') + (L.car.shield > 0 ? ' &nbsp; ' + WICON.shield + ' ' + Math.ceil(L.car.shield) : '') + (items.length ? ' &nbsp; [' + key + ']' : '') + (items.length > 1 ? ' [' + swk + ' ⇄]' : '');
    if (isTouch) { // (17 nov., user) one pastille per weapon, touched to choose it; the chosen one lit
      const sig = items.map(([k, , n]) => k + n + (L.weapon === k ? '*' : '')).join() + '|' + (L.car.shield > 0 ? Math.ceil(L.car.shield) : '');
      if (el.dataset.sig !== sig) { el.dataset.sig = sig; el.classList.add('pills');
        el.innerHTML = items.map(([k, ic, n]) => '<button class="pill' + (L.weapon === k ? ' on' : '') + '" data-w="' + k + '" aria-label="Choisir ' + ({ rockets: 'les roquettes', mines: 'les mines', nitro: 'la nitro' })[k] + '">' + ic + ' ' + n + '</button>').join('')
          + (L.car.shield > 0 ? '<span class="pill shield">' + WICON.shield + ' ' + Math.ceil(L.car.shield) + '</span>' : ''); }
    } else { el.classList.remove('pills'); delete el.dataset.sig; if (el.dataset.t !== txt) { el.dataset.t = txt; el.innerHTML = txt; } }
    // (17 nov., user) on touch screens the special button shows the weapon it fires and what is left
    // (21 nov., audit UX) the weapon line and the special button grey out while the weapon reloads
    el.classList.toggle('cd', (L.specCd || 0) > 0); if ($('tSpec')) $('tSpec').classList.toggle('cd', (L.specCd || 0) > 0);
    const tb = $('tSpec'), cur = items.find(x => x[0] === L.weapon) || items[0], lab = cur ? cur[1] + ' ' + cur[2] : 'SPÉ';
    if (isTouch && tb && tb.dataset.t !== lab) { tb.dataset.t = lab; tb.innerHTML = lab; }
  }
  // a touch on a weapon pastille selects it (pointerdown: the HUD must not wait for a click)
  $('ammo').addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('.pill[data-w]'), L = locals[0]; if (!b || !L || !L.ammo || !(L.ammo[b.dataset.w] > 0)) return; e.preventDefault(); L.weapon = b.dataset.w; });
  gx_onGarage = () => { if (mission && mission.garage && (curGarage === GARAGE || mission.id === 'police')) { mission.garageVisited = true; mission.painted = mission.paintAt !== undefined && mission.paintAt !== upg().paint; } };
  function startHook(kind) {
    if (!furnitureBuilt) { buildFurniture(); buildGarage(); finishFurniture(); }
    start(kind);
    for (const pk of pickups) { pk.on = false; pk.mesh.visible = false; }
    if (!pus.length) for (let i = 0; i < 12; i++) pus.push(makePu(PU_KINDS[i % PU_KINDS.length]));
    for (const pu of pus) placePu(pu);
    for (const L of locals) { L.ammo = { rockets: 0, mines: 0, nitro: 1 }; L.weapon = null; }
    if (kind === 'solo') { const L = locals[0]; L.respect = settings.bank || 0; applyUpgrades(L); }
    if (mission && kind !== 'solo') cleanupMission();
    stopMode(); if (kind === 'split' && settings.gmode >= 2) setupMode(settings.gmode); else if (kind === 'online' && Net.gxm) setupMode(Net.gxm, Net.isHost ? undefined : Match.goal);
  }

