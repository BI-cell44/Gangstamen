// ---------- game start ----------
function startGame(kind) {
  Intro.stop();
  sfx.init();
  if (HD) showroom(false);
  mode = kind;
  for (const L of locals) scene.remove(L.car.mesh);
  locals = [];
  if (kind === 'split') teamMode = !!settings.teams;
  else if (kind === 'solo') teamMode = false;
  if (kind !== 'online') setupMatch(settings.goal, settings.limit);
  document.body.classList.toggle('teams', teamMode);
  setBotTeams();
  if (kind === 'split') {
    for (let i = 0; i < settings.nPlayers; i++) { const t = teamMode ? settings.team[i] : -1; locals.push(makeLocal(i, settings.ctl[i], playerPaint(i, t, false), t)); }
  } else {
    const t = kind === 'online' && teamMode ? Net.team : -1;
    locals.push(makeLocal(0, settings.soloCtl, playerPaint(0, t, kind === 'online'), t));
  }
  for (const L of locals) if (L.team >= 0) L.colour = TEAMS[L.team].css;
  if (teamMode) for (const r of rivals) if (!r.proxy) spawnRival(r);
  updateTeamBar(); $('killsLab').textContent = teamMode ? 'KO' : 'RAPACES';
  player = locals[0].car;
  applyPerf();
  if (!HD) setNight(night);
  buildPlayerHuds(); layoutViews();
  $('title').hidden = true; started = true; paused = false; document.body.classList.add('ingame');
  for (const L of locals) { L.cam.position.set(L.car.x, 20, L.car.z + 30); }
  if (teamMode) for (const L of locals) { if (locals.length > 1) flashFor(L, TEAMS[L.team].short, baseName(L.team)); else flash(TEAMS[L.team].name, 'Base : ' + baseName(L.team) + ' · pas de tir ami'); }
  else if (kind === 'online') flash('Partie ' + Net.code.toUpperCase(), Net.isHost ? 'Code à donner aux amis · vous êtes l’hôte' : 'Bienvenue à Chantenay');
  else flashAll('Gangstamen', locals.length > 1 ? 'Chacun pour soi · les Rapaces rôdent' : 'Boulevard de la Liberté · les Rapaces rôdent');
  if (gx) gx.start(kind);
  try { renderer.domElement.focus(); } catch (e) { }
}

