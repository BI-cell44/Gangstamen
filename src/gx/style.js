  // ---------- (21 nov.) driving with style pays: near misses, big jumps, KO streaks, losing the police ----------
  // Small sums of respect for the risks the player takes, announced in a line under the big messages (popStyle), so the
  // screen does not fill with titles. Solo and split screen; online, only the player's own respect moves.
  function popStyle(L, text, pts) {
    L.respect += pts; saveBank(L); if (L.slot === 0) sfx.style();
    let el = $('stylePop');
    if (!el) { el = document.createElement('div'); el.id = 'stylePop'; el.className = 'hud'; document.body.append(el); }
    if (locals.length > 1) { flashFor(L, '+' + pts, text); return; }
    const s = document.createElement('div'); s.textContent = text + '  +' + pts; el.append(s);
    while (el.children.length > 3) el.firstChild.remove();
    setTimeout(() => s.remove(), 2200);
  }
  const missT = new WeakMap();
  function styleStep(dt) {
    const now = performance.now();
    for (const L of locals) {
      const c = L.car; if (!c.alive || c.sink > 0) { L._air = 0; continue; }
      // a jump: time in the air, paid on a clean landing (not on the roof, not into the water)
      if ((c.air || 0) > 0.25) L._air = (L._air || 0) + dt;
      else if (L._air) { const t = L._air; L._air = 0; if (t > 0.9 && c.hp > 0) popStyle(L, t > 1.8 ? 'Envol monumental !' : t > 1.3 ? 'Beau saut' : 'Saut', Math.round(t * 40)); }
      // a near miss: a civilian or police car passed within a metre and a half at speed, without touching
      if (c.speed > 20) for (const o of npcs) {
        if (!o.alive || o.mesh && !o.mesh.visible) continue;
        const dx = o.x - c.x, dz = o.z - c.z; if (dx * dx + dz * dz > 16) continue;
        const [fx, fz] = c.fwd, side = Math.abs(dx * fz - dz * fx), along = dx * fx + dz * fz;
        if (side > 1.9 && side < 3.4 && Math.abs(along) < 1.5 && now - (missT.get(o) || 0) > 6000 && now - (L._hitT || 0) > 1500) { missT.set(o, now); popStyle(L, o.npc === 'cop' ? 'Frôlé la police !' : 'Frôlé !', o.npc === 'cop' ? 40 : 20); }
      }
      if ((L.heat || 0) >= 1) L.peakStars = Math.max(L.peakStars || 0, stars(L));
    }
  }
  // called by police.js when the police give up: the more stars, the more respect
  function escaped(L) { const n = Math.max(1, L.peakStars || 1); L.peakStars = 0; L.escN = (L.escN || 0) + 1; popStyle(L, 'Police semée ' + '★'.repeat(n), 60 * n); }
