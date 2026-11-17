  // =====================================================================================
  // (16 nov., user request) free driving: a map of the area with starting points, at the start of the mode and at any
  // time after (G key, or « Carte » in the pause menu). Click a point on the map, or pick it in the list (keyboard or
  // gamepad). The world waits while the map is open.
  // =====================================================================================
  const SpawnMap = (() => {
    const SPOTS = [ // (16 nov.) the list chosen by the user
      ['Place Jean-Macé', 59, 228, 160, -440], // (16 nov., user) on the boulevard just above the place (its middle is the Dérapage start), facing up towards the town hall
      ['Mairie de Chantenay', 160, -440], ['Gare de Chantenay', -300, 540],
      ['Place des Garennes · la butte', 864, 30],
      ['Gare Maritime · le bac', 1345, -420], ['Grue grise · pointe de l’île', 1218, 366], ['Nefs Dubigeon', 1958, -363],
    ];
    const rejects = [];
    let el = null, cv = null, spots = null, open = false, view = null;
    function build() {
      if (el) return;
      el = document.createElement('div'); el.id = 'spawnMap'; el.hidden = true;
      el.style.cssText = 'position:fixed;inset:0;z-index:31;display:grid;place-items:center;background:rgba(13,10,20,.82)';
      // (17 nov., user) a grid of two rows: the map and the list of places, then the postcards and, level with them, the
      // records of the races and challenges
      el.innerHTML = '<div class="card spCard" style="display:grid;grid-template-columns:auto minmax(250px,auto);gap:10px 18px;align-items:start;max-width:96vw;max-height:94vh;overflow-y:auto"><div class="spWrap" style="position:relative;justify-self:center;line-height:0"><canvas width="640" height="560" style="max-width:46vw;max-height:60vh;border-radius:8px;cursor:zoom-in;background:#1c1a24"></canvas>'
        + '<button class="mbtn spShrink" hidden>✕ Réduire</button><div class="spTip" hidden></div></div>'
        + '<div style="display:flex;flex-direction:column;gap:6px;min-width:250px"><h2 style="margin:0 0 4px;font-family:var(--display);font-weight:normal;font-size:30px;color:var(--chalk);text-shadow:3px 3px 0 var(--magenta)">Où démarrer ?</h2>'
        + '<p class="fine" style="margin:0 0 6px">Clique un point sur la carte ou choisis dans la liste. ' + (isTouch ? 'Clique sur la carte pour l’agrandir. En jeu, touche la minicarte pour revenir ici.' : 'Clique sur la carte pour l’agrandir. En jeu, G ou un clic sur la minicarte pour revenir ici.') + '</p>'
        // (17 nov., user) leave the map without choosing a place (no Échap key on a phone), or back to the title screen
        + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:0 0 8px"><button class="mbtn spStay">Continuer ici</button><button class="mbtn spQuit">Menu principal</button></div><div class="spList" style="display:flex;flex-direction:column;gap:5px"></div></div>'
        + '<div class="spCards fine" style="max-width:46vw;max-height:26vh;overflow-y:auto;font-size:13px"></div>'
        + '<div class="spSide fine" style="max-height:26vh;overflow-y:auto;font-size:13px"></div></div>';
      document.body.append(el); cv = el.querySelector('canvas');
      // (17 nov., user) a click on the map shows it full screen (no more magnifier); there a click on a point starts there,
      // on a found postcard shows it, on a race or a challenge names it; the wheel zooms; « Réduire » or Échap goes back.
      // Hovering any icon names it (a tap does the same on a phone)
      const wrap = el.querySelector('.spWrap'), tip = el.querySelector('.spTip'), shrink = el.querySelector('.spShrink');
      shrink.addEventListener('click', e => { e.stopPropagation(); setBig(false); });
      cv.addEventListener('wheel', e => { if (!big) return; e.preventDefault(); const [x, z] = fromEvent(e); zoom.z = Math.max(1, Math.min(6, zoom.z * (e.deltaY < 0 ? 1.4 : 1 / 1.4))); if (zoom.z < 1.05) zoom.z = 1; else { zoom.x = x; zoom.cz = z; } draw(lastSel); }, { passive: false });
      const hitAt = e => { const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, my = (e.clientY - r.top) * cv.height / r.height; let best = null, bd = 1e9; for (const h of hits) { const d = Math.hypot(h.x - mx, h.y - my); if (d < h.r && d < bd) { bd = d; best = h; } } return best; };
      const showTip = (h, e) => { if (!h) { tip.hidden = true; return; } const r = wrap.getBoundingClientRect(); tip.textContent = h.label; tip.hidden = false; tip.style.left = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 6) + 'px'; tip.style.top = Math.max(4, e.clientY - r.top - 34) + 'px'; };
      cv.addEventListener('mousemove', e => { const h = hitAt(e); showTip(h, e); cv.style.cursor = !big ? 'zoom-in' : h && h.act ? 'pointer' : h ? 'pointer' : 'default'; });
      cv.addEventListener('mouseleave', () => { tip.hidden = true; });
      cv.addEventListener('click', e => {
        if (!big) { setBig(true); return; }
        const h = hitAt(e);
        if (h && h.spot) choose(h.spot); else if (h && h.card) showPostcard(h.card.s, 0); else if (h) showTip(h, e);
        else if (zoom.z > 1) { [zoom.x, zoom.cz] = fromEvent(e); draw(lastSel); }
      });
      el.addEventListener('keydown', e => { if (e.code === 'Escape' || e.code === 'KeyG') { e.stopPropagation(); if (e.code === 'KeyG' && !big) close(); else escape(); } });
      el.querySelector('.spStay').addEventListener('click', () => close());
      el.querySelector('.spQuit').addEventListener('click', () => { close(); $('pQuit').click(); });
    }
    function resolve() { // snap every spot to a drivable street inside the play area
      if (spots) return spots;
      spots = [];
      for (const [name, x0, z0, fx, fz] of SPOTS) {
        let x = x0, z = z0;
        if (x == null || !isFinite(x)) continue;
        if (Math.abs(x - CX) > HX - 15 || Math.abs(z - CZ) > HZ - 15) { rejects.push([name, 'hors carte', CX, HX, CZ, HZ]); continue; }
        const [rx, rz] = roadPoint(x, z), n = nearestNodeTo(rx, rz);
        if (!nodeOk(n) || Math.hypot(rx - x, rz - z) > 120) { rejects.push([name, nodeOk(n), Math.round(rx), Math.round(rz)]); continue; }
        // (16 nov., user) a starting point on the start marker of a race or a challenge started it at once, or found a
        // postcard: moved along the streets to the nearest node clear of both (25 m from a start, 10 m past a postcard)
        let px = rx, pz = rz;
        const busy = (x, z) => nearActStart(x, z, 25) || nearPostcard(x, z, 10);
        if (busy(px, pz)) { const seen = new Set([n]), q = [n]; let found = null;
          while (q.length && !found) { const a = q.shift(); for (const b of G.adj[a]) { if (seen.has(b)) continue; seen.add(b); if (Math.hypot(G.x[b] - rx, G.z[b] - rz) > 220) continue; if (nodeOk(b) && !busy(G.x[b], G.z[b])) { found = b; break; } q.push(b); } }
          if (found != null) { px = G.x[found]; pz = G.z[found]; } }
        spots.push({ name, x: px, z: pz, fx, fz });
      }
      return spots;
    }
    const zoom = { z: 1, x: 0, cz: 0 }; let big = false, lastSel = null, hits = [], holder = null;
    function setBig(on) {
      big = on; zoom.z = 1; const wrap = cv.parentNode; wrap.classList.toggle('spFull', on);
      // out of the menu card while full screen (the card is tilted: a fixed child would stay inside it)
      if (on) { holder = holder || document.createComment('map'); wrap.replaceWith(holder); document.body.append(wrap); } else if (holder && holder.parentNode) holder.replaceWith(wrap); wrap.querySelector('.spShrink').hidden = !on; wrap.querySelector('.spTip').hidden = true;
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (on) { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); } else { cv.width = 640; cv.height = 560; }
      draw(lastSel);
    }
    function toMap(x, z) { return [(x - view.x0) * view.k + view.ox, (z - view.z0) * view.k + view.oy]; }
    function fromEvent(e) { const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, my = (e.clientY - r.top) * cv.height / r.height; return [(mx - view.ox) / view.k + view.x0, (my - view.oy) / view.k + view.z0]; }
    function draw(sel) {
      lastSel = sel; hits = [];
      const g = cv.getContext('2d'), W_ = cv.width, H_ = cv.height, u = big ? Math.min(2, devicePixelRatio || 1) : 1; // icon scale
      const x0 = CX - HX, x1 = CX + HX, z0 = CZ - HZ, z1 = CZ + HZ, k0 = Math.min((W_ - 30) / (x1 - x0), (H_ - 30) / (z1 - z0));
      if (zoom.z > 1) { // keep the zoomed window inside the area
        const k = k0 * zoom.z, hw = W_ / 2 / k, hh = H_ / 2 / k;
        zoom.x = Math.max(x0 + hw - 15 / k, Math.min(x1 - hw + 15 / k, zoom.x)); zoom.cz = Math.max(z0 + hh - 15 / k, Math.min(z1 - hh + 15 / k, zoom.cz));
        view = { x0, z0, k, ox: W_ / 2 - (zoom.x - x0) * k, oy: H_ / 2 - (zoom.cz - z0) * k };
      } else view = { x0, z0, k: k0, ox: (W_ - (x1 - x0) * k0) / 2, oy: (H_ - (z1 - z0) * k0) / 2 };
      const k = view.k;
      g.fillStyle = '#1c1a24'; g.fillRect(0, 0, W_, H_);
      g.fillStyle = '#25395a'; // the Loire: points below the water line, sampled coarsely
      for (let x = x0; x < x1; x += 12) for (let z = z0; z < z1; z += 12) if (groundH(x, z) < WATER_Y + 0.3) { if (zoom.z > 1) { const [qx, qy] = toMap(x, z); if (qx < -40 || qy < -40 || qx > W_ || qy > H_) continue; } const [px, py] = toMap(x, z); g.fillRect(px, py, 12 * k + 1, 12 * k + 1); }
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const r of W.roads) {
        if (!r.d) continue; g.strokeStyle = r.w >= 9 ? '#d8cfbf' : '#8f8796'; g.lineWidth = Math.max(1, r.w * k * 0.9);
        g.beginPath(); for (let i = 0; i < r.p.length; i += 2) { const [px, py] = toMap(r.p[i], r.p[i + 1]); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
      }
      // (16 nov., user) the postcards on the map: a little card where one was found (click it to see it), « ? » where not yet
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const p of postcardSpots()) { const [px, py] = toMap(p.x, p.z);
        hits.push({ x: px, y: py, r: 12 * u, label: p.found ? 'Carte postale : ' + p.s.name : 'Carte postale à trouver', card: p.found ? p : null });
        if (p.found) { g.save(); g.translate(px, py); g.scale(u, u); g.rotate(-0.15); g.fillStyle = '#f6f0e2'; g.fillRect(-8, -6, 16, 12); g.strokeStyle = '#c41f2a'; g.lineWidth = 1.5; g.strokeRect(-8, -6, 16, 12); g.fillStyle = '#c41f2a'; g.fillRect(3, -4, 3, 3); g.restore(); }
        else { g.fillStyle = 'rgba(246,240,226,.25)'; g.beginPath(); g.arc(px, py, 7 * u, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f6f0e2'; g.font = 'bold ' + 11 * u + 'px Arial, sans-serif'; g.fillText('?', px, py + 0.5); } }
      // (17 nov., user) the races (blue, chequered flag) and the challenges (orange, star) where they start; greyed while locked
      const placed = [];
      for (const a of (actsBuild(), acts)) { let [px, py] = toMap(...a.start); const race = a.kind === 'race';
        while (placed.some(([qx, qy]) => Math.hypot(qx - px, qy - py) < 20 * u)) px += 24 * u; // two starts at the same place: side by side
        placed.push([px, py]);
        const rec = actRecords().find(r => r.id === a.id), lock = !unlocked(a.id);
        hits.push({ x: px, y: py, r: 14 * u, act: a, label: (race ? 'Course : ' : 'Défi : ') + a.name + (lock ? ' · à débloquer : ' + (LOCK_TXT[a.id] || 'plus tard') : rec && rec.best ? ' · record ' + rec.best : '') });
        g.save(); g.translate(px, py); g.scale(u, u); actIcon(g, race, lock); g.restore(); }
      const c = locals[0] && locals[0].car;
      if (c) { const [px, py] = toMap(c.x, c.z); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(px, py, 6, 0, Math.PI * 2); g.fill(); }
      g.font = 'bold 13px Arial, sans-serif'; g.textBaseline = 'middle';
      spots.forEach((s, i) => {
        const [px, py] = toMap(s.x, s.z), on = s === sel;
        hits.push({ x: px, y: py, r: 14 * u, spot: s, label: 'Départ ' + (i + 1) + ' : ' + s.name });
        g.save(); g.translate(px, py); g.scale(u, u); g.translate(-px, -py);
        g.fillStyle = on ? '#ff4fa3' : '#3a8aff'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, on ? 11 : 9, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(String(i + 1), px, py + 0.5);
        if (on) { g.textAlign = px > W_ - 160 ? 'right' : 'left'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; const tx = px + (g.textAlign === 'left' ? 15 : -15); g.strokeText(s.name, tx, py); g.fillText(s.name, tx, py); }
        g.restore();
      });
    }
    // the icon of a race (blue, chequered flag) or a challenge (orange, star), greyed while locked: on the map and in the list
    function actIcon(g, race, lock) {
      g.globalAlpha = lock ? 0.4 : 1;
      g.fillStyle = race ? RACE_CSS : CHAL_CSS; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -11); g.arcTo(11, -11, 11, 11, 4); g.arcTo(11, 11, -11, 11, 4); g.arcTo(-11, 11, -11, -11, 4); g.arcTo(-11, -11, 11, -11, 4); g.closePath(); g.fill(); g.stroke();
      if (race) { g.fillStyle = '#fff'; g.fillRect(-6, -7, 2, 14); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#fff'; g.fillRect(-4 + i * 2.5, -7 + j * 2.5, 2.5, 2.5); } }
      else { g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3.2 : 7.5, t = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(t) * r, Math.sin(t) * r + 0.6); } g.closePath(); g.fill(); }
      g.globalAlpha = 1;
    }
    const iconCache = {};
    function actIconURL(race, lock) {
      const key = race + '/' + lock; if (iconCache[key]) return iconCache[key];
      const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.scale(2, 2); g.translate(12, 12); actIcon(g, race, lock);
      return (iconCache[key] = c.toDataURL());
    }
    function show() {
      if (!locals[0] || mission) return;
      build(); resolve(); if (!spots.length) return;
      const list = el.querySelector('.spList'); list.innerHTML = '';
      spots.forEach((s, i) => {
        const b = document.createElement('button'); b.className = 'mbtn'; b.style.textAlign = 'left'; b.textContent = (i + 1) + '. ' + s.name;
        b.addEventListener('click', () => choose(s)); b.addEventListener('focus', () => draw(s)); b.addEventListener('mouseenter', () => draw(s));
        list.append(b);
      });
      { const side = el.querySelector('.spSide'); side.innerHTML = '<b>Courses et défis</b> (mêmes icônes sur la carte) :<br>' + actRecords().map(r => '<img src="' + actIconURL(r.kind === 'race', !unlocked(r.id)) + '" alt="" style="width:18px;height:18px;vertical-align:-4px;margin-right:6px">' + r.name + ' : ' + (unlocked(r.id) ? r.best || '—' : 'à débloquer (' + (LOCK_TXT[r.id] || 'plus tard') + ')')).join('<br>');
        const pc = postcards(), nf = pc.filter(p => p.text).length, h = document.createElement('div'); h.style.marginTop = '12px'; h.innerHTML = '<b>Cartes postales</b> : ' + nf + ' / ' + pc.length + ' lieux découverts. Sur la carte : une petite carte là où tu l’as trouvée (clique pour la revoir), « ? » là où il en reste une.'; const cards = el.querySelector('.spCards'); cards.innerHTML = ''; cards.append(h); h.style.marginTop = '0'; postcardGallery(h); }
      if (big) setBig(false);
      open = true; blocking = true; el.hidden = false; draw(null); list.firstChild.focus();
    }
    // (17 nov., user) Échap steps back one level: the postcard shown, then the full screen map, then the map itself
    function escape() { const pc = $('postcard'); if (pc && !pc.hidden && pc.className === 'big') pc.hidden = true; else if (big) setBig(false); else close(); }
    function close() { if (!open) return; if (big) setBig(false); open = false; blocking = false; el.hidden = true; try { renderer.domElement.focus(); } catch (e) { } }
    function choose(s) {
      const L = locals[0]; if (!L) return close();
      const n = nearestNodeTo(s.x, s.z), A = (G.adj[n] || []).filter(m => nodeOk(m)), dir = m => s.fx == null ? 0 : ((G.x[m] - G.x[n]) * (s.fx - G.x[n]) + (G.z[m] - G.z[n]) * (s.fz - G.z[n])) / (Math.hypot(G.x[m] - G.x[n], G.z[m] - G.z[n]) || 1);
      const nb = A.length ? A.reduce((b, m) => dir(m) > dir(b) ? m : b, A[0]) : G.adj[n] && G.adj[n][0];
      close();
      Busy.run(s.name, () => { placePlayer([s.x, s.z], s.fx != null ? [s.fx, s.fz] : nb != null ? [G.x[nb], G.z[nb]] : null); L.heat = 0; });
      flash(s.name, isTouch ? 'Conduite libre · touche la minicarte pour changer de point de départ' : 'Conduite libre · G ou clic sur la minicarte : changer de point de départ');
    }
    return { show, close, escape, choose, get open() { return open; }, get spots() { return resolve(); }, rejects };
  })();
