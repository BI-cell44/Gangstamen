  // ---------- mission HUD ----------
  const objEl = document.createElement('div'); objEl.id = 'objective'; objEl.className = 'hud'; objEl.hidden = true;
  objEl.innerHTML = '<div class="oTitle"></div><div class="oText"></div><div class="oBar" hidden><i></i></div><div class="oDir"><span class="oArrow">▲</span> <span class="oDist"></span></div>';
  document.body.append(objEl);
  function objective(title, text) { objEl.hidden = false; objEl.querySelector('.oTitle').textContent = title; objEl.querySelector('.oText').textContent = text; }
  function objBar(k) { const b = objEl.querySelector('.oBar'); if (k === null) { b.hidden = true; return; } b.hidden = false; b.firstChild.style.width = Math.round(Math.max(0, Math.min(1, k)) * 100) + '%'; }
  function objDir(x, z) { // arrow towards a point, relative to the car's heading
    const d = objEl.querySelector('.oDir'); if (x === null || !locals[0]) { d.hidden = true; return; }
    const c = locals[0].car, dx = x - c.x, dz = z - c.z, dist = Math.hypot(dx, dz);
    const a = Math.atan2(dx, -dz) + c.h; d.hidden = false;
    d.querySelector('.oArrow').style.transform = 'rotate(' + (a * 180 / Math.PI).toFixed(0) + 'deg)';
    d.querySelector('.oDist').textContent = dist < 15 ? 'ici' : Math.round(dist) + ' m';
  }

