// ---------- input: keyboards (physical keys), gamepads, touch ----------
const SCHEMES = {
  kb1: { name: 'Clavier 1', up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: ['Space'], hb: ['ShiftLeft'], cam: 'KeyC', back: 'KeyX', fix: 'KeyR', sp: ['KeyE'], sw: ['KeyQ'] },
  kb2: { name: 'Clavier 2', up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: ['ControlRight', 'Enter'], hb: ['ShiftRight'], cam: 'End', back: 'PageUp', fix: 'PageDown', sp: ['Delete', 'Slash'], sw: ['Home', 'Period'] },
  kb3: { name: 'Clavier 3', up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', fire: ['KeyU'], hb: ['KeyO'], cam: 'Digit9', back: 'KeyH', fix: 'Digit8', sp: ['Digit7'], sw: ['KeyY'] },
  kb4: { name: 'Clavier 4', up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', fire: ['Numpad0'], hb: ['NumpadDecimal'], cam: 'NumpadAdd', back: 'Numpad7', fix: 'NumpadSubtract', sp: ['NumpadEnter'], sw: ['Numpad9'] },
};
const CTL_OPTIONS = ['kb1+pad0', 'kb1', 'kb2', 'kb3', 'kb4', 'pad0', 'pad1', 'pad2', 'pad3'];
let layoutMap = null;
try { navigator.keyboard && navigator.keyboard.getLayoutMap && navigator.keyboard.getLayoutMap().then(m => { layoutMap = m; renderCtlTable(); }).catch(() => { }); } catch (e) { }
const KEY_NAMES = { Space: 'Espace', ShiftLeft: 'Maj g.', ShiftRight: 'Maj d.', ControlRight: 'Ctrl d.', Enter: 'Entrée', End: 'Fin', PageDown: 'Pg suiv.',
  Delete: 'Suppr', Slash: ':', NumpadEnter: 'Entrée num.', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', NumpadDecimal: 'Num .', NumpadAdd: 'Num +', NumpadSubtract: 'Num −' };
function keyName(code) {
  if (layoutMap && layoutMap.get(code)) return layoutMap.get(code).toUpperCase();
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
function ctlName(o) {
  if (o === 'kb1+pad0') return 'Clavier 1 + manette 1';
  if (o.startsWith('pad')) { const i = +o[3]; return 'Manette ' + (i + 1) + (pads[i].gp ? ' ✓' : ''); }
  const s = SCHEMES[o];
  if (o === 'kb4') return s.name + ' · pavé num.';
  return s.name + ' · ' + [s.up, s.left, s.down, s.right].map(keyName).join(o === 'kb2' ? '' : '');
}
const codes = {};
const touch = { l: 0, r: 0, g: 0, b: 0, f: 0 };
addEventListener('keydown', e => {
  codes[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) && !(e.target && e.target.tagName === 'INPUT' && e.target.type === 'text')) e.preventDefault();
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  if (e.code === 'KeyF' && !e.repeat) toggleFullscreen(); // F: full screen, also on the menus
  if (!started) return;
  // (17 nov., user) Échap in Options or Controls opened from the pause: back to the pause (before, it unpaused under the menu
  // and « Quitter vers le menu » then took two clicks)
  if (e.code === 'Escape') { if (fromPause && !$('title').hidden) showView('vMain'); else togglePause(); }
  if (paused) return;
  if (e.code === 'KeyN') { if (HD) cycleTod(); else setNight(!night); }
  if (e.code === 'KeyB' && HD && !e.repeat) cycleRain();
  if (e.code === 'Semicolon' || (e.key && e.key.toLowerCase() === 'm' && !e.repeat)) radioNext('M');
  if (e.key && e.key.toLowerCase() === 'p' && !e.repeat) toggleRetro();
  if (e.code === 'KeyG' && !e.repeat && gx && gx.SpawnMap && mode === 'solo' && soloKind === 'free' && !gx.blocking) gx.SpawnMap.show(); // (16 nov.) free driving: the start map
  if (e.code === 'Tab') $('board').hidden = false;
  if (gx && !e.repeat && /^Digit[1-6]$/.test(e.code) && (mode === 'online' || locals.length > 1)) gx.quickChat(locals.find(L => schemeOf(L.ctl) && schemeOf(L.ctl).name === 'Clavier 1') || locals[0], +e.code[5] - 1);
  for (const L of locals) {
    const s = schemeOf(L.ctl); if (!s) continue;
    if (e.code === s.cam && !e.repeat) nextCamMode(L);
    if (e.code === s.fix && !e.repeat && L.car.alive) unstick(L);
  }
});
addEventListener('keyup', e => { codes[e.code] = false; if (e.code === 'Tab') $('board').hidden = true; });
addEventListener('blur', () => { for (const k in codes) codes[k] = false; });
function schemeOf(ctl) { const k = ctl.split('+')[0]; return SCHEMES[k] || null; }
const bindTouch = (id, f) => {
  const el = $(id);
  const on = e => { e.preventDefault(); touch[f] = 1; el.classList.add('on'); };
  const off = e => { e.preventDefault(); touch[f] = 0; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
};
// next radio station (M key, ♪ touch button); after the last one the radio goes off
function radioNext(key) {
  if (HD) { const st = sfx.nextStation(); flashAll(st ? st.name : 'Radio OFF', st ? st.style + ' · ' + key + ' : station suivante' : key + ' : rallumer'); if (st && gx) gx.dj('station', st); }
  else { const on = sfx.toggle(); flashAll(on ? 'Radio ON' : 'Radio OFF', on ? 'Chantenay FM 92.4' : ''); }
}
// (17 nov., user) the radio on touch screens: a tap on ♪
// (17 nov., user) full screen, PC and phone: the ⛶ button, « Plein écran » in the pause, the F key; hidden where the
// browser has no full screen (iPhone) — inside the claude.ai page the frame may also refuse it: a message says so
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  try { const p = req.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => flash('Plein écran refusé', 'Le navigateur ou la page qui contient le jeu ne le permet pas')); }
  catch (e) { flash('Plein écran refusé', 'Le navigateur ou la page qui contient le jeu ne le permet pas'); }
}
if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) document.body.classList.add('fsNo');
$('fsBtn').addEventListener('click', e => { e.preventDefault(); toggleFullscreen(); });
document.addEventListener('click', e => { if (e.target && e.target.id === 'pFull') toggleFullscreen(); }); // the pause card is built later
const fsLabel = () => { const on = !!(document.fullscreenElement || document.webkitFullscreenElement); $('fsBtn').setAttribute('aria-label', on ? 'Quitter le plein écran (F)' : 'Plein écran (F)'); $('fsBtn').title = on ? 'Quitter le plein écran (F)' : 'Plein écran (F)'; if ($('pFull')) $('pFull').textContent = on ? 'Quitter le plein écran (F)' : 'Plein écran (F)'; };
document.addEventListener('fullscreenchange', fsLabel); document.addEventListener('webkitfullscreenchange', fsLabel);
$('tPause').addEventListener('click', e => { e.preventDefault(); if (started && !paused && !(gx && gx.blocking)) togglePause(); });
$('minimap').addEventListener('click', () => {
  if (!started || paused || (gx && gx.blocking)) return;
  if (gx && gx.SpawnMap && mode === 'solo' && soloKind === 'free') gx.SpawnMap.show(); else togglePause();
});
$('tRadio').addEventListener('pointerdown', e => { e.preventDefault(); if (started && !paused) radioNext('♪'); });
bindTouch('tLeft', 'l'); bindTouch('tRight', 'r'); bindTouch('tGas', 'g'); bindTouch('tBrake', 'b'); bindTouch('tFire', 'f');
if (HD) { // virtual joystick: left/right steer, up accelerates, down brakes; extra buttons for the handbrake and the special weapon
  bindTouch('tSpec', 'sp'); bindTouch('tHb', 'hb'); $('tSpec').hidden = $('tHb').hidden = false; $('joy').hidden = false; document.body.classList.add('joy');
  const J = $('joy'), K = $('joyKnob'); let id = null;
  const move = e => { const r = J.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - r.left - R, dy = e.clientY - r.top - R; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    K.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; touch.jx = dx / R; touch.jy = dy / R; };
  J.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; J.setPointerCapture(id); move(e); });
  J.addEventListener('pointermove', e => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
  const up = e => { if (e.pointerId !== id) return; id = null; touch.jx = touch.jy = 0; K.style.transform = ''; };
  J.addEventListener('pointerup', up); J.addEventListener('pointercancel', up);
}

// Gamepads (standard mapping: Xbox / PlayStation / most USB pads)
// RT gas · LT brake/reverse · left stick or D-pad steer · A or RB fire · X handbrake · Y camera · LB back on the road · Back night · Start pause
const pads = [0, 1, 2, 3].map(() => ({ gp: null, prev: [], press: [], t: 0, s: 0, hb: false, fire: false, ny: 0, nx: 0 }));
function pollPads() {
  let list = [];
  try { list = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { }
  for (let i = 0; i < 4; i++) {
    const P = pads[i], gp = list[i] && list[i].connected ? list[i] : null;
    P.gp = gp; P.press = [];
    if (!gp) { P.t = P.s = 0; P.hb = P.fire = false; P.prev = []; continue; }
    const b = k => gp.buttons[k] ? (gp.buttons[k].value || (gp.buttons[k].pressed ? 1 : 0)) : 0;
    const cur = gp.buttons.map((x, k) => b(k) > 0.5);
    P.press = cur.map((c, k) => c && !P.prev[k]);
    const dz = v => Math.abs(v) < 0.14 ? 0 : (v - Math.sign(v) * 0.14) / 0.86;
    P.nx = dz(gp.axes[0] || 0); P.ny = dz(gp.axes[1] || 0);
    P.s = Math.max(-1, Math.min(1, -P.nx + b(14) - b(15)));
    P.t = b(7) - b(6);
    P.hb = b(2) > 0.5; P.fire = b(0) > 0.5 || (!HD && b(5) > 0.5); // HD: RB switches the special weapon
    P.prev = cur;
  }
}
function rumbleFor(L, strong, weak, ms) {
  if (!settings.rumble || !L) return;
  const idx = padIndexOf(L.ctl); if (idx < 0) return;
  try { const a = pads[idx].gp && pads[idx].gp.vibrationActuator; if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => { }); } catch (e) { }
}
function padIndexOf(ctl) { const m = /pad(\d)/.exec(ctl); return m ? +m[1] : -1; }
addEventListener('gamepadconnected', e => { renderSlots(); renderCtlTable(); if (started) flashAll('Manette ' + (e.gamepad.index + 1) + ' connectée', ''); });
addEventListener('gamepaddisconnected', e => { renderSlots(); if (started) flashAll('Manette ' + (e.gamepad.index + 1) + ' déconnectée', ''); });

function readInput(L) {
  const tOnly = L.slot === 0 && mode === 'split' && touchDev; // touch split screen: player 1 has only the touch controls
  const ctl = L.ctl, s = tOnly ? null : schemeOf(ctl), idx = tOnly ? -1 : padIndexOf(ctl);
  let t = 0, st = 0, hb = false, fire = false, special = false, swap = false, back = false;
  if (s) {
    special = (s.sp || []).some(c => codes[c]); swap = (s.sw || []).some(c => codes[c]);
    t = (codes[s.up] ? 1 : 0) - (codes[s.down] ? 1 : 0);
    st = (codes[s.left] ? 1 : 0) - (codes[s.right] ? 1 : 0);
    hb = s.hb.some(c => codes[c]); fire = s.fire.some(c => codes[c]); back = !!(s.back && codes[s.back]);
  }
  if (L.slot === 0) { // touch controls drive player 1
    if (touch.g || touch.b) t = (touch.g ? 1 : 0) - (touch.b ? 1 : 0);
    if (touch.l || touch.r) st = (touch.l ? 1 : 0) - (touch.r ? 1 : 0);
    fire = fire || !!touch.f; special = special || !!touch.sp; hb = hb || !!touch.hb;
    if (touch.jx || touch.jy) { // joystick: dead zone, then progressive
      const dz = v => Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85;
      st = -dz(touch.jx); const y = dz(touch.jy); t = y < 0 ? Math.min(1, -y * 1.3) : y > 0.25 ? -1 : 0;
    }
  }
  if (idx >= 0 && pads[idx].gp) {
    const P = pads[idx];
    t = t || P.t; st = st || P.s; hb = hb || P.hb; fire = fire || P.fire; special = special || !!(P.gp && P.gp.buttons[1] && P.gp.buttons[1].pressed);
    if (P.press[3]) nextCamMode(L);
    if (P.gp.axes && P.gp.axes[3] > 0.7) back = true; // right stick down: look back
    if (HD && P.press[5]) swap = true;
    if (P.press[4] && L.car.alive) unstick(L);
    if (P.press[8]) { if (HD) cycleTod(); else setNight(!night); }
    if (gx && (mode === 'online' || locals.length > 1)) { if (P.press[12]) gx.quickChat(L, 0); if (P.press[13]) gx.quickChat(L, 2); if (P.press[10]) gx.quickChat(L, 1); if (P.press[11]) gx.quickChat(L, 3); }
    if (P.press[9]) togglePause();
  }
  if (L.slot === 0 && touch.sw) { swap = true; touch.sw = false; }
  L.lookBack = back;
  return { t, s: st, hb, fire, special, swap };
}

