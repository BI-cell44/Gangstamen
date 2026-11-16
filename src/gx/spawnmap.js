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
      el.innerHTML = '<div class="card" style="display:flex;gap:18px;align-items:flex-start;max-width:96vw;max-height:94vh"><div style="display:flex;flex-direction:column;gap:8px;max-width:46vw"><canvas width="640" height="560" style="max-width:46vw;max-height:60vh;border-radius:8px;cursor:pointer;background:#1c1a24;align-self:center"></canvas><div class="spCards fine" style="max-height:26vh;overflow-y:auto;font-size:13px"></div></div>'
        + '<div style="display:flex;flex-direction:column;gap:6px;min-width:250px"><h2 style="margin:0 0 4px;font-family:var(--display);font-weight:normal;font-size:30px;color:var(--chalk);text-shadow:3px 3px 0 var(--magenta)">Où démarrer ?</h2>'
        + '<p class="fine" style="margin:0 0 6px">Clique un point sur la carte ou choisis dans la liste. Touche G (ou Pause → Carte) pour revenir ici.</p><div class="spList" style="display:flex;flex-direction:column;gap:5px"></div>'
        + '<div class="spSide fine" style="margin-top:12px;max-height:30vh;overflow-y:auto;font-size:13px"></div></div></div>'; // (16 nov., user) races and challenges under the list of places, beside the postcards // (16 nov., user) records of the races and challenges, and the postcards, beside the map
      document.body.append(el); cv = el.querySelector('canvas');
      cv.addEventListener('click', e => {
        const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, my = (e.clientY - r.top) * cv.height / r.height;
        let best = null, bd = 26; for (const s of spots) { const [px, py] = toMap(s.x, s.z), d = Math.hypot(px - mx, py - my); if (d < bd) { bd = d; best = s; } }
        if (best) choose(best);
        else { let pb = null, pd = 14; for (const p of postcardSpots()) { if (!p.found) continue; const [px, py] = toMap(p.x, p.z), d = Math.hypot(px - mx, py - my); if (d < pd) { pd = d; pb = p; } } if (pb) showPostcard(pb.s, 0); }
      });
      el.addEventListener('keydown', e => { if (e.code === 'Escape' || e.code === 'KeyG') { e.stopPropagation(); close(); } });
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
    function toMap(x, z) { return [(x - view.x0) * view.k + view.ox, (z - view.z0) * view.k + view.oy]; }
    function draw(sel) {
      const g = cv.getContext('2d'), W_ = cv.width, H_ = cv.height;
      const x0 = CX - HX, x1 = CX + HX, z0 = CZ - HZ, z1 = CZ + HZ, k = Math.min((W_ - 30) / (x1 - x0), (H_ - 30) / (z1 - z0));
      view = { x0, z0, k, ox: (W_ - (x1 - x0) * k) / 2, oy: (H_ - (z1 - z0) * k) / 2 };
      g.fillStyle = '#1c1a24'; g.fillRect(0, 0, W_, H_);
      g.fillStyle = '#25395a'; // the Loire: points below the water line, sampled coarsely
      for (let x = x0; x < x1; x += 12) for (let z = z0; z < z1; z += 12) if (groundH(x, z) < WATER_Y + 0.3) { const [px, py] = toMap(x, z); g.fillRect(px, py, 12 * k + 1, 12 * k + 1); }
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const r of W.roads) {
        if (!r.d) continue; g.strokeStyle = r.w >= 9 ? '#d8cfbf' : '#8f8796'; g.lineWidth = Math.max(1, r.w * k * 0.9);
        g.beginPath(); for (let i = 0; i < r.p.length; i += 2) { const [px, py] = toMap(r.p[i], r.p[i + 1]); if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
      }
      // (16 nov., user) the postcards on the map: a little card where one was found (click it to see it), « ? » where not yet
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const p of postcardSpots()) { const [px, py] = toMap(p.x, p.z);
        if (p.found) { g.save(); g.translate(px, py); g.rotate(-0.15); g.fillStyle = '#f6f0e2'; g.fillRect(-8, -6, 16, 12); g.strokeStyle = '#c41f2a'; g.lineWidth = 1.5; g.strokeRect(-8, -6, 16, 12); g.fillStyle = '#c41f2a'; g.fillRect(3, -4, 3, 3); g.restore(); }
        else { g.fillStyle = 'rgba(246,240,226,.25)'; g.beginPath(); g.arc(px, py, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f6f0e2'; g.font = 'bold 11px Arial, sans-serif'; g.fillText('?', px, py + 0.5); } }
      const c = locals[0] && locals[0].car;
      if (c) { const [px, py] = toMap(c.x, c.z); g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(px, py, 6, 0, Math.PI * 2); g.fill(); }
      g.font = 'bold 13px Arial, sans-serif'; g.textBaseline = 'middle';
      spots.forEach((s, i) => {
        const [px, py] = toMap(s.x, s.z), on = s === sel;
        g.fillStyle = on ? '#ff4fa3' : '#3a8aff'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, on ? 11 : 9, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(String(i + 1), px, py + 0.5);
        if (on) { g.textAlign = px > W_ - 160 ? 'right' : 'left'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; const tx = px + (g.textAlign === 'left' ? 15 : -15); g.strokeText(s.name, tx, py); g.fillText(s.name, tx, py); }
      });
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
      { const side = el.querySelector('.spSide'); side.innerHTML = '<b>Courses et défis</b> (balises bleues et orange) :<br>' + actRecords().map(r => (r.kind === 'race' ? '🏁 ' : '★ ') + r.name + ' : ' + (r.best || '—')).join('<br>');
        const pc = postcards(), nf = pc.filter(p => p.text).length, h = document.createElement('div'); h.style.marginTop = '12px'; h.innerHTML = '<b>Cartes postales</b> : ' + nf + ' / ' + pc.length + ' lieux découverts. Sur la carte : une petite carte là où tu l’as trouvée (clique pour la revoir), « ? » là où il en reste une.'; const cards = el.querySelector('.spCards'); cards.innerHTML = ''; cards.append(h); h.style.marginTop = '0'; postcardGallery(h); } // (16 nov., user) the postcards under the map, races and challenges on the right
      open = true; blocking = true; el.hidden = false; draw(null); list.firstChild.focus();
    }
    function close() { if (!open) return; open = false; blocking = false; el.hidden = true; try { renderer.domElement.focus(); } catch (e) { } }
    function choose(s) {
      const L = locals[0]; if (!L) return close();
      const n = nearestNodeTo(s.x, s.z), A = (G.adj[n] || []).filter(m => nodeOk(m)), dir = m => s.fx == null ? 0 : ((G.x[m] - G.x[n]) * (s.fx - G.x[n]) + (G.z[m] - G.z[n]) * (s.fz - G.z[n])) / (Math.hypot(G.x[m] - G.x[n], G.z[m] - G.z[n]) || 1);
      const nb = A.length ? A.reduce((b, m) => dir(m) > dir(b) ? m : b, A[0]) : G.adj[n] && G.adj[n][0];
      close();
      Busy.run(s.name, () => { placePlayer([s.x, s.z], s.fx != null ? [s.fx, s.fz] : nb != null ? [G.x[nb], G.z[nb]] : null); L.heat = 0; scatterRivals(170, 330); let k = 0; for (const r of rivals) r.calmT = 2 + 3 * k++; }); // (16 nov., user) the Rapaces start away from the new spot and come for the player within seconds
      flash(s.name, 'Conduite libre · G : changer de point de départ');
    }
    return { show, close, choose, get open() { return open; }, get spots() { return resolve(); }, rejects };
  })();
