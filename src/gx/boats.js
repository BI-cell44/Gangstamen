  // =====================================================================================
  // Boats on the Loire: sailing boats that follow the channel and a car ferry (bac) that crosses to the island.
  // The hulls are downloaded models (see DATA-LICENSES.md), baked by tools/assets/bake_model.js into W.models:
  // one mesh each, colours per vertex, no texture. Scenery only for now: nothing collides with them.
  // =====================================================================================
  const Boats = (() => {
    const list = [], CH = [[60, 1150], [300, 800], [560, 600], [820, 490], [960, 482]]; // middle of the channel, west to east; they turn back before the shuttle's route round the tip of the island
    // the shuttle (user's choice, 15 Nov.): like the Navibus, from the Gare Maritime (quai de la Fosse) down the Madeleine arm
    // and round the tip of the île de Nantes to the Hangar à Bananes, by the grey Titan crane; it carries the players' cars
    const ROUTE = [[1339, -383], [1376, -348], [1300, -210], [1235, -50], [1150, 110], [1078, 250], [1092, 392], [1190, 440], [1300, 442], [1300, 401]];
    const LAND = [{ x: 1298, z: -402, h: Math.PI / 2, name: 'Gare Maritime' }, { x: 1300, z: 352, h: Math.PI, name: 'Île de Nantes' }]; // where a car waits and is set down; h: heading when set down (inland)
    const DECK_Y = 1.55, DOCK = [ROUTE[0], ROUTE[ROUTE.length - 1]];
    const MOORED = [1388, -468, Math.atan2(-0.69, 0.72)];
    let curve = null, len = 0, built = false, wakeM = null, moored = null, route = null, routeLen = 0, fy = null; const halos = [];
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
        const b = fy = add('ferry', ferry, mat, 46, 9); b.t = 0; b.side = 0; b.wait = 12; b.v = 0; b.cargo = [];
        DECKS.push((x, z) => { if (!b.cargo.length) return null; const dx = x - b.x, dz = z - b.z, s = Math.sin(b.h), c = Math.cos(b.h), lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < 9 && Math.abs(lz) < 21 ? WATER_Y + DECK_Y : null; });
        for (const L of LAND) { // a column of light where the car waits for the boat
          L.y = groundH(L.x, L.z);
          const m = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x4fd0ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
          m.position.set(L.x, L.y + 7, L.z); m.userData.hdLinear = true; m.renderOrder = 3; scene.add(m); halos.push(m);
        }
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
          const goal = b.side ? 0 : routeLen;
          if (b.wait > 0) {
            b.wait -= dt; b.v = 0;
            // a player's car waiting in the light, almost stopped: on board, and the boat leaves
            if (!b.cargo.length && typeof locals !== 'undefined') for (const L of locals) { const c = L.car, P = LAND[b.side]; if (c && c.alive && !c.aboard && Math.hypot(c.x - P.x, c.z - P.z) < 5.5 && Math.hypot(c.vx, c.vz) < 3) { c.aboard = { lx: b.cargo.length % 2 ? 3.6 : 0, lz: Math.floor(b.cargo.length / 2) * 6, rh: b.side ? Math.PI : 0 }; b.cargo.push(c); b.wait = Math.min(b.wait, 2.5); flashFor(L, 'NAVETTE', 'Cap sur ' + LAND[1 - b.side].name); } }
          } else {
            const left = Math.abs(goal - b.t), done = routeLen - left, want = Math.min(b.cargo.length ? 11 : 8, 0.7 + left * 0.2, 0.7 + done * 0.3);
            b.v += (want - b.v) * Math.min(1, dt * 1.2); b.t += (b.side ? -1 : 1) * b.v * dt;
            if (left < 0.6) { b.t = goal; b.side = 1 - b.side; b.wait = 25; b.v = 0;
              for (const c of b.cargo) { const P = LAND[b.side]; c.aboard = null; c.place(P.x, P.z, P.h); const L = locals.find(l => l.car === c); if (L) flashFor(L, P.name.toUpperCase(), 'Terminus de la navette'); }
              b.cargo.length = 0; }
          }
          const u = Math.min(1, Math.max(0, b.t / routeLen)), p = route.getPointAt(u), tg = route.getTangentAt(u);
          b.x = p.x; b.z = p.z; b.h = Math.atan2(-tg.x, -tg.z); // double-ended: same heading both ways
          for (const c of b.cargo) { const a = c.aboard, s = Math.sin(b.h), co = Math.cos(b.h); c.x = b.x + a.lx * co + a.lz * s; c.z = b.z - a.lx * s + a.lz * co; c.h = b.h + a.rh; c.vx = c.vz = 0; }
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
