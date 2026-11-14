// ---------- boot ----------
buildCity();
buildGround();
try { buildEdges(); buildTrams(); } catch (e) { console.warn('edges', e); }
buildMinimap();
setupWorldActors();
if (HD) hd.world();
if (gx) gx.world();
if (HD) applyAmbience(); else setNight(false);
renderSlots(); renderCtlTable(); initOptions();
requestAnimationFrame(frame);
const startBtn = $('start');
startBtn.disabled = false; startBtn.textContent = 'Solo · prendre le volant';
startBtn.focus();
startBtn.addEventListener('click', () => startGame('solo'));
$('splitGo').addEventListener('click', () => startGame('split'));
$('create').addEventListener('click', () => startOnline(null, true));
netInit();
if (settings.intro !== false && !window.__noIntro) Intro.splash();
window.__gm = { get paused() { return paused; }, get started() { return started; }, renderer, scene, camera, PerfHud, Intro, hd, gx, settings, trams, edges, tramS, tramWall, EDGE, cellOf, collideWalls, muzzleOf, shoot, damage, applyHit, locals: () => locals, rivals: () => rivals, Net, Match, step: s => step(s, performance.now()), start: k => startGame(k || 'solo'), codes };
})();
</script>
