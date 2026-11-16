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
    const DECK_Y = 1.76, DOCK = [ROUTE[0], ROUTE[ROUTE.length - 1]];
    const BENCH_Z = [-10.5, -6.5, 4, 8, 12]; // clear of the lifeboat bay (x < -7, z -3.5 to 0.5)
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
      // (16 nov.) two trawlers moored along the quai de la Fosse (downloaded model, 4 500 triangles): the first water found
      // off the quay, about 6 m out, parallel to the bank, away from the shuttle's ramps
      const trawler = decode('chalutier', 22, 2, 0.16);
      if (trawler) {
        const spots = [], wet = (x, z) => groundH(x, z) < WATER_Y - 0.6;
        for (const r of W.roads) { if (W.names[r.n] !== 'Quai de la Fosse') continue;
          for (let k = 0; k < r.p.length; k += 2) { const x = r.p[k], z = r.p[k + 1];
            if ([ROUTE[0], ROUTE[ROUTE.length - 1]].some(P => Math.hypot(P[0] - x, P[1] - z) < 90) || spots.some(s => Math.hypot(s[0] - x, s[1] - z) < 70)) continue;
            for (let a = 0; a < 16; a++) { const dx = Math.cos(a / 16 * 6.283), dz = Math.sin(a / 16 * 6.283); let d = 2; while (d < 40 && !wet(x + dx * d, z + dz * d)) d += 1;
              if (d < 40 && wet(x + dx * (d + 6), z + dz * (d + 6)) && wet(x + dx * (d + 10), z + dz * (d + 10)) && wet(x + dx * (d + 6) - dz * 12, z + dz * (d + 6) + dx * 12) && wet(x + dx * (d + 6) + dz * 12, z + dz * (d + 6) - dx * 12)) {
                spots.push([x + dx * (d + 6), z + dz * (d + 6), Math.atan2(-dz, dx)]); break; } } }
        }
        for (const [x, z, h] of spots.slice(0, 2)) { const b = add('moor', trawler, mat, 20, 4); b.x = x; b.z = z; b.h = h; b.wk.visible = false; }
      }
      if (sail) for (let i = 0; i < 4; i++) { const b = add('sail', sail, mat, 26, 2.2); b.s = (i * 0.25 + 0.06 + R() * 0.08) * len; b.v0 = 2.8 + R() * 1.6; b.v = b.v0; }
      if (ferry) {
        route = new THREE.CatmullRomCurve3(ROUTE.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5); routeLen = route.getLength();
        const b = fy = add('ferry', ferry, mat, 46, 9); b.t = 0; b.side = 0; b.wait = 20; b.v = 0; b.still = 0; b.came = [];
        const onDeck = (x, z) => { const dx = x - b.x, dz = z - b.z, s = Math.sin(b.h), c = Math.cos(b.h), lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < 8.2 && Math.abs(lz) < 21.5; };
        b.onDeck = onDeck;
        // the yellow gates at both ends (cut out of the model by the bake tool): the one on the land side tips down onto
        // the ramp while the boat is alongside, and comes back up before it leaves (user, 16 Nov.)
        // (16 nov., user) the gates of the model came in pieces (only the middle one could tip, its side panels stayed in the
        // hull): what stands in the gateways is taken out of the hull and each gate is drawn whole, 18 m wide, hinged at the deck
        { const g = ferry, P = g.attributes.position, C = g.attributes.color, I = g.index, yel = v => { const z = Math.abs(P.getZ(v)), y = P.getY(v); return z > 18.4 && z < 21 && y > DECK_Y + 0.04 && y < DECK_Y + 1.7 && Math.abs(P.getX(v)) < 9.25; }; // the gate's volume
          for (let t = 0; t < I.count; t += 3) { const a = I.getX(t), c2 = I.getX(t + 1), d = I.getX(t + 2); if (yel(a) && yel(c2) && yel(d)) { I.setX(t + 1, a); I.setX(t + 2, a); } }
          I.needsUpdate = true; }
        b.gates = [];
        { const yM = new THREE.MeshLambertMaterial({ color: hd.lin(0xe8b818) }), dM = new THREE.MeshLambertMaterial({ color: hd.lin(0x3a3226) });
          for (const out of [-1, 1]) {
            const hinge = new THREE.Group(), gg = new THREE.Group(); hinge.position.set(0, DECK_Y, out * 19.7); hinge.add(gg);
            const box = (w, h, d, x, y, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, 0); o.castShadow = true; gg.add(o); };
            box(18, 0.16, 0.22, 0, 0.08, yM); box(18, 0.16, 0.22, 0, 1.12, yM); box(18, 0.12, 0.16, 0, 0.6, yM); // rails
            for (let x = -9; x <= 9.01; x += 1.5) box(0.14, 1.2, 0.2, x, 0.6, Math.abs(x) % 3 < 0.1 ? yM : dM); // posts
            gg.traverse(o => { o.userData.hdLinear = true; }); b.g.add(hinge);
            b.gates.push({ hinge, out, open: 0 }); } }
        DECKS.push((x, z) => onDeck(x, z) ? WATER_Y + DECK_Y : null);
        { // (16 nov.) wooden benches along both sides of the deck, where the foot passengers sit for the crossing
          const wood = new THREE.MeshLambertMaterial({ color: hd.lin(0x5e3b22) }), legM = new THREE.MeshLambertMaterial({ color: hd.lin(0x3a3f44) });
          // against the side walls of the model (|x| 8.25, measured), the seat at chair height like the terrace chairs
          b.benches = [];
          for (const sd of [-1, 1]) for (const lz of BENCH_Z) {
            const parts = [], n0 = b.g.children.length;
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 2.4), wood); seat.position.set(sd * 7.95, DECK_Y + 0.45, lz); b.g.add(seat);
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 2.4), wood); back.position.set(sd * 8.2, DECK_Y + 0.72, lz); b.g.add(back);
            for (const e of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.43, 0.06), legM); l.position.set(sd * 7.95, DECK_Y + 0.21, lz + e * 1.05); b.g.add(l); }
            b.benches.push({ sd, lz, parts: b.g.children.slice(n0), broken: false });
          }
          b.g.traverse(o => { if (o.isMesh && (o.material === wood || o.material === legM)) o.userData.hdLinear = true; });
        }
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
          // (16 nov., user) a strip of road from the top of the ramp to the nearest street, drawn like the streets: straight
          // up the ramp's axis while that meets a street within 80 m, otherwise to the nearest point of a street
          { let pts = null;
            for (let s = 2; s < 80; s += 2) { const x = L.x + ax * s, z = L.z + az * s; if (roadEdge(x, z)[0] < -1) { pts = [L.x - ax * 0.5, L.z - az * 0.5, x + ax * 2, z + az * 2]; break; } }
            if (!pts) { let bd = 1e9, bp = null; for (const r of W.roads) { if (!r.d || r.b) continue; for (let i = 0; i < r.p.length; i += 2) { const d = Math.hypot(r.p[i] - L.x, r.p[i + 1] - L.z); if (d < bd) { bd = d; bp = [r.p[i], r.p[i + 1]]; } } }
              if (bp && bd < 150) pts = [L.x - ax * 0.5, L.z - az * 0.5, L.x + ax * 6, L.z + az * 6, bp[0], bp[1]]; }
            if (pts && ROAD_MATERIAL) { const B = new Buf(); ribbon(B, pts, L.hw * 2, ROAD_Y.drive + 0.01, col(HD ? '#414144' : '#46404c'), 6); const gg = B.geo(); if (HD) hd.linearize(new THREE.Mesh(gg)); const m = new THREE.Mesh(gg, ROAD_MATERIAL); m.receiveShadow = true; m.userData.hdLinear = true; scene.add(m); } // (the streets' colours were made linear at start-up: this one by hand)
            L.road = pts; }
          // (16 nov., user) a proper traffic light: a dark housing with red, orange and green, facing the ramp both ways
          const lx = L.x - az * (L.hw + 1.2), lz = L.z + ax * (L.hw + 1.2), gy = groundH(lx, lz), post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.2, 8), postM); post.position.set(lx, gy + 2.1, lz); post.userData.hdLinear = true; scene.add(post);
          const head = new THREE.Group(); head.position.set(lx, gy + 5.1, lz); head.rotation.y = Math.atan2(-ax, -az); scene.add(head);
          const hous = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.1, 0.55), postM); head.add(hous);
          const visor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.3), postM);
          L.lights = [0xff2a1a, 0xffa020, 0x2cff4a].map((col, i) => {
            const y = 0.65 - i * 0.65, m = new THREE.MeshBasicMaterial({ color: col });
            for (const f of [1, -1]) { const d = new THREE.Mesh(lampG, m); d.scale.set(0.3, 0.3, 0.12); d.position.set(0, y, f * 0.28); head.add(d); const v = visor.clone(); v.position.set(0, y + 0.3, f * 0.42); head.add(v); }
            return { m, col }; });
          head.traverse(o => { o.userData.hdLinear = true; }); L.lamp = head;
          gridAdd([lx - 0.3, lz, lx + 0.3, lz], 3.5);
          // a wooden landing stage beside the ramp (downloaded model), its stem towards the land
          const pt = modelMesh('ponton'); if (pt) { const S = 1.5, ps = pt.geometry.userData.size, ox = L.bx + az * (L.hw + 9) + ax * 3, oz = L.bz - ax * (L.hw + 9) + az * 3;
            pt.scale.setScalar(S); pt.position.set(ox, WATER_Y + ps[1] / 2 * S - 0.6, oz); pt.rotation.y = Math.atan2(ax, az); scene.add(pt); L.pt = pt; }
        });
      }
      // the Maillé-Brézé, museum ship of the quai de la Fosse, moored where OpenStreetMap draws her (132 m, bow upstream)
      const esc = decode('escorteur', 132, 2, 0.09);
      if (esc) { const m = new THREE.Mesh(esc, mat); m.position.set(MOORED[0], WATER_Y, MOORED[1]); m.rotation.y = MOORED[2]; m.castShadow = true; m.userData.shared = true; m.userData.hdLinear = true; scene.add(m); moored = m;
        // (16 nov., user) solid: her outline is a wall, so a car that reaches her bounces off instead of driving through
        esc.computeBoundingBox(); const bb = esc.boundingBox, hw = Math.max(-bb.min.x, bb.max.x) * 0.95, hl = Math.max(-bb.min.z, bb.max.z) * 0.98, sn = Math.sin(MOORED[2]), cs = Math.cos(MOORED[2]);
        const at = (u, v) => [MOORED[0] + u * hw * cs + v * hl * sn, MOORED[1] - u * hw * sn + v * hl * cs];
        const O = [[0, -1], [0.55, -0.75], [0.95, -0.35], [1, 0.2], [0.95, 0.75], [0.7, 1], [-0.7, 1], [-0.95, 0.75], [-1, 0.2], [-0.95, -0.35], [-0.55, -0.75]];
        for (let i = 0; i < O.length; i++) { const a = at(...O[i]), c = at(...O[(i + 1) % O.length]); gridAdd([a[0], a[1], c[0], c[1]], 9); } }
      paxInit(); step(0);
    }
    // Foot passengers of the ferry (backlog « autres passagers »): a few people wait at the top of each ramp, walk
    // aboard when the boat is alongside, stand along the rail for the crossing, walk off and away on the other side.
    // They are drawn like the street's pedestrians (People) but live here: nobody else moves them.
    const pax = [];
    // (16 nov., user; Fable's list) two cars of the district that take the ferry: they wait on the approach road above a
    // ramp, drive down and park on the deck once the gate is flat, cross, and drive off and away on the other side; then a
    // new one turns up at one of the two queues. Real cars (they collide, can be shunted or wrecked), driven from here
    const fcars = [];
    function fcarNew(dock, slot) {
      const L = LAND[dock], c = makeNpc('civ'), x = L.x + L.ax * (12 + slot * 7.5) + L.az * 2.4, z = L.z + L.az * (12 + slot * 7.5) - L.ax * 2.4; // in the lane going down, the other one is for those coming off
      c.ferry = true; c.nav = { a: 0, b: 0, panic: 0, stuck: 0, back: 0, wait: 0, honk: 0, lane: 1.7, pass: 0 }; c.place(x, z, Math.atan2(L.ax, L.az)); c.alive = true; c.mesh.visible = true; npcs.push(c);
      return { c, st: 'queue', dock, slot, tg: null, k: 0, lx: 0, lz: 0, rh: 0, away: 0 };
    }
    function fcarDrive(f, dt, v) { // towards the next point; waits behind anything in the way; true when the last one is reached
      const c = f.c, t = f.tg[f.k], dx = t[0] - c.x, dz = t[1] - c.z, d = Math.hypot(dx, dz);
      if (d < 0.8) { f.k++; return f.k >= f.tg.length; }
      const ux = dx / d, uz = dz / d;
      const blocked = allPlayerCars().concat(npcs).some(o => { if (o === c || !o.alive) return false; const ex = o.x - c.x, ez = o.z - c.z, al = ex * ux + ez * uz; return al > 0 && al < 7 && Math.abs(ex * uz - ez * ux) < 2.4; });
      f.stuck = blocked ? (f.stuck || 0) + dt : 0;
      if (f.stuck > 12) { f.stuck = 0; c.x = t[0]; c.z = t[1]; c.sync(); f.k++; return f.k >= f.tg.length; } // stuck (a car parked in the way): it gets past, the ferry must not wait for ever
      const sp = blocked ? 0 : Math.min(v, d * 1.5 + 1);
      c.h += wrapA(Math.atan2(-ux, -uz) - c.h) * Math.min(1, dt * 4); c.vx = ux * sp; c.vz = uz * sp; c.x += c.vx * dt; c.z += c.vz * dt; c.sync();
      return false;
    }
    function fcarStep(dt, b, landEnd, gateOpen) {
      if (!fcars.length && typeof makeNpc === 'function') { fcars.push(fcarNew(0, 0), fcarNew(1, 0)); }
      const sn = Math.sin(b.h), cs = Math.cos(b.h), W_ = (lx, lz) => [b.x + lx * cs + lz * sn, b.z - lx * sn + lz * cs];
      for (let i = 0; i < fcars.length; i++) { const f = fcars[i], c = f.c;
        if (f.st === 'away') { f.away -= dt; if (f.away <= 0) { const dock = R() < 0.5 ? 0 : 1; fcars[i] = fcarNew(dock, fcars.some(o => o !== f && o.st === 'queue' && o.dock === dock) ? 1 : 0); } continue; }
        if (!c.alive || !npcs.includes(c)) { f.st = 'away'; f.away = 40 + R() * 40; continue; } // wrecked or cleared: another one later
        const L = LAND[f.dock], docked = b.wait > 0 && gateOpen;
        if (f.st === 'queue') { c.vx = c.vz = 0;
          if (docked && b.side === f.dock && b.wait > 7 && !fcars.some(o => o !== f && (o.st === 'board' || (o.st === 'leave' && o.k < 2)))) {
            const lx = fcars.some(o => o.st === 'ride' && o.lx < 0) ? 3.3 : -3.3, lz = landEnd * 4; // the free side of the deck
            f.lx = lx; f.lz = lz; f.st = 'board'; f.k = 0; f.tg = [[L.x + L.az * 2.4, L.z - L.ax * 2.4], [L.bx + L.az * 2.4, L.bz - L.ax * 2.4], W_(lx, landEnd * 15), W_(lx, lz)]; }
        } else if (f.st === 'board') {
          if (fcarDrive(f, dt, 6)) { f.st = 'ride'; f.rh = c.h - b.h; }
        } else if (f.st === 'ride') {
          const q = W_(f.lx, f.lz); c.x = q[0]; c.z = q[1]; c.h = b.h + f.rh; c.vx = c.vz = 0; c.sync();
          if (docked && b.side !== f.dock) { const M = LAND[b.side]; f.dock = b.side; f.st = 'leave'; f.k = 0; f.tg = [W_(f.lx * 0.5, landEnd * 17), [M.bx - M.az * 2.4, M.bz + M.ax * 2.4], [M.x - M.az * 2.4, M.z + M.ax * 2.4], [M.x + M.ax * 45 - M.az * 2.4, M.z + M.az * 45 + M.ax * 2.4]]; }
        } else if (f.st === 'leave') {
          if (fcarDrive(f, dt, 7)) { removeNpc(c); f.st = 'away'; f.away = 30 + R() * 40; }
        }
      }
    }
    // (16 nov., user) a car that drives into a bench breaks it; they are mended while the boat is alongside, out of sight
    function breakBench(b, bn, c) {
      bn.broken = true; for (const o of bn.parts) o.visible = false;
      const sn = Math.sin(b.h), cs = Math.cos(b.h), lx = bn.sd * 7.9, x = b.x + lx * cs + bn.lz * sn, z = b.z - lx * sn + bn.lz * cs, y = b.g.position.y + DECK_Y + 0.4;
      for (let k = 0; k < 5; k++) spawnFx(x + (R() - 0.5) * 2, y, z + (R() - 0.5) * 2, 0.35, 0x5e3b22, 0.5, 3 + R() * 3, 1.5);
      if (c && c.local) { sfx.impact(6); addHeat(c, 0.02); }
      for (const p of pax) if (p.st === 'ride' && Math.sign(p.lx) === bn.sd && Math.abs(p.lz - bn.lz) < 1.5) knock(p, c);
    }
    function knock(p, c) { // run over: down on the deck (or the quay) for a while, then back to the bench or away
      const b = fy, sn = Math.sin(b.h), cs = Math.cos(b.h), dx = p.x - b.x, dz = p.z - b.z;
      p.loc = b.onDeck(p.x, p.z) ? [dx * cs - dz * sn, dx * sn + dz * cs] : null; p.st = 'down'; p.t = 6 + R() * 3; p.state = 'down';
      sfx.hit(); if (c && c.local) { oneStar(c, 0.45, 'La police l’a vu : piéton renversé'); shout(c, true); }
    }
    function scare(p, cars) { // the car closest to a foot passenger that comes at them: they run, or they are knocked down
      if (p.st === 'gone' || p.st === 'down' || !p.on) return;
      for (const c of cars) {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), v = Math.hypot(c.vx, c.vz); if (d > 8 || v < 3) continue;
        const toward = (c.vx * dx + c.vz * dz) / (d || 1); if (toward < 1.5) continue;
        if (d < 1.7 && v > 4) { knock(p, c); return; }
        if (p.st !== 'flee') { const b = fy, sn = Math.sin(b.h), cs = Math.cos(b.h), ex = p.x - b.x, ez = p.z - b.z; p.loc = b.onDeck(p.x, p.z) ? [ex * cs - ez * sn, ex * sn + ez * cs] : null; p.st = 'flee'; }
        p.t = 1.6; p.fx = dx / (d || 1); p.fz = dz / (d || 1); // away from the car, a little to the side of its path
        const side = Math.sign(c.vx * dz - c.vz * dx) || 1; p.fx += -c.vz / v * side * 0.8; p.fz += c.vx / v * side * 0.8; const l = Math.hypot(p.fx, p.fz); p.fx /= l; p.fz /= l; return;
      }
    }
    function paxInit() {
      if (!fy || !People.on) return;
      for (let i = 0; i < 6; i++) pax.push({ dock: i < 3 ? 0 : 1, st: 'wait', slot: i % 3, lx: (i % 2 ? 1 : -1) * 7.97, lz: BENCH_Z[[0, 2, 4][i % 3]] + (i < 3 ? -0.5 : 0.6), x: 0, y: 0, z: 0, h: 0, on: true, state: 'idle', speed: 1.35 + R() * 0.3, s: 0.94 + R() * 0.1, woman: R() < 0.5, old: false, kid: false, away: 0, tg: null, k: 0 });
    }
    const paxSpot = (p, L) => { const side = -1, a = L.hw + 2.2 + p.slot * 1.1; return [L.x + L.ax * (2 + p.slot * 0.8) + L.az * a * side, L.z + L.az * (2 + p.slot * 0.8) - L.ax * a * side]; }; // on the quay, on the side away from the lamp post
    const paxLane = (p, L, s) => { const lat = (p.lx > 0 ? 1 : -1) * 3.4; return [L.bx + L.ax * s + L.az * lat, L.bz + L.az * s - L.ax * lat]; }; // along the edge of the ramp, s metres up from the boat
    function paxStep(dt, cars) {
      const b = fy; if (!b || !pax.length) return;
      const sn = Math.sin(b.h), cs = Math.cos(b.h), deck = p => [b.x + p.lx * cs + p.lz * sn, b.z - p.lx * sn + p.lz * cs];
      // (16 nov., user) in step with the gate: they walk on or off only once it is flat, and the boat waits for them
      const landEnd = Math.sign((LAND[b.side].bx - b.x) * sn + (LAND[b.side].bz - b.z) * cs) || 1, gt = (b.gates || []).find(g => g.out === landEnd), docked = b.wait > 0 && gt && gt.open > 0.95;
      const aisle = (p, atBench) => { const lz = atBench ? p.lz : landEnd * 15, lx = (p.lx > 0 ? 1 : -1) * 5.5; return [b.x + lx * cs + lz * sn, b.z - lx * sn + lz * cs]; }; // inside the gate, then along to the bench
      const toWorld = q => [b.x + q[0] * cs + q[1] * sn, b.z - q[0] * sn + q[1] * cs];
      for (const p of pax) {
        const L = LAND[p.dock];
        if (dt > 0) scare(p, cars || []);
        if (p.st === 'flee' || p.st === 'down') { // on the deck they stay on it (in the boat's frame), ashore they run free
          p.t -= dt;
          if (p.st === 'flee') {
            const sp = 4.6 * dt;
            if (p.loc) { const lfx = p.fx * cs - p.fz * sn, lfz = p.fx * sn + p.fz * cs; p.loc[0] = Math.max(-7.2, Math.min(7.2, p.loc[0] + lfx * sp)); p.loc[1] = Math.max(-18.8, Math.min(18.8, p.loc[1] + lfz * sp)); }
            else { p.x += p.fx * sp; p.z += p.fz * sp; }
            p.h += wrapA(Math.atan2(p.fx, p.fz) - p.h) * Math.min(1, dt * 10); p.state = 'flee';
          } else p.state = 'down';
          if (p.loc) { const q = toWorld(p.loc); p.x = q[0]; p.z = q[1]; }
          if (p.t <= 0) { if (p.loc) { p.st = 'board'; p.tg = [null]; p.k = 0; } else { p.st = 'gone'; p.away = 12 + R() * 10; } p.loc = null; }
          p.y = surfaceH(p.x, p.z) + 0.36; p.vis = true; People.draw(p); continue;
        }
        if (p.st === 'gone') { p.away -= dt; p.on = false; if (p.away <= 0) { p.st = 'wait'; const q = paxSpot(p, L); p.x = q[0]; p.z = q[1]; p.h = Math.atan2(-L.ax, -L.az); } }
        else if (p.st === 'wait') { p.on = true; p.state = 'idle'; const q = paxSpot(p, L); p.x = q[0]; p.z = q[1];
          if (docked && b.side === p.dock && b.wait > 8 && b.wait < 23) { p.st = 'board'; p.tg = [paxLane(p, L, L.len - 1), paxLane(p, L, 0.5), aisle(p), aisle(p, true), null]; p.k = 0; } }
        else if (p.st === 'ride') { const q = deck(p); p.x = q[0]; p.z = q[1]; p.state = 'idle'; p.h = b.h + (p.lx > 0 ? -1.57 : 1.57); // (16 nov.) seated on a bench along the side, facing the deck
          if (docked && b.side !== p.dock) { p.dock = b.side; const M = LAND[p.dock]; p.st = 'leave'; p.tg = [aisle(p, true), aisle(p), paxLane(p, M, 0.5), paxLane(p, M, M.len - 1), [M.x + M.ax * 16 + M.az * p.lx * 0.4, M.z + M.az * 16 - M.ax * p.lx * 0.4]]; p.k = 0; } }
        else { // walking aboard or ashore: from one point to the next
          let t = p.tg[p.k] || deck(p); const dx = t[0] - p.x, dz = t[1] - p.z, d = Math.hypot(dx, dz);
          p.state = 'walk'; if (d > 0.05) { const stp = Math.min(d, p.speed * dt); p.x += dx / d * stp; p.z += dz / d * stp; p.h += wrapA(Math.atan2(dx, dz) - p.h) * Math.min(1, dt * 8); }
          if (d < 0.35) { p.k++; if (p.k >= p.tg.length) { if (p.st === 'board') p.st = 'ride'; else { p.st = 'gone'; p.away = 14 + R() * 20; } } }
          if (p.st === 'board' && b.side !== p.dock && !b.onDeck(p.x, p.z)) { p.st = 'gone'; p.away = 4; } // missed it: back to the queue
        }
        if (p.st === 'ride') { // (16 nov.) on the bench: the seated pose of the terrace customers, on the deck (not in its side)
          p.vis = p.pose = true; p.state = 'sit'; p.y = b.g.position.y + DECK_Y + 0.08; p.h = b.h + (p.lx > 0 ? -1.57 : 1.57); People.drawCustomer(p); continue;
        }
        p.y = surfaceH(p.x, p.z) + 0.36; People.draw(p);
      }
    }
    function step(dt) {
      if (!built) return;
      const T = performance.now() / 1000, fy = list.find(b => b.kind === 'ferry');
      for (const b of list) {
        let roll = 0, pitch = 0;
        if (b.kind === 'moor') { // moored: only the swell
          roll = Math.sin(T * 0.7 + b.ph) * 0.025; pitch = Math.sin(T * 0.5 + b.ph * 1.7) * 0.012;
        } else if (b.kind === 'sail') {
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
          const riders = cars.filter(c => b.onDeck(c.x, c.z)), allCars = cars.concat(gx && typeof npcs !== 'undefined' ? npcs.filter(c => c && c.alive !== false) : []);
          const landEnd = (() => { const P = LAND[b.side], sn = Math.sin(b.h), cs = Math.cos(b.h); return Math.sign((P.bx - b.x) * sn + (P.bz - b.z) * cs) || 1; })();
          if (b.wait > 0) {
            b.v = 0; const P = LAND[b.side];
            // nobody halfway up the ramp when it lifts; riders stopped on board: no need to wait for the timetable
            const onRamp = cars.some(c => { const dx = c.x - P.bx, dz = c.z - P.bz, s = dx * P.ax + dz * P.az; return s > -4 && s < P.len + 2 && Math.abs(dx * P.az - dz * P.ax) < P.hw + 1; }); // includes a car astride the gate
            b.still = riders.length && riders.every(c => Math.hypot(c.vx, c.vz) < 0.8) ? b.still + dt : 0;
            b.wait -= dt; if (b.still > 4 && b.wait > 2 && riders.some(c => !b.came.includes(c))) b.wait = 2; // only for those who came aboard here: who stays on after a crossing waits for the timetable
            if ((onRamp || pax.some(p => p.st === 'board' || (p.st === 'leave' && p.k < 4)) || fcars.some(f => f.st === 'board' || (f.st === 'leave' && f.k < 3))) && b.wait < 3) b.wait = 3; // (16 nov.) held with the gate down while a car or a foot passenger is on the ramp
            if (b.wait <= 0 && riders.length) for (const L of locals) if (riders.includes(L.car)) flashFor(L, 'NAVETTE', 'Cap sur ' + LAND[1 - b.side].name);
          } else {
            const left = Math.abs(goal - b.t), done = routeLen - left, want = Math.min(riders.length ? 11 : 8, 0.7 + left * 0.2, 0.7 + done * 0.3);
            b.v += (want - b.v) * Math.min(1, dt * 1.2); b.t += (b.side ? -1 : 1) * b.v * dt;
            if (left < 0.6) { for (const bn of b.benches || []) if (bn.broken) { bn.broken = false; for (const o of bn.parts) o.visible = true; } b.t = goal; b.side = 1 - b.side; b.wait = 25; b.v = 0; b.still = 0; b.came = riders.slice();
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
          // (16 nov., user request) the sides of the deck hold the cars in; the ends too, except the one facing the ramp while
          // the boat is alongside and its gate is down
          // the car is a box (4.3 x 2 m) turned on the deck: what it takes along each axis of the boat; the walls are the
          // benches along the sides, the lifeboat bay, the bulwarks at the ends; a gate lets cars through only once flat
          for (const c of allCars) c.onBoat = b.onDeck(c.x, c.z); // (no skid marks there: they would stay behind on the water)
          { const sn = Math.sin(b.h), cs = Math.cos(b.h);
            for (const c of allCars) {
              const dx = c.x - b.x, dz = c.z - b.z; if (dx * dx + dz * dz > 900) continue;
              let lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; let vx = c.vx * cs - c.vz * sn, vz = c.vx * sn + c.vz * cs, hit = false;
              const r = c.h - b.h, ex = Math.abs(Math.sin(r)) * 2.15 + Math.abs(Math.cos(r)) * 1, ez = Math.abs(Math.cos(r)) * 2.15 + Math.abs(Math.sin(r)) * 1;
              const end = Math.sign(lz), gt = (b.gates || []).find(g => g.out === end), shut = !gt || gt.open < 0.9;
              if (Math.abs(lz) < 19.6 && Math.abs(lx) < 9.5) { // aboard
                const bn = (b.benches || []).find(q => !q.broken && q.sd === Math.sign(lx) && Math.abs(q.lz - lz) < 1.2 + ez);
                if (bn && Math.abs(lx) + ex > 7.65 && Math.hypot(vx, vz) > 5) breakBench(b, bn, c);
                const lim = Math.abs(lz) > 15.5 ? 9 : lx < 0 && lz > -4 && lz < 1 ? 7 : bn && !bn.broken ? 7.65 : 8.05;
                if (Math.abs(lx) + ex > lim) { lx = Math.sign(lx) * (lim - ex); if (vx * lx > 0) vx *= -0.2; hit = true; }
                if (shut && Math.abs(lz) + ez > 19.6) { lz = end * (19.6 - ez); if (vz * lz > 0) vz *= -0.2; hit = true; }
              } else if (shut && Math.abs(lx) < 9.5 + ex && Math.abs(lz) - ez < 19.6 && Math.abs(lz) < 24) { // against a closed gate from the ramp
                lz = end * (19.6 + ez); if (vz * lz < 0) vz *= -0.2; hit = true;
              }
              if (hit) { c.x = b.x + lx * cs + lz * sn; c.z = b.z - lx * sn + lz * cs; c.vx = vx * cs + vz * sn; c.vz = -vx * sn + vz * cs; if (c.local && Math.hypot(vx, vz) > 4) sfx.impact(4); }
            } }
          paxStep(dt, allCars);
          { const g = (b.gates || []).find(q => q.out === landEnd); fcarStep(dt, b, landEnd, !!g && g.open > 0.95); }
          // dock 0 (Gare Maritime) is behind the boat (+z), dock 1 ahead (-z); closed again two seconds before leaving
          // (16 nov.) the gate that goes down is the one at the end facing the ramp of the dock it is at, worked out from where
          // the gate actually is (the fixed end per dock only lowered the right one at one of the two docks)
          for (const gt of b.gates || []) { const want = b.wait > 2 && gt.out === landEnd ? 1 : 0; gt.open = want ? Math.min(1, gt.open + dt * 0.5) : Math.max(0, gt.open - dt * 0.5); gt.hinge.rotation.x = gt.out * Math.PI / 2 * (gt.open * gt.open * (3 - 2 * gt.open)); }
          // green: gate down, come; orange: the gate is moving or about to lift; red: no boat, or leaving
          for (let k = 0; k < 2; k++) { const here = b.side === k && b.wait > 0, gt = here && (b.gates || []).find(g => g.out === landEnd), o = gt ? gt.open : 0;
            const st = !here ? 0 : o > 0.95 && b.wait > 6 ? 2 : o > 0.05 || b.wait > 2 ? 1 : 0;
            LAND[k].lights.forEach((l, i) => l.m.color.setHex(i === st ? l.col : new THREE.Color(l.col).multiplyScalar(0.12).getHex())); }
          b.wk.rotation.y = b.side ? Math.PI : 0; b.wk.position.z = b.side ? -20 : 20;
          roll = Math.sin(T * 0.45) * 0.006;
        }
        b.g.position.set(b.x, WATER_Y + Math.sin(T * 0.9 + b.ph) * (b.kind === 'sail' ? 0.07 : 0.02), b.z);
        b.g.rotation.set(pitch, b.h, 0); b.body.rotation.z = roll;
        b.wk.visible = b.v > 0.5; b.wk.scale.set(1, 1, Math.min(1, b.v / 3));
      }
    }
    return { build, step, list, LAND, ROUTE, pax, get ferry() { return fy; }, get curve() { return curve; }, get moored() { return moored; }, DOCK };
  })();
