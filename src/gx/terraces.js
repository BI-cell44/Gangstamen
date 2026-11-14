  // ---------- café terraces: tables, chairs, parasols and their customers ----------
  const customers = [];
  function buildTerraces() {
    if (!W.shops) return;
    const tableM = stdM2(0xe8e2d0, 0.5, 0.2), metal = stdM2(0x2a2a2e, 0.5, 0.6), chairM = stdM2(0x8a5a32, 0.7);
    const PARA = [[0xc8202f, 0xf3ead8], [0x1f3f91, 0xf3ead8], [0x2b6b3a, 0xf2c81e], [0xe86a1a, 0xf3ead8]];
    const paraMats = PARA.map(([a, b]) => { const [c, g] = canvas(256, 16); for (let k = 0; k < 16; k++) { g.fillStyle = '#' + new THREE.Color(k % 2 ? b : a).getHexString(); g.fillRect(k * 16, 0, 16, 16); }
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide }); });
    const free = (x, z) => roadEdge(x, z)[0] > 0.5 && !buildingPolys.some(b => pointInPoly(x, z, b.p || b));
    W.shops.forEach((sh, si) => {
      if (sh.k !== 'cafe' && sh.k !== 'restaurant') return;
      if (Math.abs(sh.x - CX) > HX - 5 || Math.abs(sh.z - CZ) > HZ - 5) return;
      const [d, nx, nz] = roadEdge(sh.x, sh.z); if (d > 14 || d < 2.2) return;
      const k = Math.max(1, d - 1.7), cx = sh.x - nx * k, cz = sh.z - nz * k, ux = -nz, uz = nx;
      const spots = [-2.4, 0, 2.4].map(o => [cx + ux * o, cz + uz * o]).filter(([x, z]) => free(x, z) && free(x + ux * 0.9, z + uz * 0.9) && free(x - ux * 0.9, z - uz * 0.9));
      const pm = paraMats[si % paraMats.length];
      spots.slice(0, si % 3 === 0 ? 3 : 2).forEach(([x, z], ti) => {
        const g = new THREE.Group(), parts = [];
        const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; g.add(o); parts.push(o); return o; };
        add(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), tableM, 0, 0.74, 0); add(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 6), metal, 0, 0.36, 0); add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), metal, 0, 0.02, 0);
        const cup = add(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 8), stdM2(0xf3ead8, 0.3), 0.12, 0.8, 0.05);
        add(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), metal, 0, 1.15, 0);
        const para = add(new THREE.ConeGeometry(1.25, 0.5, 16, 1, true), pm, 0, 2.35, 0); para.castShadow = true;
        const seats = [];
        for (const side of [-1, 1]) {
          const chx = side * 0.72;
          add(new THREE.BoxGeometry(0.42, 0.04, 0.42), chairM, chx, 0.45, 0); add(new THREE.BoxGeometry(0.04, 0.45, 0.42), chairM, chx + side * 0.2, 0.68, 0);
          for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) add(new THREE.BoxGeometry(0.03, 0.45, 0.03), metal, chx + lx, 0.22, lz);
          seats.push(side);
        }
        const a = Math.atan2(ux, uz); // table row along the facade; chairs on either side along it
        g.position.set(x, surfaceH(x, z) + 0.2, z); g.rotation.y = a - Math.PI / 2;
        g.traverse(o => { o.userData.hdLinear = true; }); hd.linearize(g); scene.add(g);
        const f = { g, parts, x, z, r: 0.9, broken: false, t: 0, kind: 'table' }; furniture.push(f);
        // one or two customers, facing the table
        for (const side of seats) {
          if (R() < 0.3) continue;
          const lx = side * 0.72, ca = g.rotation.y, wx = x + Math.cos(ca) * lx, wz = z - Math.sin(ca) * lx;
          customers.push(Object.assign(look(), { x: wx, z: wz, y: g.position.y + 0.06, h: ca + (side > 0 ? -Math.PI / 2 : Math.PI / 2), table: f, state: 'sit', timer: 0, phase: R() * 10, drink: 3 + R() * 8, talk: R() < 0.6, look_: 0 }));
        }
      });
    });
  }
  const stdM2 = (c, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: hd.lin(c), roughness: r, metalness: m });
  function customerStep(c, dt) {
    // sit -> (a car comes) flee -> back to the chair -> sit; a car that reaches them knocks them over
    const t = performance.now() / 1000 + c.phase;
    c.ox = c.ox || 0; c.oz = c.oz || 0;
    const px = c.x + c.ox, pz = c.z + c.oz;
    if (c.state !== 'down') for (const car of [...allPlayerCars(), ...rivals, ...npcs, ...extras]) {
      if (!car.alive) continue;
      const dx = px - car.x, dz = pz - car.z; if (Math.abs(dx) > 10 || Math.abs(dz) > 10) continue;
      const d = Math.hypot(dx, dz);
      if (d < 2.1 && car.speed > 2) { // hit: knocked over and pushed along the car's way
        const vx = car.vx / car.speed, vz = car.vz / car.speed, k = Math.min(3.5, 0.8 + car.speed * 0.12);
        c.state = 'down'; c.timer = 3 + R() * 1.5; c.ox += vx * k + dx / (d || 1) * 0.6; c.oz += vz * k + dz / (d || 1) * 0.6; c.downA = Math.atan2(vx, vz);
        sfx.hit(); if (car.local) { addHeat(car, 0.45); shout(car, true); }
        break;
      }
      if (car.speed > 4 && d < 9 && (c.state === 'sit' || c.state === 'back')) { // run away from the car, sideways to its path
        const vx = car.vx / car.speed, vz = car.vz / car.speed, lat = dx * vz - dz * vx, sg = lat >= 0 ? 1 : -1;
        let fx = vz * sg + dx / (d || 1) * 0.6, fz = -vx * sg + dz / (d || 1) * 0.6; const fl = Math.hypot(fx, fz) || 1;
        c.state = 'flee'; c.timer = 1 + R() * 0.6; c.fvx = fx / fl * 5.2; c.fvz = fz / fl * 5.2; c.fleeA = Math.atan2(c.fvx, c.fvz);
        if (car.local) shout(car, false);
        break;
      }
    }
    if (c.state === 'sit' && c.table.broken) { c.state = 'flee'; c.timer = 1.2; c.fleeA = c.h + Math.PI; c.fvx = Math.sin(c.fleeA) * 4; c.fvz = Math.cos(c.fleeA) * 4; }
    let moving = 0;
    if (c.state === 'flee') {
      c.ox += c.fvx * dt; c.oz += c.fvz * dt; moving = 5.2; c.timer -= dt;
      const ol = Math.hypot(c.ox, c.oz); if (ol > 7) { c.ox *= 7 / ol; c.oz *= 7 / ol; }
      if (c.timer <= 0) { c.state = 'scared'; c.timer = 2 + R() * 2; }
    } else if (c.state === 'scared' || c.state === 'down') {
      c.timer -= dt; if (c.timer <= 0) c.state = c.state === 'down' ? 'scared' : (c.table.broken ? 'scared' : 'back');
    } else if (c.state === 'back') { // walks back to the chair
      const ol = Math.hypot(c.ox, c.oz);
      if (ol < 0.15) { c.ox = c.oz = 0; c.state = 'sit'; }
      else { const k = Math.min(ol, 1.3 * dt) / ol; c.ox -= c.ox * k; c.oz -= c.oz * k; moving = 1.3; c.walkA = Math.atan2(-c.ox, -c.oz); }
    }
    let P;
    if (c.state === 'sit') {
      P = P0();
      P.hipsY = 0.5; P.thigh = [-1.5, -1.5]; P.knee = [1.45, 1.45]; P.ankle = [0.05, 0.05]; P.lean = 0.08;
      P.arm = [-0.55, -0.6]; P.elbow = [-0.9, -0.95]; P.armOut = [0.12, 0.12];
      c.drink -= dt;
      if (c.drink < 1.4) { const k = Math.sin(Math.max(0, c.drink) / 1.4 * Math.PI); P.arm[1] = -0.6 - k * 0.6; P.elbow[1] = -0.95 - k * 1.3; P.nod = -k * 0.25; }
      if (c.drink < 0) c.drink = 4 + R() * 9;
      if (c.talk) { P.look = Math.sin(t * 0.7) * 0.35; P.arm[0] += Math.max(0, Math.sin(t * 2.3)) * -0.5; P.elbow[0] += Math.sin(t * 4.1) * 0.2; P.nod = (P.nod || 0) + Math.sin(t * 3.1) * 0.06; }
      c.draw = { x: c.x, y: c.y, z: c.z, h: c.h };
    } else {
      const x = c.x + c.ox, z = c.z + c.oz, y = surfaceH(x, z) + 0.36;
      if (c.state === 'down') { P = P0(); P.lie = -Math.PI / 2; P.arm = [-2.6, -2.2]; P.thigh = [0.2, -0.3]; P.knee = [0.6, 0.2]; P.hipsY = 0.18 / c.s; c.draw = { x, y: y - 0.05, z, h: c.downA || c.h }; }
      else if (c.state === 'scared' && c.timer <= 0) { P = P0(); P.look = Math.sin(t * 0.6) * 0.8; P.arm = [0.1, -0.4]; P.elbow = [-0.2, -1.2]; c.draw = { x, y, z, h: (c.fleeA || c.h) + Math.PI }; } // waits for the table to be put back
      else if (c.state === 'scared') { P = P0(); P.arm = [-2.7 + Math.sin(t * 9) * 0.2, -2.7 - Math.sin(t * 9) * 0.2]; P.armOut = [0.35, 0.35]; P.elbow = [-0.3, -0.3]; P.lean = -0.1; c.draw = { x, y, z, h: (c.fleeA || c.h) + Math.PI }; }
      else {
        c.phase += dt * (moving > 3 ? moving * 2.1 : moving * 4.2);
        const run = c.state === 'flee'; P = walkPose(c.phase, run ? 1.25 : 0.9, run);
        if (run) { P.arm = [-2.5 + Math.sin(c.phase * 2) * 0.3, -2.5 - Math.sin(c.phase * 2) * 0.3]; P.armOut = [0.4, 0.4]; P.elbow = [-0.3, -0.3]; }
        c.draw = { x, y, z, h: run ? c.fleeA : c.walkA };
      }
    }
    c.pose = P;
  }
  function crowdDraw() {
    crowd.begin();
    for (const p of peds) if (p.on && p.pose) crowd.draw(p, p.pose);
    for (const c of customers) if (c.pose && c.vis) crowd.draw(c, c.pose, c.draw);
    crowd.end();
  }
  let shoutCd = 0;
  const SHOUTS = ['Hé, chauffard !', 'Non mais ça va pas ?', 'Espèce de malade !', 'Attention !', 'Ralentis, toi !', 'Oh là là !'];
  function shout(c, hard) {
    if (shoutCd > 0 || !c.local) return; shoutCd = hard ? 3 : 7;
    if (R() < (hard ? 0.9 : 0.35)) say(SHOUTS[(R() * SHOUTS.length) | 0], { rate: 1.25, pitch: 0.9 + R() * 0.8, vol: 0.7 });
  }

