  // =====================================================================================
  // Boats on the Loire: sailing boats that follow the channel and a car ferry (bac) that crosses to the island.
  // The hulls are downloaded models (see DATA-LICENSES.md), baked by tools/assets/bake_model.js into W.models:
  // one mesh each, colours per vertex, no texture. Scenery only for now: nothing collides with them.
  // =====================================================================================
  const Boats = (() => {
    const list = [], CH = [[60, 1150], [300, 800], [560, 600], [820, 490], [960, 482]]; // middle of the channel, west to east; they turn back before the shuttle's route round the tip of the island
    // the shuttle (user's choice, 15 Nov.): like the Navibus, from the Gare Maritime (quai de la Fosse) down the Madeleine arm
    // and round the tip of the île de Nantes to the Hangar à Bananes, by the grey Titan crane; it carries the players' cars
    const ROUTE = [[1339, -383], [1376, -348], [1300, -210], [1235, -50], [1150, 110], [1078, 250], [1092, 392], [1190, 440], [1312, 442], [1312, 401]]; // lands just east of the footbridge of the real pontoon (its parapet ends at x 1301)
    // the ramps (no teleporting, user's request of 15 Nov.): from the quay down to the end of the boat when it is alongside;
    // s: where the ramp starts on land, the boat's end is worked out from the route. A big light at the top says go or wait.
    const LAND = [{ name: 'Gare Maritime', end: -1 }, { name: 'Île de Nantes', end: 1 }];
    const DECK_Y = 1.55, DOCK = [ROUTE[0], ROUTE[ROUTE.length - 1]];
    const MOORED = [1388, -468, Math.atan2(-0.69, 0.72)];
    let curve = null, len = 0, built = false, wakeM = null, moored = null, route = null, routeLen = 0, fy = null;
    function decode(name, length, axis, waterline) { // -> geometry in metres, bow towards -z, y = 0 at the water line
      const m = (W.models || {})[name]; if (!m) return null;
      const bin = (s, T) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
      const pq = bin(m.p, Int16Array), cq = bin(m.c, Uint8Array), k = Math.max(...m.size) / 32767 * (length / m.size[axis]), H = m.size[1] * (length / m.size[axis]);
      const pos = new Float32Array(pq.length), col = new Float32Array(cq.length), c = new THREE.Color();
      for (let i = 0; i < pq.length; i += 3) {
        const x = pq[i] * k, y = pq[i + 1] * k + H / 2 - waterline * H, z = pq[i + 2] * k;
        if (axis === 0) { pos[i] = -z; pos[i + 2] = x; } else { pos[i] = x; pos[i + 2] = z; }
        pos[i + 1] = y;
        c.setRGB(cq[i] / 255, cq[i + 1] / 255, cq[i + 2] / 255).convertSRGBToLinear(); col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(new THREE.BufferAttribute(bin(m.i, m.n > 65535 ? Uint32Array : Uint16Array), 1)); g.computeVertexNormals();
      return g;
    }
    function wake(w, l) { // a pale V on the water behind the hull
      const g = new THREE.BufferGeometry(), p = [], a = [], n = 10;
      for (let i = 0; i <= n; i++) { const t = i / n, hw = w * (0.5 + t * 1.6); p.push(-hw, 0, l * t, hw, 0, l * t); a.push(1 - t, 1 - t); }
      const idx = []; for (let i = 0; i < n; i++) { const o = i * 2; idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3); }
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(idx);
      const col = []; for (const v of a) col.push(v, v, v); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      if (!wakeM) wakeM = new THREE.MeshBasicMaterial({ color: 0xcfe0e6, vertexColors: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const o = new THREE.Mesh(g, wakeM); o.userData.hdLinear = true; o.renderOrder = 2; return o;
    }
    function add(kind, geo, hullM, wl, ww) {
      const g = new THREE.Group(), body = new THREE.Mesh(geo, hullM); body.castShadow = true; body.userData.shared = true; body.userData.hdLinear = true;
      const wk = wake(ww, wl); wk.position.set(0, 0.06, wl * 0.02 + (kind === 'ferry' ? 20 : 4.5));
      g.add(body, wk); g.userData.hdLinear = true; scene.add(g);
      const b = { kind, g, body, wk, x: 0, z: 0, h: 0, v: 0, ph: R() * 6.28 }; list.push(b); return b;
    }
    function build() {
      if (built || !ULTRA) return; built = true;
      const sail = decode('voilier', 11.5, 2, 0.112), ferry = decode('ferry', 44, 0, 0.075);
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide, flatShading: true, envMapIntensity: 0.4 });
      mat.userData.shared = true;
      // the channel as a closed loop: eastbound on the right-hand lane, back on the other one
      const pts = [], off = 28;
      const lane = (i, s) => { const a = CH[Math.max(0, i - 1)], b = CH[Math.min(CH.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return new THREE.Vector3(CH[i][0] - (b[1] - a[1]) / l * off * s, 0, CH[i][1] + (b[0] - a[0]) / l * off * s); };
      for (let i = 0; i < CH.length; i++) pts.push(lane(i, 1));
      for (let i = CH.length - 1; i >= 0; i--) pts.push(lane(i, -1));
      curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.4); len = curve.getLength();
      if (sail) for (let i = 0; i < 4; i++) { const b = add('sail', sail, mat, 26, 2.2); b.s = (i * 0.25 + 0.06 + R() * 0.08) * len; b.v0 = 2.8 + R() * 1.6; b.v = b.v0; }
      if (ferry) {
        route = new THREE.CatmullRomCurve3(ROUTE.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5); routeLen = route.getLength();
        const b = fy = add('ferry', ferry, mat, 46, 9); b.t = 0; b.side = 0; b.wait = 20; b.v = 0; b.still = 0; b.came = [];
        const onDeck = (x, z) => { const dx = x - b.x, dz = z - b.z, s = Math.sin(b.h), c = Math.cos(b.h), lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < 8.2 && Math.abs(lz) < 21.5; };
        b.onDeck = onDeck;
        // the yellow gates at both ends (cut out of the model by the bake tool): the one on the land side tips down onto
        // the ramp while the boat is alongside, and comes back up before it leaves (user, 16 Nov.)
        { const H = W.models.ferry, k = 44 / H.size[0]; b.gates = [];
          for (const name of ['ferry_porte_a', 'ferry_porte_b']) { const gm = modelMesh(name), P = W.models[name]; if (!gm || !P.o) continue;
            const hinge = new THREE.Group(), z = (P.o[0] - H.o[0]) * k;
            gm.scale.setScalar(k); gm.rotation.y = -Math.PI / 2; gm.position.y = P.size[1] / 2 * k;
            hinge.position.set(-(P.o[2] - H.o[2]) * k, (P.o[1] - P.size[1] / 2 - H.o[1]) * k + H.size[1] * k * (0.5 - 0.075), z); hinge.add(gm); b.g.add(hinge);
            b.gates.push({ hinge, out: Math.sign(z), open: 0 }); } }
        DECKS.push((x, z) => onDeck(x, z) ? WATER_Y + DECK_Y : null);
        const lampG = new THREE.SphereGeometry(0.75, 12, 8), postM = new THREE.MeshLambertMaterial({ color: hd.lin(0x3a3f44) }), rampM = new THREE.MeshLambertMaterial({ color: hd.lin(0x70757a) });
        LAND.forEach((L, k) => {
          // the boat's pose at this dock, the end of its deck that touches the land, and the ramp from there up the bank
          const u = k ? 1 : 0, p = route.getPointAt(u), tg = route.getTangentAt(u), ax = tg.x * L.end, az = tg.z * L.end; // (ax, az): from the boat towards the land
          L.bx = p.x + ax * 21.5; L.bz = p.z + az * 21.5; L.len = 24; L.ax = ax; L.az = az; L.x = L.bx + ax * L.len; L.z = L.bz + az * L.len; L.y = groundH(L.x, L.z); L.hw = 4.6;
          DECKS.push((x, z) => { // solid at all times (user, 15 Nov.): with the boat away, a car that drives off its end falls into the Loire
            const dx = x - L.bx, dz = z - L.bz, s = dx * ax + dz * az, lat = dx * az - dz * ax; if (s < -0.5 || s > L.len || Math.abs(lat) > L.hw) return null;
            const y = WATER_Y + DECK_Y + (L.y - WATER_Y - DECK_Y) * Math.max(0, s) / L.len; return y > groundH(x, z) - 0.2 ? y : null; });
          // the slab from the top of the bank down to the level of the deck; it stays down when the boat is away
          const sl = Math.hypot(L.len, L.y - WATER_Y - DECK_Y) + 0.6, m = new THREE.Mesh(new THREE.BoxGeometry(L.hw * 2, 0.3, sl), rampM), hinge = new THREE.Group();
          m.position.set(0, -0.2, sl / 2); m.receiveShadow = true; m.castShadow = true; m.userData.hdLinear = true; hinge.add(m);
          hinge.position.set(L.x, L.y, L.z); hinge.rotation.order = 'YXZ'; hinge.rotation.y = Math.atan2(-ax, -az); L.slope = Math.atan2(L.y - WATER_Y - DECK_Y, L.len); hinge.rotation.x = L.slope;
          hinge.userData.hdLinear = true; scene.add(hinge); L.hinge = hinge;
          const lx = L.x - az * (L.hw + 1.2), lz = L.z + ax * (L.hw + 1.2), post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 5, 8), postM); post.position.set(lx, groundH(lx, lz) + 2.5, lz); post.userData.hdLinear = true; scene.add(post);
          L.lamp = new THREE.Mesh(lampG, new THREE.MeshBasicMaterial({ color: 0xff2a1a })); L.lamp.position.set(lx, groundH(lx, lz) + 5.4, lz); L.lamp.userData.hdLinear = true; scene.add(L.lamp);
          gridAdd([lx - 0.3, lz, lx + 0.3, lz], 3.5);
          // a wooden landing stage beside the ramp (downloaded model), its stem towards the land
          const pt = modelMesh('ponton'); if (pt) { const S = 1.5, ps = pt.geometry.userData.size, ox = L.bx + az * (L.hw + 9) + ax * 3, oz = L.bz - ax * (L.hw + 9) + az * 3;
            pt.scale.setScalar(S); pt.position.set(ox, WATER_Y + ps[1] / 2 * S - 0.6, oz); pt.rotation.y = Math.atan2(ax, az); scene.add(pt); }
        });
      }
      // the Maillé-Brézé, museum ship of the quai de la Fosse, moored where OpenStreetMap draws her (132 m, bow upstream)
      const esc = decode('escorteur', 132, 2, 0.09);
      if (esc) { const m = new THREE.Mesh(esc, mat); m.position.set(MOORED[0], WATER_Y, MOORED[1]); m.rotation.y = MOORED[2]; m.castShadow = true; m.userData.shared = true; m.userData.hdLinear = true; scene.add(m); moored = m; }
      step(0);
    }
    function step(dt) {
      if (!built) return;
      const T = performance.now() / 1000, fy = list.find(b => b.kind === 'ferry');
      for (const b of list) {
        let roll = 0, pitch = 0;
        if (b.kind === 'sail') {
          // give way to the ferry when it lies ahead
          let want = b.v0;
          if (fy) { const dx = fy.x - b.x, dz = fy.z - b.z, d = Math.hypot(dx, dz), ahead = -Math.sin(b.h) * dx - Math.cos(b.h) * dz; if (d < 95 && ahead > 0) want = d < 60 ? 0 : b.v0 * 0.35; }
          b.v += (want - b.v) * Math.min(1, dt * 0.5);
          b.s = (b.s + b.v * dt) % len;
          const u = b.s / len, p = curve.getPointAt(u), t = curve.getTangentAt(u);
          b.x = p.x; b.z = p.z; b.h = Math.atan2(-t.x, -t.z);
          roll = (0.13 + Math.sin(T * 0.5 + b.ph) * 0.035) * (t.x > 0 ? 1 : -1) * Math.min(1, b.v / 2); pitch = Math.sin(T * 0.8 + b.ph) * 0.018;
        } else {
          // b.t: metres along the route from the Gare Maritime; b.side: the dock it is at, or leaving from
          const goal = b.side ? 0 : routeLen, cars = typeof locals !== 'undefined' ? locals.map(L => L.car).filter(c => c && c.alive) : [], x0 = b.x, z0 = b.z, h0 = b.h;
          const riders = cars.filter(c => b.onDeck(c.x, c.z));
          if (b.wait > 0) {
            b.v = 0; const P = LAND[b.side];
            // nobody halfway up the ramp when it lifts; riders stopped on board: no need to wait for the timetable
            const onRamp = cars.some(c => { const dx = c.x - P.bx, dz = c.z - P.bz, s = dx * P.ax + dz * P.az; return s > -1 && s < P.len + 2 && Math.abs(dx * P.az - dz * P.ax) < P.hw + 1 && !b.onDeck(c.x, c.z); });
            b.still = riders.length && riders.every(c => Math.hypot(c.vx, c.vz) < 0.8) ? b.still + dt : 0;
            b.wait -= dt; if (b.still > 4 && b.wait > 2 && riders.some(c => !b.came.includes(c))) b.wait = 2; // only for those who came aboard here: who stays on after a crossing waits for the timetable if (onRamp && b.wait < 1.5) b.wait = 1.5;
            if (b.wait <= 0 && riders.length) for (const L of locals) if (riders.includes(L.car)) flashFor(L, 'NAVETTE', 'Cap sur ' + LAND[1 - b.side].name);
          } else {
            const left = Math.abs(goal - b.t), done = routeLen - left, want = Math.min(riders.length ? 11 : 8, 0.7 + left * 0.2, 0.7 + done * 0.3);
            b.v += (want - b.v) * Math.min(1, dt * 1.2); b.t += (b.side ? -1 : 1) * b.v * dt;
            if (left < 0.6) { b.t = goal; b.side = 1 - b.side; b.wait = 25; b.v = 0; b.still = 0; b.came = riders.slice();
              for (const L of locals) if (riders.includes(L.car)) flashFor(L, LAND[b.side].name.toUpperCase(), 'Feu vert : descends par la rampe'); }
          }
          const u = Math.min(1, Math.max(0, b.t / routeLen)), p = route.getPointAt(u), tg = route.getTangentAt(u);
          b.x = p.x; b.z = p.z; b.h = Math.atan2(-tg.x, -tg.z); // double-ended: same heading both ways
          // whoever stands on the deck is carried along, and stays free to move on it
          if (b.x !== x0 || b.z !== z0 || b.h !== h0) for (const c of riders) {
            const dx = c.x - x0, dz = c.z - z0, s0 = Math.sin(h0), c0 = Math.cos(h0), lx = dx * c0 - dz * s0, lz = dx * s0 + dz * c0, s1 = Math.sin(b.h), c1 = Math.cos(b.h), dh = b.h - h0;
            c.x = b.x + lx * c1 + lz * s1; c.z = b.z - lx * s1 + lz * c1; c.h += dh;
            const vx = c.vx, vz = c.vz, sd = Math.sin(dh), cd = Math.cos(dh); c.vx = vx * cd + vz * sd; c.vz = -vx * sd + vz * cd;
          }
          for (let k = 0; k < 2; k++) LAND[k].lamp.material.color.setHex(b.side === k && b.wait > 3 ? 0x2cff4a : 0xff2a1a);
          // dock 0 (Gare Maritime) is behind the boat (+z), dock 1 ahead (-z); closed again two seconds before leaving
          for (const gt of b.gates || []) { const want = b.wait > 2 && gt.out === (b.side ? -1 : 1) ? 1 : 0; gt.open += (want - gt.open) * Math.min(1, dt * 1.6); gt.hinge.rotation.x = gt.out * 1.36 * gt.open; }
          b.wk.rotation.y = b.side ? Math.PI : 0; b.wk.position.z = b.side ? -20 : 20;
          roll = Math.sin(T * 0.45) * 0.006;
        }
        b.g.position.set(b.x, WATER_Y + Math.sin(T * 0.9 + b.ph) * (b.kind === 'sail' ? 0.07 : 0.02), b.z);
        b.g.rotation.set(pitch, b.h, 0); b.body.rotation.z = roll;
        b.wk.visible = b.v > 0.5; b.wk.scale.set(1, 1, Math.min(1, b.v / 3));
      }
    }
    return { build, step, list, LAND, ROUTE, get ferry() { return fy; }, get curve() { return curve; }, get moored() { return moored; }, DOCK };
  })();
