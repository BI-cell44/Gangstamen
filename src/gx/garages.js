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
    try { workshop(G, g); } catch (e) { console.warn('atelier', G.name, e); }
  }
  // (cycle 12, user request) an open workshop you drive into: the menu opens inside, not on the forecourt. A free spot
  // 7 m by 11 m beside the street near the real garage (no building, no street, no wall, flat enough), door on the
  // street side with the roller shutter up; walls collide, the door opening stays free.
  function workshop(G, signGroup) {
    const WD = 7.4, DP = 11, cand = [];
    for (const r of W.roads) {
      if (!r.d || r.b) continue;
      for (let i = 0; i + 3 < r.p.length; i += 2) {
        const ax = r.p[i], az = r.p[i + 1], bx = r.p[i + 2], bz = r.p[i + 3], L = Math.hypot(bx - ax, bz - az); if (L < 1) continue;
        for (let s = 0; s <= L; s += 3) {
          const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L; if (Math.hypot(x - G.x, z - G.z) > 70) continue;
          for (const side of [1, -1]) cand.push({ x, z, ux: (bx - ax) / L, uz: (bz - az) / L, side, w: r.w, d: Math.hypot(x - G.x, z - G.z) });
        }
      }
    }
    cand.sort((a, b) => a.d - b.d);
    const near = buildingPolys.filter(b => { const p = b.p || b; return Math.hypot(p[0] - G.x, p[1] - G.z) < 160; });
    for (const c of cand) {
      const nx = -c.uz * c.side, nz = c.ux * c.side, d0 = c.w / 2 + 1.4; // inward normal (away from the street), door line just past the kerb
      const P = (u, v) => [c.x + c.ux * u + nx * (d0 + v), c.z + c.uz * u + nz * (d0 + v)];
      let ok = true, h0 = null, hmin = 1e9, hmax = -1e9;
      for (let u = -WD / 2; u <= WD / 2 && ok; u += 1.2) for (let v = 0; v <= DP && ok; v += 1.2) {
        const [x, z] = P(u, v); if (Math.abs(x - CX) > HX - 12 || Math.abs(z - CZ) > HZ - 12) ok = false;
        else if (v > 0.6 && roadEdge(x, z)[0] < 0.6) ok = false;
        else if (near.some(b => pointInPoly(x, z, b.p || b))) ok = false;
        else { const h = groundH(x, z); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); if (h < WATER_Y + 1.5) ok = false; }
      }
      if (!ok || hmax - hmin > 1.6) continue;
      for (const u of [-WD / 2 + 0.3, 0, WD / 2 - 0.3]) { const [x, z] = P(u, 0); if (segHit(x, z, nx, nz, DP) < DP) { ok = false; break; } } // no wall, tree or post inside
      if (!ok) continue;
      buildWorkshop(G, c, nx, nz, d0, WD, DP, hmax, signGroup); return true;
    }
    return false;
  }
  function buildWorkshop(G, c, nx, nz, d0, WD, DP, floorY, signGroup) {
    const ux = c.ux, uz = c.uz, ox = c.x + nx * d0, oz = c.z + nz * d0; // door centre
    const g = new THREE.Group(), a = Math.atan2(nx, nz); g.position.set(ox, floorY, oz); g.rotation.y = a; // local +z = into the workshop
    const M = (col, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: hd.lin(col), roughness: 0.85 }, o));
    const wall = M(0xd9d2c3), roofM = M(0x5a5f66, { metalness: 0.4, roughness: 0.5 }), floor = M(0x77736c), steel = M(0x8a8f96, { metalness: 0.6, roughness: 0.4 }), dark = M(0x26282c);
    const box = (w, h, d, m, x, y, z, cast = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; g.add(o); return o; };
    const H = 4.4, DOOR = 4.8;
    box(WD, 0.12, DP, floor, 0, 0.06, DP / 2, false);                       // slab, at the highest ground point
    box(WD, H, 0.25, wall, 0, H / 2, DP);                                   // back wall
    for (const s of [-1, 1]) box(0.25, H, DP, wall, s * WD / 2, H / 2, DP / 2); // side walls
    const pier = (WD - DOOR) / 2; for (const s of [-1, 1]) box(pier, H, 0.3, wall, s * (DOOR / 2 + pier / 2), H / 2, 0);
    box(WD, H - 3.4, 0.3, wall, 0, 3.4 + (H - 3.4) / 2, 0);                  // lintel over the 3.4 m high door
    box(WD + 0.5, 0.18, DP + 0.6, roofM, 0, H + 0.09, DP / 2);               // roof
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, DOOR, 12).rotateZ(Math.PI / 2), steel); roll.position.set(0, 3.25, 0.25); g.add(roll); // shutter rolled up
    box(DOOR, 0.08, 0.06, dark, 0, 3.38, 0.05);
    // inside: a two-post lift, a workbench, a tool board, tyres, a strip light
    for (const s of [-1, 1]) box(0.22, 3.0, 0.22, M(0x1f4fa0, { metalness: 0.3 }), s * 2.1, 1.5, 6.2);
    box(1.8, 0.9, 0.7, M(0x7a4a2a), WD / 2 - 1.1, 0.45, 9.4); box(1.8, 1.0, 0.04, M(0xc9b48a), WD / 2 - 1.1, 1.8, DP - 0.15);
    const tyreM = M(0x141414, { roughness: 0.95 }); for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.13, 8, 16).rotateX(Math.PI / 2), tyreM); t.position.set(-WD / 2 + 0.8, 0.14 + k * 0.26, 9.6); g.add(t); }
    const lamp = box(0.2, 0.06, 6, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.9, 2.6) }), 0, H - 0.1, DP / 2, false);
    const L_ = new THREE.PointLight(0xfff1d8, 1.2, 14, 2); L_.position.set(0, H - 0.6, DP / 2); g.add(L_);
    g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g);
    // the sign goes over the door, facing the street
    if (signGroup) { signGroup.position.set(ox - nx * 0.35, floorY + 0.3 - 0.8, oz - nz * 0.35); signGroup.rotation.y = a + Math.PI; signGroup.children.forEach(o => { if (o.geometry && o.geometry.type === 'CylinderGeometry') o.visible = false; }); }
    // collision: back, sides, door piers (the opening stays free)
    const W2 = WD / 2, Pt = (u, v) => [ox + ux * u + nx * v, oz + uz * u + nz * v];
    const seg = (a1, b1) => gridAdd([...Pt(...a1), ...Pt(...b1)], 3.5);
    seg([-W2, DP], [W2, DP]); seg([-W2, 0], [-W2, DP]); seg([W2, 0], [W2, DP]); seg([-W2, 0], [-DOOR / 2, 0]); seg([DOOR / 2, 0], [W2, 0]);
    G.door = Pt(0, -2); G.shop = { ox, oz, nx, nz, ux, uz, WD, DP };
    G.inside = car => { const dx = car.x - ox, dz = car.z - oz, v = dx * nx + dz * nz, u = dx * ux + dz * uz; return v > 3 && v < DP - 1.5 && Math.abs(u) < W2 - 0.8; };
    // the forecourt pad moves in front of the door (missions lead there)
    G.x = G.door[0]; G.z = G.door[1]; if (G.pad) G.pad.set(G.x, G.z);
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
  const UPG_BASE = [
    { k: 'repair', name: 'Réparation complète', desc: 'Carrosserie à 100 %', cost: () => 40 },
    { k: 'ammo', name: 'Plein de munitions', desc: '4 roquettes, 3 mines, 2 nitros', cost: () => 120 },
    { k: 'engine', name: 'Moteur gonflé', desc: 'Vitesse et reprise', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'armor', name: 'Blindage', desc: 'Encaisse mieux les coups', max: 3, cost: l => [250, 500, 900][l] },
    { k: 'guns', name: 'Mitrailleuses', desc: 'Cadence et dégâts', max: 3, cost: l => [300, 600, 1000][l] },
    { k: 'paint', name: 'Peinture neuve', desc: 'Nouvelle couleur · la police perd ta trace', cost: () => 150 },
  ];
  // (cycle 12) the full list: services, then this car's settings and looks, then the cars you own or can buy
  const CAR_PRICE = { saloon: 800, p205: 600, hatch: 700, r5: 500, twingo: 400, sport: 1500, van: 900, police: 1200 };
  const RIMS = [null, 0xd8a43c, 0x1d1d22, 0xf2f2ee, 0xb3121f];
  const activeCar = () => { settings.cars = settings.cars || []; return settings.cars[0] || (settings.cars[0] = { s: locals[0] ? locals[0].car.style || 'saloon' : 'saloon', p: 0 }); };
  const owned = () => { if (!settings.owned || !settings.owned.length) settings.owned = [JSON.parse(JSON.stringify(activeCar()))]; return settings.owned; };
  function keepActive() { const ac = activeCar(), o = owned(), i = o.findIndex(x => x.s === ac.s); if (i >= 0) o[i] = JSON.parse(JSON.stringify(ac)); else o.push(JSON.parse(JSON.stringify(ac))); }
  function rebuildCar(L) {
    const ac = activeCar(), [a, b] = CAR_PAINTS[ac.p ?? 0], col = ac.col != null ? ac.col : a, ch = CAR_CHOICES.find(o => o.k === ac.s) || CAR_CHOICES[0];
    const old = L.car.mesh; L.car.mesh = makeCar(col, b, true, ch.k, { rim: ac.rim ?? null, tint: !!ac.tint, spoiler: !!ac.spoiler });
    L.car.mesh.position.copy(old.position); L.car.mesh.rotation.copy(old.rotation); scene.remove(old);
    L.car.style = ch.k; L.car.baseV = 44 * ch.v; L.car.baseA = ch.a; L.car.tune = { ...(ac.tune || {}) }; L.car.phys = null;
    L.colour = '#' + new THREE.Color(col).getHexString();
  }
  function upgList() {
    const L = locals[0], ac = activeCar(), tune = ac.tune || (ac.tune = {}), own = owned();
    const tuneItem = (k, name, desc, costs) => ({ k: 't_' + k, name, desc, max: 3, lvl: () => tune[k] || 0, cost: l => costs[l], act: () => { tune[k] = (tune[k] || 0) + 1; L.car.tune = { ...tune }; } });
    const list = UPG_BASE.slice();
    list.push(
      tuneItem('gear', 'Boîte courte', 'Reprises plus vives, un peu moins de pointe', [200, 350, 500]),
      tuneItem('grip', 'Pneus sport', 'Plus d’adhérence en virage', [200, 350, 500]),
      tuneItem('brake', 'Freins renforcés', 'Freine plus court', [150, 250, 400]),
      { k: 'col', name: 'Couleur au choix', desc: 'Choisis la teinte de la carrosserie', cost: () => 100, picker: true, act: v => { ac.col = parseInt(v.slice(1), 16); rebuildCar(L); L.heat = 0; L.calm = 0; for (const c of npcs) if (c.chase === L) { c.chase = null; c.ai = null; } } },
      { k: 'rim', name: 'Jantes', desc: 'Change la couleur des jantes', cost: () => 60, act: () => { const i = RIMS.indexOf(ac.rim ?? null); ac.rim = RIMS[(i + 1) % RIMS.length]; rebuildCar(L); } },
      { k: 'tint', name: ac.tint ? 'Vitres claires' : 'Vitres teintées', desc: 'Vitres fumées années 90', cost: () => 80, act: () => { ac.tint = !ac.tint; rebuildCar(L); } },
      { k: 'spo', name: ac.spoiler ? 'Retirer l’aileron' : 'Aileron', desc: 'Aileron arrière couleur carrosserie', cost: () => (ac.spoiler ? 0 : 120), act: () => { ac.spoiler = !ac.spoiler; rebuildCar(L); } },
    );
    for (const ch of CAR_CHOICES) {
      if (ch.k === ac.s) continue;
      const has = own.find(o => o.s === ch.k);
      if (!has && !unlocked(ch.k)) { list.push({ k: 'lock_' + ch.k, name: ch.name + ' (verrouillée)', desc: 'Se débloque avec : ' + LOCK_TXT[ch.k], cost: () => 0, max: 1, lvl: () => 1 }); continue; }
      list.push({ k: 'car_' + ch.k, name: (has ? 'Prendre la ' : 'Acheter la ') + ch.name, desc: has ? 'Dans ton garage · ' + ch.d : ch.d, cost: () => (has ? 0 : CAR_PRICE[ch.k] || 600),
        act: () => { keepActive(); const o = owned(), c = o.find(x => x.s === ch.k) || { s: ch.k, p: ac.p ?? 0 }; if (!o.includes(c)) o.push(c); settings.cars[0] = JSON.parse(JSON.stringify(c)); rebuildCar(L); applyUpgrades(L); } });
    }
    return list;
  }
  let UPG = UPG_BASE;
  const gEl = document.createElement('div'); gEl.id = 'garage'; gEl.hidden = true; document.body.append(gEl);
  const upg = () => settings.upg || (settings.upg = { engine: 0, armor: 0, guns: 0, paint: 0 });
  function applyUpgrades(L) {
    if (!L || (mode !== 'solo')) return;
    const u = upg(), c = L.car;
    const t = c.tune || {}; // short gearbox: livelier, a little less top speed
    c.maxV = (c.baseV || 44) * (1 + u.engine * 0.08) * (1 - 0.025 * (t.gear || 0)); c.accK = (c.baseA || 1) * (1 + u.engine * 0.15) * (1 + 0.1 * (t.gear || 0)); c.armor = 1 - u.armor * 0.15; L.gunK = u.guns;
  }
  function wallet(L) { return L.respect; }
  function openGarage(L) {
    garageOpen = true; blocking = true; garageSel = 0; L.car.vx = L.car.vz = 0; sfx.pick();
    renderGarage(L); gEl.hidden = false;
    say(curGarage === GARAGE ? ['Alors, qu’est-ce que je te fais ?', 'Entre, entre. On va arranger ça.', 'Encore toi ? Pose-la sur le pont.'][(R() * 3) | 0] : ['Bonjour ! C’est pour quoi ?', 'Posez-la là, on regarde ça.', 'Vous avez de la chance, on n’a personne.'][(R() * 3) | 0], { pitch: curGarage === GARAGE ? 0.75 : 1.1, cancel: true });
  }
  function closeGarage() { garageOpen = false; blocking = false; gEl.hidden = true; garageCool = 6; if (gx_onGarage) gx_onGarage(); }
  function renderGarage(L) {
    const u = upg(); UPG = upgList();
    gEl.innerHTML = '<div class="card"><h2></h2><p class="gWallet">Respect à dépenser : <b>' + wallet(L) + '</b> · carrosserie ' + Math.round(L.car.hp) + ' %</p><div class="gList"></div><p class="fine">↑ ↓ choisir · Entrée ou A acheter · Échap ou B repartir</p><div class="menu"><button class="big gOut">Repartir</button></div></div>';
    gEl.querySelector('h2').textContent = curGarage.name;
    const list = gEl.querySelector('.gList');
    UPG.forEach((o, i) => {
      const lvl = o.lvl ? o.lvl() : u[o.k] || 0, maxed = o.max && lvl >= o.max, cost = maxed ? 0 : o.cost(lvl);
      const b = document.createElement('button'); b.className = 'mbtn gItem' + (i === garageSel ? ' sel' : '');
      b.innerHTML = '<b></b><span></span><em></em>';
      b.children[0].textContent = o.name + (o.max ? ' ' + '■'.repeat(lvl) + '□'.repeat(o.max - lvl) : '');
      b.children[1].textContent = o.desc; b.children[2].textContent = maxed ? 'au max' : cost + ' resp.';
      b.disabled = maxed || wallet(L) < cost;
      b.addEventListener('click', () => { garageSel = i; buy(L, o); });
      list.append(b);
      if (o.picker && i === garageSel) { // colour field under the selected "free colour" line
        const pk = document.createElement('input'); pk.type = 'color'; pk.className = 'gPick'; pk.value = '#' + new THREE.Color(activeCar().col ?? CAR_PAINTS[activeCar().p ?? 0][0]).getHexString();
        pk.addEventListener('change', () => buy(L, o, pk.value)); pk.addEventListener('keydown', e => e.stopPropagation()); list.append(pk);
      }
    });
    gEl.querySelector('.gOut').addEventListener('click', closeGarage);
    const sel = gEl.querySelector('.gItem.sel'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }
  function buy(L, o, val) {
    const u = upg(), lvl = o.lvl ? o.lvl() : u[o.k] || 0; if (o.max && lvl >= o.max) return;
    if (o.picker && val === undefined) { garageSel = UPG.indexOf(o); renderGarage(L); const pk = gEl.querySelector('.gPick'); if (pk) pk.click(); return; } // pick first, pay on change
    const cost = o.cost(lvl); if (wallet(L) < cost) { sfx.hit(); return; }
    L.respect -= cost;
    if (o.act) { o.act(val); keepActive(); saveSettings(); applyUpgrades(L); sfx.pick(); renderGarage(L); saveBank(L); return; }
    if (o.k === 'repair') L.car.hp = 100;
    else if (o.k === 'ammo') { L.ammo = { rockets: 4, mines: 3, nitro: 2 }; }
    else if (o.k === 'paint') {
      u.paint = (u.paint + 1) % CAR_PAINTS.length; settings.cars = settings.cars || []; settings.cars[0] = Object.assign(settings.cars[0] || { s: L.car.style || 'saloon' }, { p: (((settings.cars[0] || {}).p ?? 0) + 1) % CAR_PAINTS.length });
      delete settings.cars[0].col; rebuildCar(L); keepActive(); L.heat = 0; L.calm = 0;
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

