  // =====================================================================================
  // the Garage de Chantenay: repairs, ammunition, upgrades, a new paint job that the police won't recognise
  // =====================================================================================
  const GARAGE = { x: 66, z: 108, name: 'Garage de Chantenay' }; // Dédé's: the real Garage Tribot's spot
  const GARAGES = [GARAGE]; let curGarage = GARAGE;
  let garageOpen = false, garageCool = 0, garageSel = 0;
  function buildGarageAt(G) {
    // nearest point of the boulevard: the forecourt marker sits there, the workshop beside it
    let best = null, bd = 1e9;
    for (const r of W.roads) { if (!r.d) continue; for (let i = 0; i < r.p.length; i += 2) { const d = Math.hypot(r.p[i] - G.x, r.p[i + 1] - G.z); if (d < bd) { bd = d; best = [r, i]; } } }
    const [r, i] = best, p = r.p, j = i + 2 < p.length ? i + 2 : i - 2;
    let ux = p[j] - p[i], uz = p[j + 1] - p[i + 1]; const l = Math.hypot(ux, uz) || 1; ux /= l; uz /= l; if (j < i) { ux = -ux; uz = -uz; }
    const side = (-uz * (G.x - p[i]) + ux * (G.z - p[i + 1])) >= 0 ? 1 : -1;
    const nx = -uz * side, nz = ux * side, off = r.w / 2;
    G.x = p[i] + nx * (off - 1.5); G.z = p[i + 1] + nz * (off - 1.5);
    const g = new THREE.Group(), y = surfaceH(G.x, G.z);
    const [sc, sg] = canvas(512, 96);
    sg.fillStyle = G.bg || '#1f3f91'; sg.fillRect(0, 0, 512, 96); sg.strokeStyle = '#f3ead8'; sg.lineWidth = 6; sg.strokeRect(6, 6, 500, 84);
    sg.fillStyle = G.fg || '#f2c81e'; sg.font = 'bold ' + (G.name.length > 20 ? 34 : 40) + 'px Arial, sans-serif'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.fillText(G.name.toUpperCase(), 256, 38);
    sg.fillStyle = '#f3ead8'; sg.font = 'bold 22px Arial, sans-serif'; sg.fillText(G.sub || 'MÉCANIQUE · CARROSSERIE · PEINTURE', 256, 72);
    const st = new THREE.CanvasTexture(sc); st.encoding = THREE.sRGBEncoding;
    const signM = new THREE.MeshStandardMaterial({ map: st, emissive: 0xffffff, emissiveMap: st, emissiveIntensity: 0.4, roughness: 0.5 });
    const post = new THREE.MeshStandardMaterial({ color: hd.lin(0x2a2a2e), roughness: 0.5, metalness: 0.6 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1, 0.12), [post, post, post, post, signM, signM]); sign.position.set(0, 5.2, 0); g.add(sign);
    for (const sx of [-2.4, 2.4]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8), post); pl.position.set(sx, 2.6, 0); pl.castShadow = true; g.add(pl); }
    // a petrol pump and a tyre stack for the look
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.7, 0.5), new THREE.MeshStandardMaterial({ color: hd.lin(0xc8202f), roughness: 0.4 })); pump.position.set(3.6, 0.85, 1.2); pump.castShadow = true; g.add(pump);
    const tyreM = new THREE.MeshStandardMaterial({ color: hd.lin(0x141414), roughness: 0.9 });
    for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.13, 8, 16).rotateX(Math.PI / 2), tyreM); t.position.set(-3.6, 0.14 + k * 0.26, 1.3); g.add(t); }
    g.position.set(G.x + nx * 2.2, y + 0.3, G.z + nz * 2.2); g.rotation.y = Math.atan2(nx, nz);
    g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize(g); scene.add(g); G.mesh = g;
    gridAdd([G.x + nx * 2.2 - 0.1, G.z + nz * 2.2, G.x + nx * 2.2 + 0.1, G.z + nz * 2.2], 0.4);
    const pad = addMarker(G.x, G.z, 4.2, 0x3a8aff); pad.garage = true; pad.beam.visible = false; markers.splice(markers.indexOf(pad), 1); G.pad = pad;
  }
  function buildGarage() {
    buildGarageAt(GARAGE);
    // the other real garages of the play area (OpenStreetMap): same services, their own sign
    const SIGNS = { 'Garage Auto 98': { sub: 'VÉHICULES D’OCCASION · ENTRETIEN', bg: '#b3121f', fg: '#f3ead8' } };
    for (const s of W.shops || []) {
      if (s.k !== 'garage' || Math.hypot(s.x - GARAGE.x, s.z - GARAGE.z) < 40 || Math.abs(s.x - CX) > HX - 10 || Math.abs(s.z - CZ) > HZ - 10) continue;
      if (typeof tramWall === 'function' && W.tram && s.z < tramWall(s.x) + 6) continue; // beyond the tram: out of reach
      const G = Object.assign({ x: s.x, z: s.z, name: s.n || 'Atelier mécanique', sub: 'RÉPARATIONS TOUTES MARQUES', bg: '#2a2a2e', fg: '#f2c81e', real: true }, SIGNS[s.n] || {});
      try { buildGarageAt(G); GARAGES.push(G); } catch (e) { console.warn('garage', s.n, e); }
    }
  }
  const UPG = [
    { k: 'repair', name: 'Réparation complète', desc: 'Carrosserie à 100 %', cost: () => 40 },
    { k: 'ammo', name: 'Plein de munitions', desc: '4 roquettes, 3 mines, 2 nitros', cost: () => 120 },
    { k: 'engine', name: 'Moteur gonflé', desc: 'Vitesse et reprise', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'armor', name: 'Blindage', desc: 'Encaisse mieux les coups', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'guns', name: 'Mitrailleuses', desc: 'Cadence et dégâts', max: 3, cost: l => [300, 600, 1000][l] },
    { k: 'paint', name: 'Peinture neuve', desc: 'Nouvelle couleur · la police perd ta trace', cost: () => 150 },
  ];
  const gEl = document.createElement('div'); gEl.id = 'garage'; gEl.hidden = true; document.body.append(gEl);
  const upg = () => settings.upg || (settings.upg = { engine: 0, armor: 0, guns: 0, paint: 0 });
  function applyUpgrades(L) {
    if (!L || (mode !== 'solo')) return;
    const u = upg(), c = L.car;
    c.maxV = (c.baseV || 44) * (1 + u.engine * 0.08); c.accK = (c.baseA || 1) * (1 + u.engine * 0.15); c.armor = 1 - u.armor * 0.15; L.gunK = u.guns;
  }
  function wallet(L) { return L.respect; }
  function openGarage(L) {
    garageOpen = true; blocking = true; garageSel = 0; L.car.vx = L.car.vz = 0; sfx.pick();
    renderGarage(L); gEl.hidden = false;
    say(curGarage === GARAGE ? ['Alors, qu’est-ce que je te fais ?', 'Entre, entre. On va arranger ça.', 'Encore toi ? Pose-la sur le pont.'][(R() * 3) | 0] : ['Bonjour ! C’est pour quoi ?', 'Posez-la là, on regarde ça.', 'Vous avez de la chance, on n’a personne.'][(R() * 3) | 0], { pitch: curGarage === GARAGE ? 0.75 : 1.1, cancel: true });
  }
  function closeGarage() { garageOpen = false; blocking = false; gEl.hidden = true; garageCool = 6; if (gx_onGarage) gx_onGarage(); }
  function renderGarage(L) {
    const u = upg();
    gEl.innerHTML = '<div class="card"><h2></h2><p class="gWallet">Respect à dépenser : <b>' + wallet(L) + '</b> · carrosserie ' + Math.round(L.car.hp) + ' %</p><div class="gList"></div><p class="fine">↑ ↓ choisir · Entrée ou A acheter · Échap ou B repartir</p><div class="menu"><button class="big gOut">Repartir</button></div></div>';
    gEl.querySelector('h2').textContent = curGarage.name;
    const list = gEl.querySelector('.gList');
    UPG.forEach((o, i) => {
      const lvl = u[o.k] || 0, maxed = o.max && lvl >= o.max, cost = maxed ? 0 : o.cost(lvl);
      const b = document.createElement('button'); b.className = 'mbtn gItem' + (i === garageSel ? ' sel' : '');
      b.innerHTML = '<b></b><span></span><em></em>';
      b.children[0].textContent = o.name + (o.max ? ' ' + '■'.repeat(lvl) + '□'.repeat(o.max - lvl) : '');
      b.children[1].textContent = o.desc; b.children[2].textContent = maxed ? 'au max' : cost + ' resp.';
      b.disabled = maxed || wallet(L) < cost;
      b.addEventListener('click', () => { garageSel = i; buy(L, o); });
      list.append(b);
    });
    gEl.querySelector('.gOut').addEventListener('click', closeGarage);
  }
  function buy(L, o) {
    const u = upg(), lvl = u[o.k] || 0; if (o.max && lvl >= o.max) return;
    const cost = o.cost(lvl); if (wallet(L) < cost) { sfx.hit(); return; }
    L.respect -= cost;
    if (o.k === 'repair') L.car.hp = 100;
    else if (o.k === 'ammo') { L.ammo = { rockets: 4, mines: 3, nitro: 2 }; }
    else if (o.k === 'paint') {
      u.paint = (u.paint + 1) % CAR_PAINTS.length; settings.cars = settings.cars || []; settings.cars[0] = Object.assign(settings.cars[0] || { s: L.car.style || 'saloon' }, { p: (((settings.cars[0] || {}).p ?? 0) + 1) % CAR_PAINTS.length });
      const [a, b] = CAR_PAINTS[settings.cars[0].p];
      const old = L.car.mesh; L.car.mesh = makeCar(a, b, true, L.car.style || 'saloon'); L.car.mesh.position.copy(old.position); L.car.mesh.rotation.copy(old.rotation); scene.remove(old);
      L.colour = '#' + new THREE.Color(a).getHexString(); L.heat = 0; L.calm = 0;
      for (const c of npcs) if (c.chase === L) { c.chase = null; c.ai = null; }
    } else u[o.k] = lvl + 1;
    saveSettings(); applyUpgrades(L); sfx.pick(); hd.shake(L.car.x, L.car.z, 0.25);
    renderGarage(L); saveBank(L);
  }
  function garageKey(e) {
    const L = locals[0]; if (!L) return;
    if (e.code === 'Escape' || e.code === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); closeGarage(); return; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { garageSel = (garageSel + 1) % UPG.length; renderGarage(L); e.preventDefault(); e.stopImmediatePropagation(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { garageSel = (garageSel + UPG.length - 1) % UPG.length; renderGarage(L); e.preventDefault(); e.stopImmediatePropagation(); }
    if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); buy(L, UPG[garageSel]); }
  }
  function garagePad() {
    const P = pads.find(p => p.gp); if (!P) return; const L = locals[0];
    if (P.press[13]) { garageSel = (garageSel + 1) % UPG.length; renderGarage(L); }
    if (P.press[12]) { garageSel = (garageSel + UPG.length - 1) % UPG.length; renderGarage(L); }
    if (P.press[0]) buy(L, UPG[garageSel]);
    if (P.press[1]) closeGarage();
  }
  // in solo and in the campaign, respect is money kept between sessions
  function saveBank(L) { if (mode === 'solo' && L && L.slot === 0) { settings.bank = L.respect; saveSettings(); } }

