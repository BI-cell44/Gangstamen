  // =====================================================================================
  // breakable street furniture: bus shelters, bins, benches (real positions from OpenStreetMap where we have them)
  // =====================================================================================
  const furniture = [];
  function buildFurniture() {
    const list = (W.furniture || []).slice();
    // add bins and benches along the main streets where the map has none
    let k = 0;
    for (const r of W.roads) {
      if (!r.d || r.b || r.w < 9) continue;
      const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1], l = Math.hypot(dx, dz); if (l < 30) continue;
        const side = (k++ % 2) ? 1 : -1, ux = dx / l, uz = dz / l, off = r.w / 2 + 1.0;
        list.push({ t: k % 3 === 0 ? 'bench' : 'bin', x: p[i] + ux * l * 0.5 - uz * off * side, z: p[i + 1] + uz * l * 0.5 + ux * off * side, a: Math.atan2(-uz * side, ux * side) });
      }
    }
    const M = {
      metal: new THREE.MeshStandardMaterial({ color: hd.lin(0x2f5a3a), roughness: 0.5, metalness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: hd.lin(0x8ab0c0), roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 }),
      bin: new THREE.MeshStandardMaterial({ color: hd.lin(0x2a6a3a), roughness: 0.55, metalness: 0.2 }),
      wood: new THREE.MeshStandardMaterial({ color: hd.lin(0x7a5232), roughness: 0.75 }),
      ad: null,
    };
    const [ac, ag] = canvas(128, 256); const gr = ag.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ff8a3d'); gr.addColorStop(1, '#e2337a'); ag.fillStyle = gr; ag.fillRect(0, 0, 128, 256);
    ag.fillStyle = '#fff'; ag.font = 'bold 26px Arial'; ag.textAlign = 'center'; ag.fillText('CHANTENAY', 64, 60); ag.fillText('FM 92.4', 64, 95); ag.font = 'bold 17px Arial'; ag.fillText('LA RADIO', 64, 200); ag.fillText('DU QUARTIER', 64, 222);
    const at = new THREE.CanvasTexture(ac); at.encoding = THREE.sRGBEncoding; M.ad = new THREE.MeshStandardMaterial({ map: at, emissive: 0xffffff, emissiveMap: at, emissiveIntensity: 0.5, roughness: 0.3 });
    for (const f of list) {
      if (Math.abs(f.x - CX) > HX - 4 || Math.abs(f.z - CZ) > HZ - 4 || groundH(f.x, f.z) < WATER_Y + 1) continue;
      if (roadEdge(f.x, f.z)[0] < 0.4) continue; // not on the carriageway
      const g = new THREE.Group(), parts = [];
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); parts.push(o); return o; };
      if (f.t === 'shelter') {
        add(new THREE.BoxGeometry(3.4, 0.08, 1.5), M.metal, 0, 2.4, 0);
        add(new THREE.BoxGeometry(3.3, 2.1, 0.04), M.glass, 0, 1.25, -0.7);
        add(new THREE.BoxGeometry(0.04, 2.1, 1.3), M.glass, -1.65, 1.25, 0);
        add(new THREE.BoxGeometry(1.1, 1.9, 0.12), M.ad, 1.65, 1.2, 0);
        for (const sx of [-1.65, 1.65]) add(new THREE.BoxGeometry(0.08, 2.4, 0.08), M.metal, sx, 1.2, -0.7);
        add(new THREE.BoxGeometry(1.6, 0.06, 0.4), M.wood, -0.3, 0.5, -0.45);
      } else if (f.t === 'bench') {
        add(new THREE.BoxGeometry(1.8, 0.06, 0.45), M.wood, 0, 0.45, 0); add(new THREE.BoxGeometry(1.8, 0.4, 0.05), M.wood, 0, 0.75, -0.22);
        for (const sx of [-0.8, 0.8]) add(new THREE.BoxGeometry(0.06, 0.45, 0.45), M.metal, sx, 0.22, 0);
      } else {
        add(new THREE.CylinderGeometry(0.3, 0.26, 0.85, 12), M.bin, 0, 0.6, 0); add(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), M.metal, 0, 0.5, -0.32);
      }
      if (f.a === undefined) { const [, nx, nz] = roadEdge(f.x, f.z); f.a = Math.atan2(-nx, -nz); } // open side towards the street
      g.position.set(f.x, surfaceH(f.x, f.z) + 0.2, f.z); g.rotation.y = f.a;
      g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize(g); Batch.add(g); // drawn as instances until knocked over
      furniture.push({ g, parts, x: f.x, z: f.z, r: f.t === 'shelter' ? 2 : f.t === 'bench' ? 1.1 : 0.6, broken: false, t: 0, kind: f.t });
    }
  }
  function breakFurniture(f, fromX, fromZ, speed = 12) {
    f.broken = true; f.t = 0; Batch.hide(f.g); // the real pieces take over for the fall
    for (const o of f.parts) { const a = Math.atan2(f.z - fromZ, f.x - fromX) + (R() - 0.5) * 1.2, s = speed * (0.4 + R() * 0.6);
      o.userData.v = [Math.cos(a) * s, 3 + R() * 5, Math.sin(a) * s, (R() - 0.5) * 10, (R() - 0.5) * 10]; }
    if (f.kind === 'shelter') { for (let i = 0; i < 20 * 1; i++) hd.spark(f.x, surfaceH(f.x, f.z) + 1.5, f.z, (R() - 0.5) * 8, 2 + R() * 4, (R() - 0.5) * 8, 0.6); }
    sfx.hit();
  }
  function furnitureStep(dt) {
    for (const f of furniture) {
      if (!f.broken) {
        for (const c of allPlayerCars().concat(rivals, npcs, extras)) {
          if (!c.alive || c.remote) continue;
          if (Math.abs(c.x - f.x) > 4 || Math.abs(c.z - f.z) > 4) continue;
          if (Math.hypot(c.x - f.x, c.z - f.z) < f.r + 1.4) { breakFurniture(f, c.x, c.z, Math.max(6, c.speed)); c.vx *= 0.85; c.vz *= 0.85; if (c.local) { L_resp(c, 5); } break; }
        }
        continue;
      }
      f.t += dt;
      if (f.t < 4) for (const o of f.parts) { const v = o.userData.v; v[1] -= 20 * dt; o.position.x += v[0] * dt * Math.cos(-f.g.rotation.y) - v[2] * dt * Math.sin(-f.g.rotation.y); o.position.z += v[0] * dt * Math.sin(-f.g.rotation.y) + v[2] * dt * Math.cos(-f.g.rotation.y); o.position.y = Math.max(0.05, o.position.y + v[1] * dt); if (o.position.y <= 0.05) { v[0] *= 0.8; v[2] *= 0.8; v[1] = Math.abs(v[1]) * 0.2; } o.rotation.x += v[3] * dt * (o.position.y > 0.1 ? 1 : 0); o.rotation.z += v[4] * dt * (o.position.y > 0.1 ? 1 : 0); }
      if (f.t > 40) { // the council puts it back
        let clear = true; for (const c of players()) if (Math.hypot(c.x - f.x, c.z - f.z) < 60) clear = false;
        if (clear) { f.broken = false; f.parts.forEach(o => { o.position.copy(o.userData.p0); o.rotation.set(0, 0, 0); }); Batch.show(f.g); }
      }
    }
  }
  function finishFurniture() { furnitureBuilt = true; for (const f of furniture) f.parts.forEach(o => { o.userData.p0 = o.position.clone(); }); Batch.build(); }
  const L_resp = (c, n) => { if (c.owner && !Match.over) c.owner.respect += n; };


