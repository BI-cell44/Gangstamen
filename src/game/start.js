// ---------- game start ----------
// (16 nov., user request) two solo modes: « Chasse aux Rapaces » (the match, KO and time limit, no races or challenges)
// and « Conduite libre » (no clock, no score, races, challenges and missions on the map, start point chosen on a map)
let soloKind = 'hunt';
function startGame(kind, sub) {
  soloKind = kind === 'solo' && sub === 'free' ? 'free' : 'hunt';
  Intro.stop();
  sfx.init();
  if (HD) showroom(false);
  mode = kind;
  for (const L of locals) scene.remove(L.car.mesh);
  locals = [];
  if (kind === 'split') teamMode = !!settings.teams;
  else if (kind === 'solo') teamMode = false;
  if (kind !== 'online') { if (soloKind === 'free') setupMatch(0, 0); else setupMatch(settings.goal, settings.limit); }
  document.body.classList.toggle('teams', teamMode);
  // (19 nov., user) where the game is played: the menu's places (split screen, online host), the host's for a guest
  if (kind === 'split' || (kind === 'online' && Net.isHost)) choosePlaces(); else if (kind === 'online') choosePlaces(Net.places || [-1, 0, 3, 1]); else gamePlaces = null;
  setBotTeams();
  if (kind === 'split') {
    for (let i = 0; i < settings.nPlayers; i++) { const t = teamMode ? settings.team[i] : -1; locals.push(makeLocal(i, settings.ctl[i], playerPaint(i, t, false), t)); }
  } else {
    const t = kind === 'online' && teamMode ? Net.team : -1;
    locals.push(makeLocal(0, settings.soloCtl, playerPaint(0, t, kind === 'online'), t));
  }
  for (const L of locals) if (L.team >= 0) L.colour = TEAMS[L.team].css;
  if (teamMode) { for (const r of rivals) if (!r.proxy) spawnRival(r); }
  else if (kind !== 'online' || Net.isHost) scatterRivals();
  updateTeamBar(); $('killsLab').textContent = teamMode ? 'KO' : 'RAPACES';
  player = locals[0].car;
  applyPerf();
  if (!HD) setNight(night);
  buildPlayerHuds(); layoutViews();
  $('title').hidden = true; started = true; paused = false; document.body.classList.add('ingame');
  for (const L of locals) { const [fx, fz] = L.car.fwd; L.cam.position.set(L.car.x - fx * 9, surfaceH(L.car.x, L.car.z) + 70, L.car.z - fz * 9); } // (16 nov., user) down from the sky straight over the car: before, it came in from 30 m away through the buildings
  if (teamMode) for (const L of locals) { if (locals.length > 1) flashFor(L, TEAMS[L.team].short, baseName(L.team)); else flash(TEAMS[L.team].name, 'Base : ' + baseName(L.team) + ' · pas de tir ami'); }
  else if (kind === 'online') flash('Partie ' + Net.code.toUpperCase(), Net.isHost ? 'Code à donner aux amis · vous êtes l’hôte' : 'Bienvenue à Chantenay');
  else if (soloKind === 'free') flashAll('Conduite libre', 'Pas de chrono · courses, défis et missions sur la carte · ' + (isTouch ? 'touche la minicarte : carte' : 'G : carte'));
  else flashAll('Chasse aux Rapaces', locals.length > 1 ? 'Chacun pour soi · les Rapaces rôdent' : 'Boulevard de la Liberté · les Rapaces rôdent');
  if (gx) gx.start(kind);
  if (gx && gx.SpawnMap && soloKind === 'free') gx.SpawnMap.show();
  try { renderer.domElement.focus(); } catch (e) { }
}

