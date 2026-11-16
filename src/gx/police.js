  // ---------- police ----------
  const heat = L => L.heat || 0;
  const stars = L => Math.min(5, Math.floor(heat(L)));
  function addHeat(by, amount, why) {
    const L = by && by.local ? by.owner : null; if (!L || mode === 'online' && false) return;
    if (!policeOn()) return;
    if (L.car && L.car.style === 'police') amount *= 0.5; // (cycle 13) in a police car, the others look away more often
    const before = stars(L); L.heat = Math.min(5.99, heat(L) + amount); L.calm = 0; L.unseen = 0;
    if (stars(L) > before) { flashFor(L, '★'.repeat(stars(L)) + ' POLICE', stars(L) === 1 ? (why || 'Les flics ont vu ça') : stars(L) >= 4 ? 'Toutes les patrouilles sur vous' : 'Renforts en route'); if (gx.dj) gx.dj('police', stars(L)); }
  }
  // (15 nov., user request) some offences are enough on their own for one star: running a pedestrian over, ramming or
  // shooting a police car
  function oneStar(by, amount, why) { const L = by && by.local ? by.owner : null; if (!L) return; addHeat(by, Math.max(amount, 1.02 - heat(L)), why); }
  function policeOn() { return !(mission && mission.noPolice); }
  // (user request) the real police station near the town hall (OpenStreetMap amenity=police, « Police nationale ») is
  // the base: patrols and reinforcements leave from its door when it is not right under the player's nose
  const HQ = { x: 170, z: -343, node: -1, built: false, cars: null };
  function hqNode(minD = 70, maxD = 520) {
    if (HQ.node < 0) { let bd = 1e18; for (let i = 0; i < G.x.length; i++) { if (!nodeOk(i) || !G.out[i].length) continue; const d = (G.x[i] - HQ.x) ** 2 + (G.z[i] - HQ.z) ** 2; if (d < bd) { bd = d; HQ.node = i; } } }
    const d = minPlayerDist(G.x[HQ.node], G.z[HQ.node]);
    return d > minD && d < maxD && !npcs.some(o => near(o, G.x[HQ.node], G.z[HQ.node]) < 10) ? HQ.node : -1;
  }
  function buildHQ() { // (15 nov.) the station itself dressed up: blue « POLICE NATIONALE » bands, flag, blue lamp,
    // and the sign post and two parked police cars in its forecourt (before: by a back street, away from the building)
    if (HQ.built || !hd) return; HQ.built = true; hqNode(-1, 1e9);
    const b = W.buildings.find(o => o.n === 'Police nationale'); if (!b) return;
    const p = b.p, n = p.length / 2; let cx = 0, cz = 0, gmin = 1e9, sa = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; cx += p[2 * i] / n; cz += p[2 * i + 1] / n; gmin = Math.min(gmin, groundH(p[2 * i], p[2 * i + 1])); sa += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; }
    const top = (b.b != null ? b.b : groundH(cx, cz)) + (b.h || 8); // top of the walls, as in city.js (the roof sits above)
    // the front: the wall that looks towards the boulevard de la Liberté
    let rx = cx - 30, rz = cz, rd = 1e18;
    for (const r of W.roads) if (/Libert/.test(W.names[r.n] || '')) for (let k = 0; k < r.p.length; k += 2) { const d = (r.p[k] - cx) ** 2 + (r.p[k + 1] - cz) ** 2; if (d < rd) { rd = d; rx = r.p[k]; rz = r.p[k + 1]; } }
    const [cv, cg] = canvas(1024, 128); cg.fillStyle = '#1b2f8a'; cg.fillRect(0, 0, 1024, 128); cg.fillStyle = '#ffffff'; cg.fillRect(0, 8, 1024, 6); cg.fillRect(0, 114, 1024, 6);
    cg.font = 'bold 70px Arial, sans-serif'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText('POLICE NATIONALE', 512, 66);
    const tx = new THREE.CanvasTexture(cv); tx.encoding = THREE.sRGBEncoding;
    const blue = new THREE.MeshStandardMaterial({ color: hd.lin(0x1b2f8a), roughness: 0.6 }), band = new THREE.MeshStandardMaterial({ map: tx, emissive: 0xffffff, emissiveMap: tx, emissiveIntensity: 0.3, roughness: 0.5 });
    const post = new THREE.MeshStandardMaterial({ color: hd.lin(0x2a2a2e), roughness: 0.5, metalness: 0.6 }), g = new THREE.Group();
    let front = null, fd = -2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = p[2 * i], az = p[2 * i + 1], bx = p[2 * j], bz = p[2 * j + 1], L = Math.hypot(bx - ax, bz - az); if (L < 4) continue;
      let nx = (bz - az) / L, nz = -(bx - ax) / L; if (sa < 0) { nx = -nx; nz = -nz; } // outward
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, w = Math.min(L - 0.8, 9), dl = Math.hypot(rx - mx, rz - mz) || 1, f = (nx * (rx - mx) + nz * (rz - mz)) / dl;
      if (f > fd) { fd = f; front = { mx, mz, nx, nz, ux: (bx - ax) / L, uz: (bz - az) / L, L }; }
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.12), [blue, blue, blue, blue, band, blue]);
      m.position.set(mx + nx * 0.1, top - 1.1, mz + nz * 0.1); m.rotation.y = Math.atan2(nx, nz); g.add(m);
    }
    if (front) {
      const { mx, mz, nx, nz, ux, uz } = front;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.6, 4) })); lamp.position.set(mx + nx * 0.35, top - 2.1, mz + nz * 0.35); g.add(lamp);
      // flag on the roof edge above the door
      const fx = mx - nx * 1.2, fz = mz - nz * 1.2, pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 8), post); pole.position.set(fx, top + 2, fz); g.add(pole);
      const [fc, fg] = canvas(96, 64); fg.fillStyle = '#1d3f9a'; fg.fillRect(0, 0, 32, 64); fg.fillStyle = '#ffffff'; fg.fillRect(32, 0, 32, 64); fg.fillStyle = '#d42a2a'; fg.fillRect(64, 0, 32, 64);
      const ft = new THREE.CanvasTexture(fc); ft.encoding = THREE.sRGBEncoding;
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, roughness: 0.8 })); flag.position.set(fx + ux * 0.78, top + 3.45, fz + uz * 0.78); flag.rotation.y = Math.atan2(nx, nz); g.add(flag);
      // sign post in the forecourt, and two police cars parked side by side facing the station
      const sx = mx + nx * 3 + ux * (front.L / 2 - 1), sz = mz + nz * 3 + uz * (front.L / 2 - 1), sy = surfaceH(sx, sz);
      const [cv2, cg2] = canvas(512, 128); cg2.fillStyle = '#1b2f8a'; cg2.fillRect(0, 0, 512, 128); cg2.strokeStyle = '#ffffff'; cg2.lineWidth = 6; cg2.strokeRect(6, 6, 500, 116);
      cg2.fillStyle = '#ffffff'; cg2.font = 'bold 54px Arial, sans-serif'; cg2.textAlign = 'center'; cg2.textBaseline = 'middle'; cg2.fillText('POLICE', 256, 46); cg2.font = 'bold 30px Arial, sans-serif'; cg2.fillText('NATIONALE', 256, 96);
      const t2 = new THREE.CanvasTexture(cv2); t2.encoding = THREE.sRGBEncoding; const sm = new THREE.MeshStandardMaterial({ map: t2, emissive: 0xffffff, emissiveMap: t2, emissiveIntensity: 0.35, roughness: 0.5 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.75, 0.1), [post, post, post, post, sm, sm]); sign.position.set(sx, sy + 3.2, sz); sign.rotation.y = Math.atan2(nx, nz); g.add(sign);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), post); pl.position.set(sx, sy + 1.6, sz); pl.castShadow = true; g.add(pl);
      gridAdd([sx - 0.1, sz, sx + 0.1, sz], 0.4);
      // (16 nov.) two clear spots in the forecourt, side by side, nearest the door: before, one stood half inside a building
      const inB = (x, z) => buildingPolys.some(o => pointInPoly(x, z, o.p || o));
      const clear = (a, o) => [[-2.4, -1], [-2.4, 1], [2.4, -1], [2.4, 1], [0, 0]].every(([d, c]) => !inB(mx + nx * (o + d) + ux * (a + c), mz + nz * (o + d) + uz * (a + c)));
      const cand = []; for (let a = -8; a <= 8; a += 0.8) for (let o = 3.6; o <= 9; o += 0.6) cand.push([a, o]);
      cand.sort((p, q) => Math.abs(p[0]) + p[1] - Math.abs(q[0]) - q[1]);
      const picked = []; for (const [a, o] of cand) { if (picked.length === 2) break; if (picked.some(([b]) => Math.abs(b - a) < 2.8) || !clear(a, o)) continue; picked.push([a, o]); }
      HQ.cars = [];
      for (const [a, off] of picked) {
        const m = makeCar(0xeef0f2, 0x1b2f8a, false, 'saloon', { guns: false, police: true }), px = mx + nx * off + ux * a, pz = mz + nz * off + uz * a;
        m.position.set(px, surfaceH(px, pz) + 0.34, pz); m.rotation.y = Math.atan2(nx, nz); scene.add(m);
        HQ.cars.push([Math.round(px * 10) / 10, Math.round(pz * 10) / 10]);
        gridAdd([px - nx * 2, pz - nz * 2, px + nx * 2, pz + nz * 2], 3.5);
      }
    }
    g.traverse(o => { o.userData.hdLinear = true; }); scene.add(g);
  }
  // (16 nov., user) roadblocks at four stars and more: two police cars parked across a street the player is heading for,
  // 120 to 220 m ahead, a little apart so a careful driver squeezes through and a fast one hits them; they stay put
  function roadblock(L) {
    const c = L.car, v = Math.hypot(c.vx, c.vz); if (v < 6) return;
    const ux = c.vx / v, uz = c.vz / v; let best = -1, bs = -1e9;
    for (let k = 0; k < 60; k++) { const n = (R() * G.x.length) | 0; if (!nodeOk(n) || G.adj[n].length !== 2) continue;
      const dx = G.x[n] - c.x, dz = G.z[n] - c.z, d = Math.hypot(dx, dz); if (d < 120 || d > 220) continue;
      const along = (dx * ux + dz * uz) / d; if (along < 0.75) continue;
      if (npcs.some(o => o.block && Math.hypot(o.x - G.x[n], o.z - G.z[n]) < 80)) continue;
      if (along > bs) { bs = along; best = n; } }
    if (best < 0) return;
    const a = G.adj[best][0], b = G.adj[best][1], ex = G.x[b] - G.x[a], ez = G.z[b] - G.z[a], el = Math.hypot(ex, ez) || 1, px = -ez / el, pz = ex / el;
    for (const s of [-1, 1]) { const o = makeNpc('cop'), x = G.x[best] + px * s * 2.6, z = G.z[best] + pz * s * 2.6;
      o.place(x, z, Math.atan2(-px * s, -pz * s) + 0.35 * s); o.block = L; o.blockT = 70; o.lost = 0; o.fireCd = 2; npcs.push(o); }
    if (L) flashFor(L, 'Barrage de police', 'Ils bloquent la rue devant toi');
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

