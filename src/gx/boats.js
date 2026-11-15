  // =====================================================================================
  // Boats on the Loire: sailing boats that follow the channel and a car ferry (bac) that crosses to the island.
  // The hulls are downloaded models (see DATA-LICENSES.md), baked by tools/assets/bake_model.js into W.models:
  // one mesh each, colours per vertex, no texture. Scenery only for now: nothing collides with them.
  // =====================================================================================
  const Boats = (() => {
    const list = [], CH = [[60, 1150], [300, 800], [560, 600], [820, 480], [1250, 470], [1700, 470], [2050, 470]]; // middle of the channel, west to east
    const DOCK = [[1255, 396], [1295, 546]]; // ferry: Chantenay bank, island bank
    let curve = null, len = 0, built = false, wakeM = null;
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
      if (ferry) { const b = add('ferry', ferry, mat, 46, 9); b.t = 0; b.side = 0; b.wait = 8; b.v = 0; b.x = DOCK[0][0]; b.z = DOCK[0][1]; b.h = Math.atan2(-(DOCK[1][0] - DOCK[0][0]), -(DOCK[1][1] - DOCK[0][1])); }
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
          const a = DOCK[b.side], c = DOCK[1 - b.side], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
          if (b.wait > 0) { b.wait -= dt; b.v = 0; }
          else {
            const left = L - b.t, want = Math.min(4.6, 0.6 + left * 0.22, 0.6 + b.t * 0.3);
            b.v += (want - b.v) * Math.min(1, dt * 1.2); b.t += b.v * dt;
            if (b.t >= L) { b.t = 0; b.side = 1 - b.side; b.wait = 22; b.v = 0; }
          }
          const s = DOCK[b.side], e = DOCK[1 - b.side], f = b.wait > 0 ? 0 : b.t / L;
          b.x = s[0] + (e[0] - s[0]) * f; b.z = s[1] + (e[1] - s[1]) * f; // double-ended: the heading never changes
          b.wk.rotation.y = b.side ? Math.PI : 0; b.wk.position.z = b.side ? -20 : 20;
          roll = Math.sin(T * 0.45) * 0.006;
        }
        b.g.position.set(b.x, WATER_Y + Math.sin(T * 0.9 + b.ph) * (b.kind === 'sail' ? 0.07 : 0.02), b.z);
        b.g.rotation.set(pitch, b.h, 0); b.body.rotation.z = roll;
        b.wk.visible = b.v > 0.5; b.wk.scale.set(1, 1, Math.min(1, b.v / 3));
      }
    }
    return { build, step, list, get curve() { return curve; }, DOCK };
  })();
