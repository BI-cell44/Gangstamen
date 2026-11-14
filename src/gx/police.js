  // ---------- police ----------
  const heat = L => L.heat || 0;
  const stars = L => Math.min(5, Math.floor(heat(L)));
  function addHeat(by, amount, why) {
    const L = by && by.local ? by.owner : null; if (!L || mode === 'online' && false) return;
    if (!policeOn()) return;
    if (L.car && L.car.style === 'police') amount *= 0.5; // (cycle 13) in a police car, the others look away more often
    const before = stars(L); L.heat = Math.min(5.99, heat(L) + amount); L.calm = 0;
    if (stars(L) > before) { flashFor(L, '★'.repeat(stars(L)) + ' POLICE', stars(L) === 1 ? 'Les flics ont vu ça' : stars(L) >= 4 ? 'Toutes les patrouilles sur vous' : 'Renforts en route'); if (gx.dj) gx.dj('police', stars(L)); }
  }
  function policeOn() { return !(mission && mission.noPolice); }
  // (user request) the real police station near the town hall (OpenStreetMap amenity=police, « Police nationale ») is
  // the base: patrols and reinforcements leave from its door when it is not right under the player's nose
  const HQ = { x: 170, z: -343, node: -1, built: false };
  function hqNode(minD = 70, maxD = 520) {
    if (HQ.node < 0) { let bd = 1e18; for (let i = 0; i < G.x.length; i++) { if (!nodeOk(i) || !G.out[i].length) continue; const d = (G.x[i] - HQ.x) ** 2 + (G.z[i] - HQ.z) ** 2; if (d < bd) { bd = d; HQ.node = i; } } }
    const d = minPlayerDist(G.x[HQ.node], G.z[HQ.node]);
    return d > minD && d < maxD && !npcs.some(o => near(o, G.x[HQ.node], G.z[HQ.node]) < 10) ? HQ.node : -1;
  }
  function buildHQ() { // a sign on a post, a blue lamp and two parked police cars in front of the station
    if (HQ.built || !hd) return; HQ.built = true; hqNode(-1, 1e9);
    const nx = G.x[HQ.node], nz = G.z[HQ.node], dx = HQ.x - nx, dz = HQ.z - nz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L; // from the street towards the building
    const sx = nx + ux * Math.min(L - 3, 7), sz = nz + uz * Math.min(L - 3, 7), y = surfaceH(sx, sz), g = new THREE.Group();
    const [cv, cg] = canvas(512, 128); cg.fillStyle = '#1b2f8a'; cg.fillRect(0, 0, 512, 128); cg.strokeStyle = '#ffffff'; cg.lineWidth = 6; cg.strokeRect(6, 6, 500, 116);
    cg.fillStyle = '#ffffff'; cg.font = 'bold 54px Arial, sans-serif'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText('POLICE', 256, 46); cg.font = 'bold 30px Arial, sans-serif'; cg.fillText('NATIONALE', 256, 96);
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
    const post = new THREE.MeshStandardMaterial({ color: hd.lin(0x2a2a2e), roughness: 0.5, metalness: 0.6 }), sm = new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.35, roughness: 0.5 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.75, 0.1), [post, post, post, post, sm, sm]); sign.position.y = 3.2; g.add(sign);
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), post); pl.position.y = 1.6; pl.castShadow = true; g.add(pl);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.6, 4) })); lamp.position.y = 3.75; g.add(lamp);
    g.position.set(sx, y, sz); g.rotation.y = Math.atan2(-ux, -uz); g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g);
    gridAdd([sx - 0.1, sz, sx + 0.1, sz], 0.4);
    for (const k of [-1, 1]) { // parked along the kerb, nose to tail
      const m = makeCar(0xeef0f2, 0x1b2f8a, false, 'saloon', { guns: false, police: true }), px = nx + ux * 4.2 + uz * k * 3.2, pz = nz + uz * 4.2 - ux * k * 3.2;
      m.position.set(px, surfaceH(px, pz) + 0.34, pz); m.rotation.y = Math.atan2(uz, -ux); scene.add(m);
      gridAdd([px - uz * 2, pz + ux * 2, px + uz * 2, pz - ux * 2], 3.5);
    }
  }
  function spawnCop(L) {
    let n = R() < 0.6 ? hqNode() : -1; if (n < 0) n = spawnNode(110, 220); if (n < 0) return; // from the station when possible
    const c = makeNpc('cop'); placeOnGraph(c, n); c.ai = { mode: 'hunt' }; c.chase = L; c.lost = 0; c.fireCd = 1; npcs.push(c);
  }
  // patrol: a police car that drives like the traffic until it sees a Rapace (or the player gets wanted)
  function spawnPatrol() {
    let n = R() < 0.6 ? hqNode(90, 600) : -1; if (n < 0) n = spawnNode(120, 240); if (n < 0) return;
    const c = makeNpc('cop'); placeOnGraph(c, n); c.lost = 0; c.fireCd = 1; c.lookT = 0; npcs.push(c);
  }
  function patrolLook(c, dt) {
    if (c.prey && (!c.prey.alive || c.prey.gone || c.lost > 8)) { c.prey = null; c.ai = null; }
    if (c.prey || (c.lookT -= dt) > 0) return; c.lookT = 0.5;
    for (const r of rivals) {
      if (!r.alive || r.gone || r.proxy || r.friendly) continue; const d = near(c, r.x, r.z); if (d > 75) continue;
      if (segHit(c.x, c.z, (r.x - c.x) / d, (r.z - c.z) / d, d) >= d - 0.5) { c.prey = r; c.lost = 0; c.ai = { mode: 'hunt' }; if (minPlayerDist(c.x, c.z) < 90 && gx.dj) gx.dj('copRap'); return; }
    }
  }
  // the police cars after a given Rapace: the Rapace fights back (read by rivalInput)
  const copsOn = r => npcs.filter(c => c.npc === 'cop' && c.prey === r && c.alive);
  function copInput(c, dt) {
    const L = c.chase;
    if (L && (stars(L) < 1 || !L.car.alive)) { c.ai = null; c.chase = null; }
    if (!c.chase && !c.prey) return civInput(c, dt);
    const T = c.chase ? c.chase.car : c.prey, d = near(c, T.x, T.z);
    const los = d < 120 && segHit(c.x, c.z, (T.x - c.x) / d, (T.z - c.z) / d, d) >= d - 0.5;
    if (los && d < 90) { c.lost = 0; if (L) L.calm = 0; } else c.lost += dt;
    const tx = T.x + T.vx * Math.min(1.2, d / 30), tz = T.z + T.vz * Math.min(1.2, d / 30);
    let gx_ = tx, gz = tz;
    if (!los && d > 25) { // follow the streets towards the player
      const n0 = c.nav.b; let best = n0, bd = Math.hypot(G.x[n0] - T.x, G.z[n0] - T.z);
      if (Math.hypot(G.x[n0] - c.x, G.z[n0] - c.z) < 7) {
        for (const nb of G.adj[n0]) { const dd = Math.hypot(G.x[nb] - T.x, G.z[nb] - T.z); if (dd < bd || best === n0) { bd = dd; best = nb; } }
        c.nav.a = n0; c.nav.b = best;
      }
      gx_ = G.x[c.nav.b]; gz = G.z[c.nav.b];
    }
    const diff = wrapA(heading(c.x, c.z, gx_, gz) - c.h);
    const s = Math.max(-1, Math.min(1, diff * 2.4));
    let t = Math.abs(diff) > 1.3 ? 0.5 : 1;
    const nv = c.nav;
    if (nv.back > 0) { nv.back -= dt; return { t: -1, s: -s, hb: false }; }
    if (c.speed < 1.2) { nv.stuck += dt; if (nv.stuck > 1.4) { nv.back = 1; nv.stuck = 0; } } else nv.stuck = 0;
    c.fireCd -= dt;
    if ((c.prey || stars(L) >= 3) && los && d < 55 && Math.abs(diff) < 0.2 && c.fireCd <= 0) { c.fireCd = 0.22; shoot(c, [T], c.prey ? 2 : 1.3, 60, 0.12, true); }
    return { t, s, hb: Math.abs(diff) > 1.1 && c.speed > 12 };
  }

