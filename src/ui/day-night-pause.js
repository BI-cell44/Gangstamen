// ---------- day / night / pixels / pause ----------
function setNight(on) {
  night = on;
  if (HD) return hd.setTime(on);
  scene.background = on ? SKY.night : SKY.day;
  scene.fog = new THREE.Fog(on ? 0x140c24 : 0xc96a74, on ? 50 : 140, on ? 430 : 720);
  hemi.intensity = on ? 0.2 : 0.62; hemi.color.set(on ? 0x8090ff : 0xffd2a8);
  sun.intensity = on ? 0.18 : 1.05; sun.color.set(on ? 0x6a78c0 : 0xffae66);
  wallMats.forEach(m => { m.emissiveIntensity = on ? 1 : 0; });
  for (const c of allPlayerCars()) { if (c.mesh.userData.spot) c.mesh.userData.spot.intensity = on ? 2.4 : 0; c.mesh.userData.head.emissive.setHex(on ? 0xfff2c0 : 0x8a8060); }
}
// performance: shadows and view distance (lower automatically with 3-4 screens)
function applyPerf() {
  const n = Math.max(1, locals.length);
  sun.castShadow = HD ? (settings.shadows === 2 || (settings.shadows === 1 && n === 1)) : n === 1;
  if (!HD) return;
  const k = [0.5, 0.75, 1][settings.dist ?? 2] * (n >= 3 ? 0.7 : n === 2 ? 0.85 : 1);
  hd.setDistance(k);
  for (const L of locals) { L.cam.far = 2200 * k; L.cam.updateProjectionMatrix(); }
}
// HD: time of day and weather, kept in the settings; N and B cycle them in game
const TOD_NAMES = { day: 'Plein jour', sunset: 'Coucher de soleil', night: 'Nuit', cycle: 'Cycle jour/nuit' };
const RAIN_NAMES = { '0': 'Temps sec', '0.6': 'Pluie', '1': 'Orage', auto: 'Météo variable' };
function applyAmbience() { if (!HD) return; hd.setTod(settings.tod); hd.setRain(settings.rain === 'auto' ? 'auto' : +settings.rain); night = settings.tod === 'night'; showAmbienceSegs(); }
function showAmbienceSegs() {
  document.querySelectorAll('#todSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === settings.tod));
  document.querySelectorAll('#rainSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === String(settings.rain)));
}
function cycleTod() { const o = ['day', 'sunset', 'night', 'cycle']; settings.tod = o[(o.indexOf(settings.tod) + 1) % o.length]; saveSettings(); applyAmbience(); flashAll(TOD_NAMES[settings.tod], 'N : changer le moment'); }
function cycleRain() { const o = ['0', '0.6', '1', 'auto']; settings.rain = o[(o.indexOf(String(settings.rain)) + 1) % o.length]; saveSettings(); applyAmbience(); flashAll(RAIN_NAMES[settings.rain], 'B : changer la météo'); }
function toggleRetro() {
  if (HD) return;
  retro = !retro; settings.retro = retro; saveSettings();
  setRatio(); renderer.setSize(innerWidth, innerHeight); view.classList.toggle('retro', retro); $('scan').classList.toggle('off', !retro);
  const o = $('optRetro'); if (o) o.checked = retro;
}
const pauseEl = document.createElement('div');
pauseEl.id = 'pause'; pauseEl.hidden = true;
// (20 nov., user) in landscape on a phone the card is taller than the screen: the overlay scrolls (a finger can drag it,
// the page refuses touch gestures elsewhere), the card centred when it fits and starting from the top when it does not
pauseEl.style.cssText = 'position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;padding:max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));background:rgba(13,10,20,.75)';
pauseEl.innerHTML = '<div class="card" style="display:flex;flex-direction:column;gap:12px;align-items:flex-start;margin:auto;flex-shrink:0"><h2 style="margin:0;font-family:var(--display);font-weight:normal;font-size:40px;color:var(--chalk);text-shadow:3px 3px 0 var(--magenta)">Pause</h2><button class="big" id="pResume">Reprendre</button><button class="mbtn" id="pMap" hidden>' + (isTouch ? 'Carte · démarrer ailleurs' : 'Carte · démarrer ailleurs (G)') + '</button><button class="mbtn" id="pFull">' + (isTouch ? 'Plein écran' : 'Plein écran (F)') + '</button><button class="mbtn" id="pPhoto">' + (isTouch ? 'Mode photo' : 'Mode photo (F2)') + '</button>'
  // (17 nov., user) the moment of the day and the weather straight from the pause (HD), as in the options
  + (HD ? '<div class="pAmb"><span class="lab">Moment</span><div class="seg pTod"><button class="mbtn" data-v="day">Jour</button><button class="mbtn" data-v="sunset">Coucher</button><button class="mbtn" data-v="night">Nuit</button><button class="mbtn" data-v="cycle">Cycle</button></div></div>'
  + '<div class="pAmb"><span class="lab">Météo</span><div class="seg pRain"><button class="mbtn" data-v="0">Sec</button><button class="mbtn" data-v="0.6">Pluie</button><button class="mbtn" data-v="1">Orage</button><button class="mbtn" data-v="auto">Variable</button></div></div>' : '') + '<button class="mbtn" id="pOpt">Son et options</button><button class="mbtn" id="pCtrl">Commandes</button><button class="mbtn" id="pQuit">Quitter vers le menu</button></div>';
document.body.append(pauseEl);
function renderPauseAmb() {
  pauseEl.querySelectorAll('.pTod button').forEach(b => b.classList.toggle('on', b.dataset.v === settings.tod));
  pauseEl.querySelectorAll('.pRain button').forEach(b => b.classList.toggle('on', b.dataset.v === String(settings.rain)));
}
pauseEl.querySelectorAll('.pTod button').forEach(b => b.addEventListener('click', () => { settings.tod = b.dataset.v; saveSettings(); applyAmbience(); renderPauseAmb(); }));
pauseEl.querySelectorAll('.pRain button').forEach(b => b.addEventListener('click', () => { settings.rain = b.dataset.v; saveSettings(); applyAmbience(); renderPauseAmb(); }));
function togglePause() {
  if (!started || Match.over) return;
  if (mode === 'online') { // the world keeps running online: the menu only overlays
    paused = !paused; pauseEl.hidden = !paused; if (paused) $('pResume').focus(); renderPauseAmb(); return;
  }
  paused = !paused; pauseEl.hidden = !paused; if (paused) $('pResume').focus();
  renderPauseAmb();
  $('pMap').hidden = !(gx && gx.SpawnMap && mode === 'solo' && soloKind === 'free');
}
$('pMap').addEventListener('click', () => { paused = false; pauseEl.hidden = true; if (gx && gx.SpawnMap) gx.SpawnMap.show(); });
$('pResume').addEventListener('click', () => { paused = false; pauseEl.hidden = true; });
$('pPhoto').addEventListener('click', () => PhotoMode.toggle(true));
for (const [b, v] of [['pOpt', 'vOpt'], ['pCtrl', 'vCtrl']]) $(b).addEventListener('click', () => { pauseEl.hidden = true; $('title').hidden = false; showView(v); fromPause = true; });
// (16 nov., user) everything is loaded already: back to the menu in place, without the loading screen; online still reloads (network state)
$('pQuit').addEventListener('click', () => { if (mode !== 'online' && gx && gx.toMenu) { pauseEl.hidden = true; PhotoMode.toggle && PhotoMode.toggle(false); try { gx.cleanupMission(); } catch (e) { } gx.toMenu('vMain'); const b = HD && $('startFree') && !$('startFree').hidden ? $('startFree') : $('start'); if (b) b.focus(); return; } try { if (Net.room) Net.room.leave(); } catch (e) { } location.reload(); });

