// ---------- boot ----------
// The steps hand control back to the browser between them, so the start button can show where the loading is
// (the facade textures are made before this point, while the code itself loads: 1 to 2 s since cycle 3).
BOOT.mark('reste du code');
const startBtn = $('start');
const BOOT_STEPS = [
  ['bâtiments', () => buildCity()],
  ['sol, routes et arbres', () => buildGround()],
  ['bords de carte et tram', () => { buildEdges(); buildTrams(); }],
  ['minicarte', () => buildMinimap()],
  ['voitures', () => setupWorldActors()],
  ['lampadaires', () => { if (HD) hd.world(); }],
  ['lieux, mobilier et garages', () => { if (gx) gx.world(); }],
  ['découpage en tuiles', () => Tiles.run()],
  ['ambiance et menus', () => { if (HD) applyAmbience(); else setNight(false); renderSlots(); renderCtlTable(); initOptions(); }],
  ['préparation des shaders', () => { try { renderer.compile(scene, camera); } catch (e) { } }], // compiled now rather than at the first image
  ['envoi des textures', () => { const seen = new Set(); scene.traverse(o => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'alphaMap']) { const t = m[k]; if (t && !seen.has(t)) { seen.add(t); try { renderer.initTexture(t); } catch (e) { } } } }); }],
  ['première image', () => { // shadow maps, post-processing: the long first image happens here, behind the progress bar
    try { render(1 / 60); const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); } catch (e) { console.warn('first render', e); } // WebGL is asynchronous: reading a pixel waits for the work (shader linking) to finish
  }],
];
const paintNow = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; setTimeout(r, 0); } }; requestAnimationFrame(go); setTimeout(go, 60); }); // a hidden tab gets no animation frames
(async () => {
  const held = [...document.querySelectorAll('#title button, #title input, #title select')].filter(b => !b.disabled && b !== startBtn); // nothing to click before the world exists
  held.forEach(b => { b.disabled = true; });
  for (let i = 0; i < BOOT_STEPS.length; i++) {
    const [label, fn] = BOOT_STEPS[i];
    startBtn.textContent = 'Chargement ' + Math.round(i / BOOT_STEPS.length * 100) + ' % · ' + label + '…';
    Intro.progress(i / BOOT_STEPS.length, label);
    await paintNow();
    try { fn(); } catch (e) { console.warn(label, e); }
    BOOT.mark(label);
  }
  requestAnimationFrame(t => { BOOT.mark('attente de la première image'); requestAnimationFrame(() => { BOOT.mark('première image'); BOOT.total = Math.round(performance.now() - BOOT.t0); }); });
  requestAnimationFrame(frame);
  held.forEach(b => { b.disabled = false; });
  startBtn.disabled = false; startBtn.textContent = HD ? 'Chasse aux Rapaces' : 'Prendre le volant';
  if (HD) startBtn.className = 'mbtn'; // (17 nov., user) beside « Campagne »: « Conduite libre » is the big button in HD
  { const f = $('startFree'); if (HD && f) { startBtn.className = 'mbtn'; f.focus(); } else startBtn.focus(); } // (16 nov., user) free driving first in the menu
  // (16 nov., user) HD: « Chasse aux Rapaces » opens its own page (how it plays, KO and time), no longer set in the options
  if (HD) { startBtn.addEventListener('click', () => showView('vHunt')); $('huntGo').addEventListener('click', () => Busy.run('Chasse aux Rapaces', () => startGame('solo'))); document.querySelectorAll('#vOpt .soloEnd').forEach(r => { r.hidden = true; }); }
  else startBtn.addEventListener('click', () => Busy.run('partie solo', () => startGame('solo')));
  { const f = $('startFree'); if (f) f.addEventListener('click', () => Busy.run('Conduite libre', () => startGame('solo', 'free'))); }
  $('splitGo').addEventListener('click', () => Busy.run('écran partagé', () => startGame('split')));
  $('create').addEventListener('click', () => startOnline(null, true));
  netInit();
  Intro.loaded(settings.intro !== false && !window.__noIntro); // loading screen → « appuie sur une touche » → cinematic → menu; the menu is never seen half-built
})();
window.__gm = { get paused() { return paused; }, roadEdge, segHit, get started() { return started; }, renderer, scene, camera, PerfHud, Tiles, W, BOOT, planarReal, planarArcade, VEHICLES, engineState, Soundscape, sfx, PhotoMode, updateCamera, CAM_MODES, G, nodeOk, groundH, Profile, makeCar, saveSettingsHook: () => saveSettings(), surfaceH, Intro, hd, gx, settings, trams, edges, tramS, tramWall, EDGE, cellOf, collideWalls, muzzleOf, shoot, damage, applyHit, locals: () => locals, rivals: () => rivals, Net, Match, step: s => step(s, performance.now()), start: (k, sub) => startGame(k || 'solo', sub), codes };
})();
</script>
