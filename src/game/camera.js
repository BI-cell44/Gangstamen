// ---------- cameras (cycle 6): chase on a spring, hood, bumper, sky view, TV-style cinema, look back, photo mode ----------
// Each local player has L.camMode (C key, Y on a pad cycles it) and their own spring state on L.
const CAM_MODES = ['Poursuite', 'Poursuite lointaine', 'Capot', 'Pare-chocs', 'Vue du ciel', 'Cinéma'];
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function nextCamMode(L) {
  L.camMode = (L.camMode + 1) % CAM_MODES.length; L.camCut = true;
  const s = schemeOf(L.ctl), kn = c => (c || '').replace(/^Key|^Digit/, '');
  flashFor(L, 'Caméra : ' + CAM_MODES[L.camMode], s ? kn(s.cam) + ' : caméra suivante · ' + kn(s.back) + ' maintenu : regarder derrière' : 'Y : caméra suivante · stick droit en bas : regarder derrière');
}
// free distance behind the car: three rays (centre and both rear corners), so the camera does not slip past a wall corner
function freeBehind(c, bx, bz, want) {
  const rx = -bz, rz = bx; let d = want + 1;
  for (const o of [0, 0.7, -0.7]) d = Math.min(d, segHit(c.x + rx * o, c.z + rz * o, bx, bz, want + 1));
  return d - 1;
}
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function updateCamera(L, dt) {
  const c = L.car, cam = L.cam, gp = surfaceH(c.x, c.z), sp = c.speed || 0;
  const head = Math.atan2(c.fwd[0], c.fwd[1]);
  if (L.camYaw === undefined || L.camCut) { L.camYaw = head; L.camD = undefined; }
  const back = !!L.lookBack, mode = L.camMode;
  let k = 1 - Math.exp(-dt * 7), fov = 56 + Math.min(13, sp * 0.28);
  if (mode === 0 || mode === 1) {
    // chase: the camera yaw follows the heading on a spring (it lags in turns and shows the side of the car in a slide);
    // distance and height grow with the speed; reversing keeps the camera behind the car's nose direction
    const vf = c.vx * c.fwd[0] + c.vz * c.fwd[1];
    const target = head + (back ? Math.PI : 0);
    const rate = back ? 30 : 3.2 + Math.min(4, sp * 0.1);
    L.camYaw += angDiff(target, L.camYaw) * (1 - Math.exp(-dt * rate));
    const far = mode === 1;
    let dist = (far ? 16 : 10.5) + Math.min(far ? 6 : 4, Math.max(0, vf) * (far ? 0.14 : 0.1)), hgt = (far ? 7.5 : 4.4) + Math.min(1.5, sp * 0.03);
    const bx = -Math.sin(L.camYaw), bz = -Math.cos(L.camYaw);
    const free = freeBehind(c, bx, bz, dist);
    // the distance closes at once when a wall comes in, opens again slowly
    const want = Math.max(3.2, Math.min(dist, free));
    L.camD = L.camD === undefined ? want : want < L.camD ? want : L.camD + (want - L.camD) * (1 - Math.exp(-dt * 2));
    const d = L.camD;
    camPos.set(c.x + bx * d, gp + hgt + (dist - d) * 0.4, c.z + bz * d);
    camPos.y = Math.max(camPos.y, surfaceH(camPos.x, camPos.z) + 2);
    const ahead = far ? 10 : 8, ax = c.x - bx * ahead, az = c.z - bz * ahead;
    camLook.set(ax, Math.max(gp, groundH(ax, az)) + 1.2, az);
    if (back) k = 1;
  } else if (mode === 2 || mode === 3) {
    // hood (above the bonnet, eye height) and bumper (low, at the front edge): fixed to the car, no lag
    const y = c.mesh ? c.mesh.position.y : gp, f = c.fwd, s = back ? -1 : 1;
    const along = mode === 2 ? (back ? -0.6 : 0.95) : (back ? -2.4 : 2.35), up = mode === 2 ? 1.36 : 0.62; // (15 nov.) hood: further forward, over the bonnet itself (from 0.5 m the inside of the body showed at the bottom of the screen)
    camPos.set(c.x + f[0] * along, y + up, c.z + f[1] * along);
    camLook.set(c.x + f[0] * (along + 20 * s), y + up - 0.6, c.z + f[1] * (along + 20 * s));
    // (16 nov., user) the body pitches and rolls on its springs (accelerating, braking, cornering): the eye goes with the
    // body, or the bonnet rises through it and the inside of the car shows
    const bg = c.mesh && c.mesh.userData.bodyG;
    if (bg && mode === 2 && c.mesh.parent) { c.mesh.updateMatrixWorld(true);
      camPos.set(0, up, -along).sub(bg.position); bg.localToWorld(camPos);
      camLook.set(0, up - 0.6, -(along + 20 * s)).sub(bg.position); bg.localToWorld(camLook); }
    k = 1; fov = 64 + Math.min(14, sp * 0.3);
  } else if (mode === 4) {
    const [fx, fz] = c.fwd;
    camPos.set(c.x - fx * 10, gp + 62 + sp * 0.8, c.z - fz * 10);
    camLook.set(c.x + fx * 9, gp, c.z + fz * 9);
    k = 1 - Math.exp(-dt * 4);
  } else {
    // cinema: a fixed spot beside the road ahead of the car, like a TV camera; a new spot when the car is far, behind it
    // or hidden by a building
    const S = L.cine;
    const d = S ? Math.hypot(c.x - S.x, c.z - S.z) : 1e9;
    const hidden = S && segHit(S.x, S.z, (c.x - S.x) / (d || 1), (c.z - S.z) / (d || 1), d) < d - 1.5;
    if (!S || L.camCut || d > 48 || hidden || (S.t += dt) > 9) {
      const lead = Math.max(12, Math.min(40, sp * 2.2)), side = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5);
      let x = c.x + c.fwd[0] * lead - c.fwd[1] * side, z = c.z + c.fwd[1] * lead + c.fwd[0] * side;
      // keep the spot in the street: pull it back towards the car until nothing is in the way
      const dx = x - c.x, dz = z - c.z, L0 = Math.hypot(dx, dz) || 1, free = segHit(c.x, c.z, dx / L0, dz / L0, L0) - 1;
      if (free < L0) { x = c.x + dx / L0 * Math.max(4, free); z = c.z + dz / L0 * Math.max(4, free); }
      L.cine = { x, z, y: surfaceH(x, z) + 1.3 + Math.random() * 2.5, t: 0 };
    }
    camPos.set(L.cine.x, L.cine.y, L.cine.z);
    camLook.set(c.x, (c.mesh ? c.mesh.position.y : gp) + 0.8, c.z);
    k = 1; fov = Math.max(28, Math.min(55, 900 / (d + 12)));
  }
  L.camCut = false;
  cam.position.lerp(camPos, k);
  L.look = L.look || camLook.clone();
  L.look.lerp(camLook, mode >= 2 ? 1 : k);
  if (HD || mode === 5) { // speed widens the view (HD); explosions shake it
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * (mode === 5 ? 6 : 3)); cam.updateProjectionMatrix(); }
  }
  if (HD) {
    if (L.shake > 0.01) { cam.position.x += (Math.random() - 0.5) * L.shake; cam.position.y += (Math.random() - 0.5) * L.shake * 0.7; cam.position.z += (Math.random() - 0.5) * L.shake; L.shake *= Math.exp(-dt * 6); }
    if (window.__camAt) { const [px, py, pz, lx, ly, lz] = window.__camAt; cam.position.set(px, py, pz); L.look.set(lx, ly, lz); } // test hook: free camera
    else if (window.__cam) { cam.position.set(c.x + window.__cam[0], c.mesh.position.y + window.__cam[1], c.z + window.__cam[2]); L.look.set(c.x, c.mesh.position.y + 0.7, c.z); }
  }
  if (PhotoMode.on && L.slot === 0) PhotoMode.apply(cam, L);
  cam.lookAt(L.look);
}

// Photo mode (F2, or the button in the pause menu): the game stops, the camera flies freely (ZQSD / WASD or arrows to
// move, A and E or PageUp / PageDown for height, mouse drag to look, wheel for the field of view), the HUD hides.
// HD: exposure and depth of field (focus on what is in the centre). "Prendre la photo" shows the picture to save.
const PhotoMode = (() => {
  const P = { on: false, pos: new THREE.Vector3(), yaw: 0, pitch: -0.15, fov: 50, exp: 1, dof: 0, wasPaused: false };
  let el = null, keys = {};
  function ui() {
    if (el) return el;
    el = document.createElement('div'); el.id = 'photo'; el.hidden = true;
    el.innerHTML = '<b>Mode photo</b><span>ZQSD / flèches : avancer · A / E : monter, descendre · souris : regarder · molette : zoom</span>'
      + (HD ? '<label>Exposition <input id="phExp" type="range" min="40" max="250" value="100"></label><label>Flou de profondeur <input id="phDof" type="range" min="0" max="100" value="0"></label>' : '')
      + '<button id="phShot">Prendre la photo</button><button id="phQuit">Quitter (F2)</button><div id="phOut"></div>';
    const st = document.createElement('style');
    st.textContent = '#photo{position:fixed;left:12px;bottom:12px;z-index:60;background:rgba(10,12,16,.82);color:#eee;font:13px system-ui,sans-serif;padding:10px 12px;border-radius:8px;display:flex;flex-direction:column;gap:6px;max-width:330px}#photo[hidden]{display:none}#photo span{opacity:.75;font-size:12px}#photo label{display:flex;justify-content:space-between;gap:8px;align-items:center}#photo button{font:inherit;padding:5px 8px;cursor:pointer}#phOut img{width:100%;border:1px solid #555;margin-top:4px}#phOut small{display:block;opacity:.75}.photo-on .hud,.photo-on #phuds,.photo-on #flash,.photo-on #dlg{visibility:hidden}';
    document.head.appendChild(st); document.body.appendChild(el);
    const ex = el.querySelector('#phExp'); if (ex) ex.addEventListener('input', e => { P.exp = e.target.value / 100; });
    const dof = el.querySelector('#phDof'); if (dof) dof.addEventListener('input', e => { P.dof = e.target.value / 100; });
    el.querySelector('#phShot').addEventListener('click', shot);
    el.querySelector('#phQuit').addEventListener('click', () => toggle(false));
    let drag = null;
    renderer.domElement.addEventListener('pointerdown', e => { if (P.on) drag = [e.clientX, e.clientY]; });
    addEventListener('pointerup', () => { drag = null; });
    addEventListener('pointermove', e => { if (!P.on || !drag) return; P.yaw -= (e.clientX - drag[0]) * 0.005; P.pitch = Math.max(-1.4, Math.min(1.4, P.pitch - (e.clientY - drag[1]) * 0.005)); drag = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('wheel', e => { if (P.on) { P.fov = Math.max(15, Math.min(90, P.fov + Math.sign(e.deltaY) * 3)); e.preventDefault(); } }, { passive: false });
    return el;
  }
  function toggle(on = !P.on) {
    if (!started || !locals.length || (on && mode === 'online')) { if (on && mode === 'online') flashAll('Mode photo', 'indisponible en ligne'); return; }
    ui(); P.on = on; el.hidden = !on;
    document.body.classList.toggle('photo-on', on);
    if (on) {
      const L = locals[0]; P.pos.copy(L.cam.position); const d = new THREE.Vector3(); L.cam.getWorldDirection(d);
      P.yaw = Math.atan2(d.x, d.z); P.pitch = Math.asin(Math.max(-1, Math.min(1, d.y))); P.fov = L.cam.fov;
      P.wasPaused = paused; paused = true; if (typeof pauseEl !== 'undefined') pauseEl.hidden = true;
    } else {
      paused = P.wasPaused; if (P.wasPaused && typeof pauseEl !== 'undefined') pauseEl.hidden = false; P.exp = 1; P.dof = 0; const e1 = el.querySelector('#phExp'); if (e1) e1.value = 100; const e2 = el.querySelector('#phDof'); if (e2) e2.value = 0;
      document.getElementById('phOut').innerHTML = '';
      const L = locals[0]; L.cam.fov = 56; L.cam.updateProjectionMatrix(); L.camCut = true;
    }
  }
  function tick(dt) {
    if (!P.on) return;
    const v = (keys.ShiftLeft || keys.ShiftRight ? 24 : 8) * dt, f = [Math.sin(P.yaw), Math.cos(P.yaw)];
    const fw = (keys.KeyW || keys.KeyZ || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.KeyQ || keys.ArrowLeft ? 1 : 0);
    const up = (keys.KeyE || keys.PageUp ? 1 : 0) - (keys.KeyC || keys.PageDown ? 1 : 0);
    P.pos.x += (f[0] * fw - f[1] * st) * v; P.pos.z += (f[1] * fw + f[0] * st) * v; P.pos.y += up * v;
    P.pos.y = Math.max(P.pos.y, surfaceH(P.pos.x, P.pos.z) + 0.4);
  }
  function apply(cam, L) {
    cam.position.copy(P.pos);
    L.look.set(P.pos.x + Math.sin(P.yaw) * Math.cos(P.pitch) * 10, P.pos.y + Math.sin(P.pitch) * 10, P.pos.z + Math.cos(P.yaw) * Math.cos(P.pitch) * 10);
    if (Math.abs(cam.fov - P.fov) > 0.01) { cam.fov = P.fov; cam.updateProjectionMatrix(); }
  }
  function shot() { // read the canvas right after a render (same task), shown as an image to save with a right click
    render(0);
    let url = ''; try { url = renderer.domElement.toDataURL('image/jpeg', 0.92); } catch (e) { }
    document.getElementById('phOut').innerHTML = url && url.length > 2000 ? '<img alt="Photo Gangstamen" src="' + url + '"><small>Clic droit (ou appui long) sur l’image : « Enregistrer l’image ».</small>' : '<small>La photo n’a pas pu être lue.</small>';
  }
  addEventListener('keydown', e => {
    if (e.code === 'F2' && !e.repeat) { e.preventDefault(); toggle(); return; }
    if (P.on) { keys[e.code] = true; if (e.code === 'Escape') { toggle(false); } e.stopImmediatePropagation(); if (!/^F\d/.test(e.code)) e.preventDefault(); }
  }, true);
  addEventListener('keyup', e => { keys[e.code] = false; }, true);
  addEventListener('blur', () => { keys = {}; });
  return { toggle, tick, apply, shot, get on() { return P.on; }, get exposure() { return P.on ? P.exp : 1; }, get dof() { return P.on ? P.dof : 0; }, _P: P };
})();
