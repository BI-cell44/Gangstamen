// ---------- HUD ----------
let tickT = 0;
function flash(big, small) {
  const t = $('ticker'); t.innerHTML = ''; t.append(big);
  if (small) { const s = document.createElement('small'); s.textContent = small; t.append(s); }
  t.classList.add('on'); tickT = Math.max(2.2, Math.min(9, 1.2 + ((big + (small || '')).length) / 14)); // long lines stay long enough to be read (about 14 characters a second)
}
function flashFor(L, big, small) {
  if (locals.length <= 1 || !L || !L.hud) return flash(big, small);
  L.hud.pt.textContent = big + (small ? ' · ' + small : ''); L.hud.pt.hidden = false; L.tickT = Math.max(2.2, Math.min(9, 1.2 + ((big + (small || '')).length) / 14));
}
function flashAll(big, small) { if (locals.length <= 1) flash(big, small); else locals.forEach(L => flashFor(L, big, small)); }
function feed(text) {
  const d = document.createElement('div'); d.textContent = text; $('feed').prepend(d);
  setTimeout(() => d.remove(), 5000);
  while ($('feed').children.length > 5) $('feed').lastChild.remove();
}
const mapC = document.createElement('canvas');
function buildMinimap() {
  const S = 1; mapC.width = Math.ceil(2 * HX + 120); mapC.height = Math.ceil(2 * HZ + 220);
  const g = mapC.getContext('2d'), ox = HX + 60 - CX, oz = HZ + 60 - CZ;
  g.fillStyle = '#211a2e'; g.fillRect(0, 0, mapC.width, mapC.height);
  if (DEM) { // shaded relief from the IGN ground model
    const dc = document.createElement('canvas'); dc.width = DEM.nx; dc.height = DEM.nz;
    const dg = dc.getContext('2d'), img = dg.createImageData(DEM.nx, DEM.nz);
    for (let j = 0; j < DEM.nz; j++) for (let i = 0; i < DEM.nx; i++) {
      const k = j * DEM.nx + i, hh = DEM.h[k] / 10;
      const dx = (DEM.h[j * DEM.nx + Math.min(DEM.nx - 1, i + 1)] - DEM.h[j * DEM.nx + Math.max(0, i - 1)]) / 10;
      const dz = (DEM.h[Math.min(DEM.nz - 1, j + 1) * DEM.nx + i] - DEM.h[Math.max(0, j - 1) * DEM.nx + i]) / 10;
      const shadeV = Math.max(0.55, Math.min(1.3, 1 - (dx + dz) * 0.06));
      let r = 40 + hh * 1.6, gg = 30 + hh * 1.2, b = 52 + hh * 1.3;
      if (hh < WATER_Y + 0.9) { r = 47; gg = 90; b = 120; }
      img.data.set([r * shadeV, gg * shadeV, b * shadeV, 255], k * 4);
    }
    dg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(dc, DEM.x0 + ox - DEM.step / 2, DEM.z0 + oz - DEM.step / 2, DEM.nx * DEM.step, DEM.nz * DEM.step);
  }
  const poly = (p, fill) => { g.beginPath(); for (let i = 0; i < p.length; i += 2) g[i ? 'lineTo' : 'moveTo'](p[i] + ox, p[i + 1] + oz); g.closePath(); g.fillStyle = fill; g.fill(); };
  W.greens.forEach(gp => poly(gp.p, gp.g === 3 ? 'rgba(47,90,120,.9)' : 'rgba(47,90,44,.75)'));
  g.lineCap = g.lineJoin = 'round';
  W.roads.forEach(r => { if (!r.d) return; g.strokeStyle = r.w >= 9 ? '#f2c14e' : '#cbbfae'; g.lineWidth = r.w * S; g.beginPath(); for (let i = 0; i < r.p.length; i += 2) g[i ? 'lineTo' : 'moveTo'](r.p[i] + ox, r.p[i + 1] + oz); g.stroke(); });
  W.buildings.forEach(b => poly(b.p, 'rgba(120,104,150,.9)'));
  mapC.ox = ox; mapC.oz = oz;
}
// (15 nov.) direction marks: a navigation chevron (point, two wings, notch at the back) instead of a plain triangle, so
// the direction it points to cannot be misread. Drawn pointing along +x, centred on the origin.
function chevronPath(g, s) { g.beginPath(); g.moveTo(s * 0.62, 0); g.lineTo(-s * 0.5, s * 0.58); g.lineTo(-s * 0.18, 0); g.lineTo(-s * 0.5, -s * 0.58); g.closePath(); }
function drawMinimapOn(cv, me) {
  const mg = cv.getContext('2d'), S = cv.width, R = S / 2, Z = 1.25 * S / 336;
  mg.save(); mg.clearRect(0, 0, S, S);
  mg.beginPath(); mg.arc(R, R, R, 0, Math.PI * 2); mg.clip();
  mg.fillStyle = '#151020'; mg.fillRect(0, 0, S, S);
  mg.translate(R, R); mg.rotate(me.h); mg.scale(Z, Z);
  mg.translate(-(me.x + mapC.ox), -(me.z + mapC.oz));
  mg.drawImage(mapC, 0, 0);
  for (const pk of pickups) if (pk.on) { mg.fillStyle = '#7be07b'; mg.fillRect(pk.x + mapC.ox - 4, pk.z + mapC.oz - 4, 8, 8); }
  // (21 nov., audit UX) not by colour alone: enemies are diamonds, team-mates rounds; a chief of the Rapaces has a gold ring
  for (const r of rivals) { const x = r.x + mapC.ox, z = r.z + mapC.oz, foe = r.alive && enemies(me, r); mg.fillStyle = !r.alive ? '#555' : teamMode ? TEAMS[r.team].css : '#ff3b3b'; mg.beginPath();
    if (foe) { mg.moveTo(x, z - 8); mg.lineTo(x + 7, z); mg.lineTo(x, z + 8); mg.lineTo(x - 7, z); mg.closePath(); } else mg.arc(x, z, 6, 0, Math.PI * 2);
    mg.fill(); if (r.chief && r.alive) { mg.strokeStyle = '#ffcf3a'; mg.lineWidth = 3; mg.beginPath(); mg.arc(x, z, 12, 0, Math.PI * 2); mg.stroke(); } }
  if (gx) gx.minimap(me, (c, colr) => { mg.fillStyle = colr; mg.beginPath(); mg.arc(c.x + mapC.ox, c.z + mapC.oz, 6, 0, Math.PI * 2); mg.fill(); });
  for (const c of allPlayerCars()) {
    if (c === me) continue;
    mg.fillStyle = c.owner && c.owner.colour ? c.owner.colour : '#fff'; mg.strokeStyle = '#000'; mg.lineWidth = 2;
    mg.beginPath(); mg.arc(c.x + mapC.ox, c.z + mapC.oz, 7, 0, Math.PI * 2); mg.fill(); mg.stroke();
  }
  mg.restore();
  mg.save(); mg.translate(R, R);
  // enemies beyond the edge of the minimap: a small chevron on the rim pointing at them,
  // bright and large when close, dimmer, greyer and smaller the further away they are
  const edge = (R - 9) / Z, hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const off = [...rivals, ...allPlayerCars()].filter(r => r !== me && r.alive && enemies(me, r));
  const split = locals.length > 1; // (17 nov., user) the minimaps of a split screen are small: bigger chevrons
  for (const r of off) {
    const dx = r.x - me.x, dz = r.z - me.z, c = Math.cos(me.h), s = Math.sin(me.h);
    const sx = (dx * c - dz * s) * Z, sy = (dx * s + dz * c) * Z, d = Math.hypot(sx, sy), dist = Math.hypot(dx, dz);
    if (d <= R - 8) continue;
    const t = Math.max(0, Math.min(1, (dist - edge) / 300)); // 0 just off the map, 1 at 300 m beyond and further
    const base = r.botIndex !== undefined ? (teamMode ? TEAMS[r.team].css : '#ff2a2a') : (r.owner && r.owner.colour) || '#ff2a2a';
    const [br, bg, bb] = hx(base), e = t * t * (3 - 2 * t);
    const rr = Math.round(br + (150 - br) * e * 0.8), gg = Math.round(bg + (138 - bg) * e * 0.8), b2 = Math.round(bb + (160 - bb) * e * 0.8);
    const a = Math.atan2(sy, sx), k = S / 336 * 2, size = (11 - 6 * e) * k * (split ? 1.4 : 1), rim = R - 4 - size * 0.2;
    mg.save(); mg.translate(Math.cos(a) * rim, Math.sin(a) * rim); mg.rotate(a);
    chevronPath(mg, size * 1.25); mg.lineJoin = 'round';
    mg.globalAlpha = 1 - e * 0.3; mg.fillStyle = `rgb(${rr},${gg},${b2})`; mg.strokeStyle = 'rgba(0,0,0,.8)'; mg.lineWidth = Math.max(1, k * 0.9);
    mg.fill(); mg.stroke(); mg.restore();
  }
  // the target (the arrow of the mission panel): a chevron of its colour on the rim when it is off the minimap
  const tg = gx && ((gx.modeTarget && gx.modeTarget(me.owner)) || (me.owner === locals[0] && gx.objTarget));
  if (tg) {
    const dx = tg.x - me.x, dz = tg.z - me.z, c = Math.cos(me.h), s = Math.sin(me.h);
    const sx = (dx * c - dz * s) * Z, sy = (dx * s + dz * c) * Z;
    const k = S / 336 * 2, size = 15 * k * (split ? 1.9 : 1);
    // (17 nov., user) inside the minimap: a disc as big as the chevron and of its colour on the target itself
    if (Math.hypot(sx, sy) <= R - 8) { mg.beginPath(); mg.arc(sx, sy, size * 0.5, 0, Math.PI * 2); mg.fillStyle = tg.col || OBJ_CSS; mg.strokeStyle = '#000'; mg.lineWidth = Math.max(1.5, k * 1.2); mg.fill(); mg.stroke(); }
    else {
      const a = Math.atan2(sy, sx), rim = R - 4 - size * 0.3;
      mg.save(); mg.translate(Math.cos(a) * rim, Math.sin(a) * rim); mg.rotate(a); chevronPath(mg, size); mg.lineJoin = 'round';
      mg.fillStyle = tg.col || OBJ_CSS; mg.strokeStyle = '#000'; mg.lineWidth = Math.max(1.5, k * 1.2); mg.fill(); mg.stroke(); mg.restore();
    }
  }
  const k = S / 336 * 2;
  mg.fillStyle = '#f2c14e'; mg.strokeStyle = '#000'; mg.lineWidth = 3;
  mg.beginPath(); mg.moveTo(0, -14 * k); mg.lineTo(9 * k, 10 * k); mg.lineTo(0, 5 * k); mg.lineTo(-9 * k, 10 * k); mg.closePath(); mg.stroke(); mg.fill();
  mg.restore();
}
function streetAt(x, z) {
  const segs = roadSegs.get(key(Math.floor(x / RCELL), Math.floor(z / RCELL)));
  let best = null, bd = 1e9;
  if (segs) for (const [ax, az, bx, bz, w, n] of segs) {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t) - w / 2;
    if (d < bd && W.names[n]) { bd = d; best = W.names[n]; }
  }
  if (best && bd < 8) return best;
  if (groundH(x, z) < WATER_Y + 3) return 'Bord de Loire';
  if (Math.abs(x - CX) > HX || Math.abs(z - CZ) > HZ) return 'Hors carte';
  return 'Hors des rues';
}
function buildPlayerHuds() {
  const root = $('phuds'); root.innerHTML = '';
  document.body.classList.toggle('split', locals.length > 1);
  if (locals.length <= 1) return;
  for (const L of locals) {
    const d = document.createElement('div'); d.className = 'phud';
    const pn = document.createElement('div'); pn.className = 'pn'; pn.textContent = 'J' + (L.slot + 1); pn.style.background = L.colour;
    const pr = document.createElement('div'); pr.className = 'pr';
    const ps = document.createElement('div'); ps.className = 'ps'; ps.innerHTML = '0<span>KM/H</span>';
    const pb = document.createElement('div'); pb.className = 'pb'; const pbi = document.createElement('i'); pb.append(pbi);
    const pt = document.createElement('div'); pt.className = 'pt'; pt.hidden = true;
    const cv = document.createElement('canvas'); cv.width = 192; cv.height = 192;
    const pst = document.createElement('div'); pst.className = 'pst';
    const pw = document.createElement('div'); pw.className = 'pw'; pw.hidden = true; // (17 nov., user) the bonus weapons of each player (gx hud)
    d.append(pn, pr, ps, pb, pt, cv, pst, pw); root.append(d);
    L.hud = { root: d, pr, ps, pb: pbi, pt, cv, pst, pw };
  }
  layoutViews();
}
function layoutViews() {
  const Wd = innerWidth, Ht = innerHeight, n = Math.max(1, locals.length);
  const tSplit = n === 2 && mode === 'split' && touchP1();
  document.body.classList.toggle('noTouchP', mode === 'split' && touchDev && !touchP1()); // player 1 on a keyboard or a gamepad: no touch controls // touch player 1: bottom view in portrait, left one in landscape
  const rects = n === 1 ? [[0, 0, Wd, Ht]] : tSplit ? (Wd > Ht ? [[0, 0, Wd / 2, Ht], [Wd / 2, 0, Wd / 2, Ht]] : [[0, Ht / 2, Wd, Ht / 2], [0, 0, Wd, Ht / 2]]) : n === 2 ? [[0, 0, Wd, Ht / 2], [0, Ht / 2, Wd, Ht / 2]]
    : n === 3 ? [[0, 0, Wd, Ht / 2], [0, Ht / 2, Wd / 2, Ht / 2], [Wd / 2, Ht / 2, Wd / 2, Ht / 2]]
      : [[0, 0, Wd / 2, Ht / 2], [Wd / 2, 0, Wd / 2, Ht / 2], [0, Ht / 2, Wd / 2, Ht / 2], [Wd / 2, Ht / 2, Wd / 2, Ht / 2]];
  locals.forEach((L, i) => {
    const [x, y, w, h] = rects[i]; L.vp = { x, y, w, h };
    if (L.hud) L.hud.root.classList.toggle('tctl', tSplit && i === 0); // its speed and street sign clear of the touch controls
    L.cam.aspect = w / h; L.cam.updateProjectionMatrix();
    if (L.hud) Object.assign(L.hud.root.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRight: (x + w < Wd - 1 ? '2px solid #000' : 'none'), borderBottom: (y + h < Ht - 1 ? '2px solid #000' : 'none'), boxSizing: 'border-box' });
  });
}
addEventListener('resize', layoutViews);
function updateHud(dt) {
  if (tickT > 0) { tickT -= dt; if (tickT <= 0) $('ticker').classList.remove('on'); }
  if (locals.length === 1) {
    const L = locals[0], c = L.car;
    $('speed').firstChild.nodeValue = Math.round(c.speed * 3.6);
    { const sp = $('speed').lastChild, t = c.phys && useRealPhysics(c) ? 'KM/H · ' + c.phys.gear + (c.phys.gear === 1 ? 're' : 'e') : 'KM/H'; if (sp.textContent !== t) sp.textContent = t; } // gear in the realistic mode
    $('hp').style.width = c.hp + '%'; document.body.classList.toggle('lowHp', c.alive && c.hp < 25);
    // (21 nov., audit UX) the respect and KO frames fade when nothing changes, and light up when they move
    for (const [id, v] of [['respect', L.respect], ['kills', L.kills]]) { const e = $(id); if (e.textContent !== String(v)) { e.textContent = v; e.parentNode.classList.add('fresh'); clearTimeout(e._ft); e._ft = setTimeout(() => e.parentNode.classList.remove('fresh'), 4000); } }
    if (HD && gx && gx.nextBuy) { const nb = mode === 'solo' && !gx.gmode ? gx.nextBuy() : null, el = $('nextBuy'), t = nb ? (L.respect >= nb.cost ? '✔ garage : ' + nb.name : nb.name + ' · ' + nb.cost) : '';
      if (el.textContent !== t) { el.textContent = t; el.hidden = !t; el.classList.toggle('ok', !!nb && L.respect >= nb.cost); } }
    L.streetAcc += dt; if (L.streetAcc > 0.25) { L.streetAcc = 0; const s = streetAt(c.x, c.z); if (s !== L.street) { L.street = s; $('street').textContent = s; } }
    drawMinimapOn($('minimap'), c);
  } else {
    for (const L of locals) {
      const c = L.car, h = L.hud; if (!h) continue;
      h.ps.firstChild.nodeValue = Math.round(c.speed * 3.6);
      if (c.phys && useRealPhysics(c)) { const gt = c.phys.gear + (c.phys.gear === 1 ? 're' : 'e'), sp = h.ps.lastChild; if (sp.textContent !== 'KM/H · ' + gt) sp.textContent = 'KM/H · ' + gt; } else if (h.ps.lastChild.textContent !== 'KM/H') h.ps.lastChild.textContent = 'KM/H';
      h.pb.style.width = c.hp + '%';
      { const t = gx && gx.gmode ? gx.scoreText(L.kills).replace(/^Checkpoints /, 'COURSE ').toUpperCase() : 'RESPECT ' + L.respect + ' · KO ' + L.kills; if (h.pr.textContent !== t) h.pr.textContent = t; } // captures, points or laps and checkpoints of the modes
      L.streetAcc += dt; if (L.streetAcc > 0.3) { L.streetAcc = 0; const s = streetAt(c.x, c.z); if (s !== L.street) { L.street = s; h.pst.textContent = s; } drawMinimapOn(h.cv, c); }
      if (L.tickT > 0) { L.tickT -= dt; if (L.tickT <= 0) h.pt.hidden = true; }
    }
  }
}
function boardRows() {
  const rows = [];
  for (const L of locals) rows.push({ name: mode === 'online' ? (settings.nick || 'Moi') + ' (vous)' : 'Joueur ' + (L.slot + 1), r: L.respect, k: L.kills, col: L.colour, t: L.team });
  for (const R of Net.remotes.values()) rows.push({ name: R.nick + (R.peer === Net.hostPeer ? ' ★' : ''), r: R.respect, k: R.kills, col: R.colour, t: R.car.team });
  return rows;
}
function teamScores(rows) { if (gx && gx.teamScores) { const t = gx.teamScores(); if (t) return t; } const s = [0, 0]; for (const r of rows) if (r.t >= 0) s[r.t] += r.k; return s; }
function updateTeamBar() {
  const bar = $('teambar'); bar.hidden = !teamMode; if (!teamMode) return;
  const s = teamScores(boardRows()), txt = s[0] + '  –  ' + s[1];
  if (bar.dataset.v === txt) return; bar.dataset.v = txt;
  const a = document.createElement('span'); a.className = 't0'; a.textContent = 'RAPACES';
  const m = document.createElement('b'); m.textContent = txt;
  const c = document.createElement('span'); c.className = 't1'; c.textContent = 'CHANTENAYSIENS';
  bar.replaceChildren(a, m, c);
}
function renderBoard() {
  const rows = boardRows();
  const h = document.createElement('div'); h.textContent = mode === 'online' ? 'Partie ' + (Net.code || '').toUpperCase() + ' · ' + rows.length + '/12' : 'Classement';
  h.style.cssText = 'color:var(--sunset);margin-bottom:6px';
  $('board').replaceChildren(h, boardTable(rows));
}
function boardTable(rows) {
  rows.sort((a, b) => teamMode ? (a.t - b.t) || (b.r - a.r) : b.r - a.r);
  const t = document.createElement('table');
  t.innerHTML = '<tr><th></th><th>Joueur</th><th>Respect</th><th>' + (gx && gx.gmode ? 'Points' : 'KO') + '</th></tr>';
  const sc = teamScores(rows);
  let lastT = null;
  for (const r of rows) {
    if (teamMode && r.t !== lastT && r.t >= 0) {
      lastT = r.t;
      const tr = document.createElement('tr'); tr.className = 'tsum';
      const td = document.createElement('td'); td.colSpan = 3; td.textContent = TEAMS[r.t].name; td.style.color = TEAMS[r.t].css;
      const tk = document.createElement('td'); tk.textContent = sc[r.t];
      tr.append(td, tk); t.append(tr);
    }
    const tr = document.createElement('tr');
    const c = document.createElement('td'); c.innerHTML = '<span style="display:inline-block;width:12px;height:12px;border:2px solid #000"></span>'; c.firstChild.style.background = r.col;
    const n = document.createElement('td'); n.textContent = r.name;
    const a = document.createElement('td'); a.textContent = r.r; const b = document.createElement('td'); b.textContent = r.k;
    tr.append(c, n, a, b); t.append(tr);
  }
  return t;
}

