// ---------- menus ----------
let fromPause = false; // (16 nov., user) Options and Controls opened from the pause menu: « Retour » goes back to the pause
function showView(id) {
  if (fromPause && id === 'vMain') { fromPause = false; $('title').hidden = true; pauseEl.hidden = false; $('pResume').focus(); return; }
  document.querySelectorAll('#title .view').forEach(v => { v.hidden = v.id !== id; });
  const f = document.querySelector('#' + id + ' .big, #' + id + ' .mbtn, #' + id + ' input'); if (f) f.focus();
  if (id === 'vOnline') { $('nick').value = settings.nick || ''; renderGames(); }
  if (id === 'vCamp' && gx) gx.renderCampaign();
  if (id === 'vCar') renderCarView();
  if (HD) showroom(id === 'vCar');
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => showView(b.dataset.go)));
function cycleControl(container, get, set) {
  container.replaceChildren();
  const prev = document.createElement('button'); prev.className = 'mbtn'; prev.textContent = '◀'; prev.setAttribute('aria-label', 'Commande précédente');
  const out = document.createElement('output');
  const next = document.createElement('button'); next.className = 'mbtn'; next.textContent = '▶'; next.setAttribute('aria-label', 'Commande suivante');
  const show = () => { const v = get(); out.textContent = ctlName(v); out.classList.toggle('ok', padIndexOf(v) >= 0 && !!pads[padIndexOf(v)].gp); };
  const step = d => { const i = CTL_OPTIONS.indexOf(get()); set(CTL_OPTIONS[(i + d + CTL_OPTIONS.length) % CTL_OPTIONS.length]); saveSettings(); show(); };
  prev.addEventListener('click', () => step(-1)); next.addEventListener('click', () => step(1));
  container.append(prev, out, next); show();
}
// (17 nov., user) split screen on a phone or tablet: player 1 drives with the touch controls, on the bottom view
// (portrait) or the left one (landscape), and one other player with a gamepad or a keyboard
const touchDev = matchMedia('(pointer: coarse)').matches;
function renderSlots() {
  const box = $('slots'); if (!box) return;
  if (touchDev && settings.nPlayers > 2) settings.nPlayers = 2;
  document.querySelectorAll('#nSeg button').forEach(b => { b.hidden = touchDev && +b.dataset.n > 2; });
  document.querySelectorAll('#nSeg button').forEach(b => b.classList.toggle('on', +b.dataset.n === settings.nPlayers));
  box.replaceChildren();
  for (let i = 0; i < settings.nPlayers; i++) {
    const row = document.createElement('div'); row.className = 'slot';
    const chip = document.createElement('span'); chip.className = 'chipc'; chip.style.background = '#' + new THREE.Color(SLOT_PAINT[i][0]).getHexString();
    const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = 'Joueur ' + (i + 1);
    const cyc = document.createElement('div'); cyc.className = 'cycle';
    row.append(chip);
    if (!settings.teams) row.append(lab);
    else {
      const tb = document.createElement('button'); const t = settings.team[i] ? 1 : 0;
      tb.className = 'mbtn teambtn t' + t; tb.textContent = 'J' + (i + 1) + ' · ' + (t ? 'Chantenay' : 'Rapaces');
      tb.setAttribute('aria-label', 'Équipe du joueur ' + (i + 1) + ' : ' + TEAMS[t].name);
      tb.addEventListener('click', () => { settings.team[i] = t ? 0 : 1; saveSettings(); renderSlots(); box.querySelectorAll('.teambtn')[i].focus(); });
      row.append(tb);
    }
    row.append(cyc); box.append(row);
    if (touchDev && i === 0) { const o = document.createElement('output'); o.textContent = 'Écran tactile'; cyc.append(o); continue; }
    cycleControl(cyc, () => settings.ctl[i], v => { settings.ctl[i] = v; });
  }
  const gmode = HD ? (settings.gmode ?? (settings.teams ? 1 : 0)) : (settings.teams ? 1 : 0);
  document.querySelectorAll('#mSeg button').forEach(b => b.classList.toggle('on', +b.dataset.m === gmode));
  const used = new Set(settings.team.slice(0, settings.nPlayers).map(t => t ? 1 : 0));
  $('splitHint').textContent = gmode === 2 ? 'Capture du drapeau : prends le drapeau adverse et ramène-le à ta base, entre la Butte et le boulevard. 3 captures pour gagner.'
    : gmode === 3 ? 'Roi de la colline : reste seul sur la place Jean-Macé pour marquer des points. 60 points pour gagner.'
    : gmode === 4 ? 'Course de checkpoints à travers Chantenay : passe-les dans l’ordre, la circulation ne s’arrête pas pour toi.'
    : !settings.teams ? 'Chaque joueur tire sur les Rapaces… et sur les autres joueurs.'
    : used.size === 1 ? 'Tous dans la même bande : vous faites équipe avec trois voitures alliées contre les trois de l’autre bande.'
      : 'Rapaces de la Butte contre Chantenaysiens : pas de tir ami. Chaque bande a aussi trois voitures du quartier avec elle.';
  const sc = $('soloCtl'); if (sc) cycleControl(sc, () => settings.soloCtl, v => { settings.soloCtl = v; });
}
document.querySelectorAll('#nSeg button').forEach(b => b.addEventListener('click', () => { settings.nPlayers = +b.dataset.n; saveSettings(); renderSlots(); }));
document.querySelectorAll('#mSeg button').forEach(b => b.addEventListener('click', () => { settings.gmode = +b.dataset.m; settings.teams = b.dataset.m === '1' || b.dataset.m === '2'; saveSettings(); renderSlots(); renderEndSegs(); b.focus(); }));
function renderOnlineSegs() {
  document.querySelectorAll('#oSeg button').forEach(b => b.classList.toggle('on', +b.dataset.m === (HD && settings.netGmode ? settings.netGmode : settings.netTeams ? 1 : 0)));
  document.querySelectorAll('#tSeg button').forEach(b => b.classList.toggle('on', +b.dataset.t === settings.netTeam));
}
document.querySelectorAll('#oSeg button').forEach(b => b.addEventListener('click', () => { settings.netTeams = b.dataset.m === '1'; settings.netGmode = +b.dataset.m >= 3 ? +b.dataset.m : 0; saveSettings(); renderOnlineSegs(); renderEndSegs(); }));
document.querySelectorAll('#tSeg button').forEach(b => b.addEventListener('click', () => { settings.netTeam = +b.dataset.t; saveSettings(); renderOnlineSegs(); }));
renderOnlineSegs();
// (17 nov., user) the « Fin de partie » choices follow the mode picked in the same menu: KO, captures, points or laps
function segMode(b) { const v = b.closest('section'); if (!HD || !v) return 0; const k = v.id === 'vSplit' ? settings.gmode : v.id === 'vOnline' ? settings.netGmode : 0; return MODE_GOALS[k] ? k : 0; }
const KO_GOALS = [[10, '10 KO'], [20, '20 KO'], [30, '30 KO'], [0, 'Sans']];
function renderEndSegs() {
  document.querySelectorAll('.goalSeg').forEach(seg => {
    const k = segMode(seg), opts = k ? MODE_GOALS[k].opts : KO_GOALS, cur = k ? modeGoalSetting(k) : settings.goal;
    seg.querySelectorAll('button').forEach((b, i) => { const o = opts[i]; b.hidden = !o; if (!o) return; b.dataset.g = o[0]; if (b.textContent !== o[1]) b.textContent = o[1]; b.classList.toggle('on', o[0] === cur); });
  });
  document.querySelectorAll('.limitSeg button').forEach(b => b.classList.toggle('on', +b.dataset.l === settings.limit));
}
document.querySelectorAll('.goalSeg button').forEach(b => b.addEventListener('click', () => { const k = segMode(b); if (k) settings[MODE_GOALS[k].key] = +b.dataset.g; else settings.goal = +b.dataset.g; saveSettings(); renderEndSegs(); }));
document.querySelectorAll('.limitSeg button').forEach(b => b.addEventListener('click', () => { settings.limit = +b.dataset.l; saveSettings(); renderEndSegs(); }));
renderEndSegs();
function renderCtlTable() {
  const t = $('ctable'); if (!t) return;
  const cells = Object.entries(SCHEMES).map(([k, s]) => {
    const d = document.createElement('div');
    const b = document.createElement('b'); b.textContent = s.name;
    const txt = document.createElement('span');
    txt.textContent = 'Gaz ' + keyName(s.up) + ' · Frein ' + keyName(s.down) + ' · Tourner ' + keyName(s.left) + ' ' + keyName(s.right) + ' · Tir ' + s.fire.map(keyName).join('/') + ' · Frein à main ' + s.hb.map(keyName).join('/') + (HD ? ' · Arme spéciale ' + s.sp.map(keyName).join('/') + ' · Changer d’arme ' + (s.sw || []).map(keyName).join('/') : '') + ' · Caméra ' + keyName(s.cam) + ' · Remise en route ' + keyName(s.fix);
    d.append(b, txt); return d;
  });
  const p = document.createElement('div'); const pb = document.createElement('b'); pb.textContent = 'Manette';
  const pt = document.createElement('span'); pt.textContent = 'RT gaz · LT frein · stick gauche ou croix : tourner · A (et RB en classique) : tir · B : arme spéciale · RB : changer d’arme (HD) · X : frein à main · Y : caméra · LB : remise en route · Back : nuit · Start : pause. Les manettes vibrent aux chocs, tirs et explosions.';
  p.append(pb, pt); cells.push(p);
  t.replaceChildren(...cells);
}
function initOptions() {
  const vm = $('volMusic'), vf = $('volFx'), va = $('volAmb');
  vm.value = Math.round(settings.music * 100); vf.value = Math.round(settings.fx * 100); va.value = Math.round((settings.amb ?? 0.8) * 100);
  const show = () => { $('volMusicV').textContent = vm.value + ' %'; $('volFxV').textContent = vf.value + ' %'; $('volAmbV').textContent = va.value + ' %'; };
  va.addEventListener('input', () => { settings.amb = va.value / 100; sfx.setVolume('amb', settings.amb); saveSettings(); show(); });
  vm.addEventListener('input', () => { settings.music = vm.value / 100; sfx.setVolume('music', settings.music); saveSettings(); show(); });
  vf.addEventListener('input', () => { settings.fx = vf.value / 100; sfx.setVolume('fx', settings.fx); saveSettings(); show(); sfx.init(); sfx.gun(false); });
  $('optRumble').checked = settings.rumble; $('optRumble').addEventListener('change', e => { settings.rumble = e.target.checked; saveSettings(); });
  $('optIntro').checked = settings.intro !== false; $('optIntro').addEventListener('change', e => { settings.intro = e.target.checked; saveSettings(); });
  $('introPlay').addEventListener('click', () => Intro.play(true));
  $('optRetro').checked = retro; $('optRetro').addEventListener('change', () => toggleRetro());
  if (HD) {
    $('retroRow').hidden = true; $('hdRow').hidden = false;
    document.querySelectorAll('.hdOnly').forEach(r => { r.hidden = false; });
    document.querySelectorAll('#todSeg button').forEach(b => b.addEventListener('click', () => { settings.tod = b.dataset.v; saveSettings(); applyAmbience(); }));
    document.querySelectorAll('#rainSeg button').forEach(b => b.addEventListener('click', () => { settings.rain = b.dataset.v; saveSettings(); applyAmbience(); }));
    const segOpt = (id, key, after) => { const bs = document.querySelectorAll('#' + id + ' button'), show = () => bs.forEach(b => b.classList.toggle('on', +b.dataset.v === +settings[key]));
      bs.forEach(b => b.addEventListener('click', () => { settings[key] = +b.dataset.v; saveSettings(); show(); if (after) after(); })); show(); };
    segOpt('shSeg', 'shadows', applyPerf); segOpt('distSeg', 'dist', applyPerf); segOpt('trafSeg', 'traffic');
    { const bs = document.querySelectorAll('#physSeg button'), show = () => bs.forEach(b => b.classList.toggle('on', b.dataset.v === settings.physics));
      bs.forEach(b => b.addEventListener('click', () => { settings.physics = b.dataset.v; saveSettings(); show(); })); show(); }
    $('optAutoQ').checked = settings.autoQ !== false; $('optAutoQ').addEventListener('change', e => { settings.autoQ = e.target.checked; saveSettings(); });
    $('optVoices').checked = settings.voices !== false; $('optVoices').addEventListener('change', e => { settings.voices = e.target.checked; saveSettings(); try { if (!e.target.checked) speechSynthesis.cancel(); } catch (x) { } });
    const seg = document.querySelectorAll('#hdSeg button'), show = () => seg.forEach(b => b.classList.toggle('on', +b.dataset.q === hd.quality));
    seg.forEach(b => b.addEventListener('click', () => { if (hd.safe) hd.setSafe(0); settings.hdSafe = 0; hd.setQuality(+b.dataset.q); settings.hdq = hd.quality; saveSettings(); show(); }));
    show();
    document.querySelector('#title h1').insertAdjacentHTML('beforeend', ' <span style="font-family:var(--data);font-size:.3em;vertical-align:top;color:var(--sunset);text-shadow:2px 2px 0 #000">' + (ULTRA ? 'ULTRA' : 'HD') + '</span>');
  }
  show();
}
let carSlot = 0;
function renderCarView() {
  settings.cars = settings.cars || [];
  const cur = () => settings.cars[carSlot] || (settings.cars[carSlot] = { s: 'saloon', p: [0, 8, 6, 5][carSlot] });
  document.querySelectorAll('#carSlot button').forEach(b => { b.classList.toggle('on', +b.dataset.i === carSlot); b.onclick = () => { carSlot = +b.dataset.i; renderCarView(); }; });
  const st = $('carStyle'); st.innerHTML = '';
  for (const o of CAR_CHOICES) { const b = document.createElement('button'); b.className = 'mbtn' + (cur().s === o.k ? ' on' : ''); b.textContent = o.name; b.onclick = () => { cur().s = o.k; saveSettings(); renderCarView(); }; st.append(b); }
  const o = CAR_CHOICES.find(x => x.k === cur().s) || CAR_CHOICES[0];
  $('carDesc').textContent = o.d + ' · vitesse ' + Math.round(o.v * 100) + ' % · reprise ' + Math.round(o.a * 100) + ' %';
  const pt = $('carPaint'); pt.innerHTML = '';
  CAR_PAINTS.forEach(([a, b2], i) => { const b = document.createElement('button'); b.className = 'mbtn swatch' + (cur().p === i ? ' on' : ''); b.setAttribute('aria-label', 'Couleur ' + (i + 1));
    b.style.background = 'linear-gradient(135deg, #' + new THREE.Color(a).getHexString() + ' 62%, #' + new THREE.Color(b2).getHexString() + ' 62%)'; b.onclick = () => { cur().p = i; saveSettings(); renderCarView(); }; pt.append(b); });
  showroom(true);
}
// showroom: while choosing a car, the title camera circles the chosen one parked on the boulevard
let showCar = null, showKey = '';
function showroom(on) {
  if (!HD) return;
  if (!on) { if (showCar) showCar.mesh.visible = false; return; }
  const ch = carChoice(carSlot), key = ch.style.k + ch.paint[0];
  if (key !== showKey) { if (showCar) scene.remove(showCar.mesh); showCar = new Car(makeCar(ch.paint[0], ch.paint[1], true, ch.style.k), true); showKey = key; const b = bases()[1]; showCar.place(b.x, b.z, Math.atan2(-b.ux, -b.uz)); }
  showCar.mesh.visible = true;
}
// gamepad navigation in menus: D-pad / stick to move, A to choose, B back, left/right on sliders
let navCool = 0;
function menuPadNav(dt) {
  navCool -= dt;
  const P = pads.find(p => p.gp); if (!P) return;
  const sm = $('spawnMap'), visible = !$('title').hidden ? '#title .view:not([hidden])' : (!pauseEl.hidden ? '#pause' : !resEl.hidden ? '#results' : sm && !sm.hidden ? '#spawnMap' : null);
  if (!visible) return;
  const els = [...document.querySelectorAll(visible + ' button:not([disabled]), ' + visible + ' input')].filter(e => !e.hidden);
  if (!els.length) return;
  let i = els.indexOf(document.activeElement);
  const up = P.press[12] || (P.ny < -0.6 && navCool <= 0), down = P.press[13] || (P.ny > 0.6 && navCool <= 0);
  const left = P.press[14] || (P.nx < -0.6 && navCool <= 0), right = P.press[15] || (P.nx > 0.6 && navCool <= 0);
  if (up || down || left || right) navCool = 0.22;
  if (up) { i = i <= 0 ? els.length - 1 : i - 1; els[i].focus(); }
  if (down) { i = (i + 1) % els.length; els[i].focus(); }
  const a = document.activeElement;
  if ((left || right) && a && a.type === 'range') { a.value = +a.value + (right ? 5 : -5); a.dispatchEvent(new Event('input')); }
  else if ((left || right) && a && a.closest && a.closest('.cycle')) { const bs = a.closest('.cycle').querySelectorAll('button'); bs[right ? 1 : 0].click(); bs[right ? 1 : 0].focus(); }
  if (P.press[0] && a) { if (a.type === 'checkbox') { a.click(); } else a.click(); }
  if (P.press[1]) { const back = document.querySelector(visible + ' [data-go="vMain"]') || $('pResume'); if (back && !back.hidden) back.click(); }
}

// (17 nov., user) split screen needs a keyboard or gamepads: greyed out on a touch-only device until a gamepad is
// connected or a physical key is pressed (a mouse or touchpad counts as a computer)
let kbSeen = matchMedia('(any-pointer: fine)').matches;
function splitAvail() {
  if (!isTouch || kbSeen) return true;
  try { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); } catch (e) { return false; }
}
function renderSplitBtn() {
  const b = document.querySelector('#vMain [data-go="vSplit"]'); if (!b) return;
  const ok = splitAvail(), lab = ok ? 'Écran partagé · 2 à 4' : 'Écran partagé · manette ou clavier';
  b.disabled = !ok; if (b.textContent !== lab) b.textContent = lab;
  b.title = ok ? '' : 'Branche une manette ou un clavier pour jouer à plusieurs sur le même écran';
}
addEventListener('gamepadconnected', renderSplitBtn); addEventListener('gamepaddisconnected', renderSplitBtn);
addEventListener('keydown', e => { if (kbSeen || !e.isTrusted || e.key === 'Unidentified' || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return; kbSeen = true; renderSplitBtn(); });
renderSplitBtn();
