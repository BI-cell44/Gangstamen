  // ---------- per-car effects ----------
  function carTick(c, dt) {
    const ud = c.mesh.userData, [fx_, fz_] = c.fwd, rx = -fz_, rz = fx_;
    const vf = c.vx * fx_ + c.vz * fz_, vr = c.vx * rx + c.vz * rz;
    const st = c._hd || (c._hd = { vf, h: c.h, acc: 0, yaw: 0, pitch: 0, roll: 0, dead: 0, wl: null, wr: null, e: 0 });
    damageLook(c);
    const idt = 1 / Math.max(dt, 0.004);
    st.acc += ((vf - st.vf) * idt - st.acc) * Math.min(1, dt * 6); st.vf = vf;
    let dh = c.h - st.h; if (dh > Math.PI) dh -= 6.283; if (dh < -Math.PI) dh += 6.283;
    st.yaw += (dh * idt - st.yaw) * Math.min(1, dt * 6); st.h = c.h;
    if (ud.bodyG) { // weight transfer
      const tp = Math.max(-0.045, Math.min(0.05, st.acc * 0.0035)), tr = Math.max(-0.075, Math.min(0.075, -st.yaw * vf * 0.0042));
      st.pitch += (tp - st.pitch) * Math.min(1, dt * 7); st.roll += (tr - st.roll) * Math.min(1, dt * 7);
      const fl = ud.flat >= 0 ? [0.03, -0.03, 0.03, -0.03][ud.flat] : 0, fp = ud.flat >= 0 ? (ud.flat < 2 ? 0.02 : -0.02) : 0;
      ud.bodyG.rotation.x = c.alive ? st.pitch + fp : 0.02; ud.bodyG.rotation.z = c.alive ? st.roll + fl : 0.05;
    }
    if (ud.tailM) ud.tailM.emissiveIntensity = !c.alive ? 0 : (st.acc < -5 && vf > 1 ? 9 : isNight ? 2.2 : 0.7);
    if (ud.headM) ud.headM.emissiveIntensity = !c.alive ? 0 : isNight ? 10 : 1.6;
    if (ud.spot) ud.spot.intensity = c.alive && isNight ? 2.2 : 0;
    const y = c.mesh.position.y, wb = ud.wb || 1.3, hw = ud.hw || 0.74;
    const lx = c.x - fx_ * wb - rx * hw, lz = c.z - fz_ * wb - rz * hw, rxw = c.x - fx_ * wb + rx * hw, rzw = c.z - fz_ * wb + rz * hw;
    if (!c.alive) {
      st.dead += dt; st.wl = st.wr = null;
      const k = Math.max(0, 1 - st.dead / 14);
      if (Math.random() < dt * 26 * k * q.parts) fire(c.x + rs() * 1.6, y + 0.7 + Math.random() * 0.5, c.z + rs() * 1.6, rs(), 1.5 + Math.random() * 2, rs(), 1.2 + Math.random() * 1.3, 0.5 + Math.random() * 0.4, 0.7 + k * 0.6);
      if (Math.random() < dt * (5 + 9 * k) * q.parts) smoke(c.x + rs(), y + 1.3, c.z + rs(), rs() + 0.6, 2.4 + Math.random() * 1.5, rs() + 0.3, 1.6, 3.2, 3 + Math.random() * 2, 0.03, 0.7);
      if (k > 0.2 && Math.random() < dt * 3) spark(c.x + rs(), y + 1, c.z + rs(), rs() * 5, 3 + Math.random() * 5, rs() * 5, 0.6);
      return;
    }
    st.dead = 0;
    // tyre smoke and skid marks when the rear steps out, on handbrake turns and hard launches
    const slip = Math.abs(vr), spin = st.acc > 9 && Math.abs(vf) < 11, lock = st.acc < -16 && Math.abs(vf) > 6;
    if ((slip > 3.2 && c.speed > 5) || spin || lock) {
      const amt = Math.min(1, Math.max(slip / 9, spin || lock ? 0.6 : 0));
      if (Math.random() < dt * 50 * amt * q.parts) {
        const side = Math.random() < 0.5;
        smoke(side ? lx : rxw, y + 0.15, side ? lz : rzw, c.vx * 0.25 + rs(), 0.5 + Math.random() * 0.8, c.vz * 0.25 + rs(), 0.7, 3.4, 1 + Math.random() * 0.8, 0.82, 0.3 + 0.3 * amt);
      }
      if (st.wl) { skidQuad(st.wl[0], st.wl[1], st.wl[2], lx, y + 0.035, lz); skidQuad(st.wr[0], st.wr[1], st.wr[2], rxw, y + 0.035, rzw); }
      st.wl = [lx, y + 0.035, lz]; st.wr = [rxw, y + 0.035, rzw];
    } else st.wl = st.wr = null;
    // rain: spray from the rear tyres
    if (amb.wet > 0.2 && c.speed > 7 && Math.random() < dt * 40 * q.parts) {
      const side = Math.random() < 0.5, k = Math.min(1, c.speed / 30) * amb.wet;
      smoke(side ? lx : rxw, y + 0.12, side ? lz : rzw, c.vx * 0.35 + rs() * 2, 0.8 + Math.random(), c.vz * 0.35 + rs() * 2, 0.4, 3, 0.55, 0.78, 0.22 * k);
    }
    // exhaust
    st.e += dt * (c.speed < 10 ? 9 : 3) * (st.acc > 2 ? 2.2 : 1);
    if (st.e > 1) { st.e = 0; const ex = c.x - fx_ * (ud.hl || 2.1) + rx * (hw - 0.3), ez = c.z - fz_ * (ud.hl || 2.1) + rz * (hw - 0.3); smoke(ex, y + 0.32, ez, -fx_ * 1.5 + c.vx * 0.5, 0.4, -fz_ * 1.5 + c.vz * 0.5, 0.2, 3.5, 0.6, 0.55, 0.1); }
    // damage: steam, then black smoke, then flames from the bonnet
    if (c.hp < 60) {
      const bx = c.x + fx_ * 1.3, bz = c.z + fz_ * 1.3, d = 1 - c.hp / 60;
      if (Math.random() < dt * (4 + 14 * d) * q.parts) smoke(bx + rs() * 0.5, y + 1.0, bz + rs() * 0.5, c.vx * 0.4 + rs(), 1.6 + Math.random(), c.vz * 0.4 + rs(), 0.6, 3.2, 1.3 + Math.random(), c.hp < 35 ? 0.05 : 0.5, 0.35 + 0.35 * d);
      if (c.hp < 20 && Math.random() < dt * 22 * q.parts) fire(bx + rs() * 0.6, y + 0.95, bz + rs() * 0.6, c.vx * 0.6, 1.2 + Math.random(), c.vz * 0.6, 0.5 + Math.random() * 0.4, 0.3 + Math.random() * 0.25, 0.8);
    }
  }
  function frame(dt, extra) {
    time += dt;
    if (extra) for (const c of extra) carTick(c, dt);
    if (amb.rain > 0.05) for (const L of locals) { // splashes on the ground around each player
      const nS = dt * 90 * amb.rain * q.parts;
      for (let i = 0; i < nS; i++) { const a = Math.random() * 6.283, d = 2 + Math.random() * 22, x = L.car.x + Math.cos(a) * d + L.car.vx * 0.4, z = L.car.z + Math.sin(a) * d + L.car.vz * 0.4;
        emit(0, x, surfaceH(x, z) + 0.4, z, 0, 1.4, 0, 0.12, 2.2, 0.22, 0.9, 0.92, 1, 0.5 * amb.rain, 0, 5); }
    }
    for (const c of allPlayerCars()) carTick(c, dt);
    for (const r of rivals) carTick(r, dt);
    updateParticles(dt);
    for (const l of flashes) if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = Math.max(0, l.userData.i0 * l.userData.t / l.userData.d); }
    for (const d of debris) {
      if (d.t <= 0) continue;
      d.t -= dt; const p = d.m.position; d.vy -= 22 * dt; p.x += d.vx * dt; p.y += d.vy * dt; p.z += d.vz * dt;
      const gy = surfaceH(p.x, p.z) + 0.4;
      if (p.y < gy) { p.y = gy; d.vy = -d.vy * 0.35; d.vx *= 0.6; d.vz *= 0.6; d.sx *= 0.5; d.sy *= 0.5; d.sz *= 0.5; }
      d.m.rotation.x += d.sx * dt; d.m.rotation.y += d.sy * dt; d.m.rotation.z += d.sz * dt;
      if (d.t <= 0) d.m.visible = false;
    }
    for (const r of rings) if (r.t > 0) { r.t += dt; const k = r.t / 0.5; r.m.scale.setScalar(1 + k * 22); r.m.material.color.setRGB(3 * (1 - k), 2 * (1 - k), 1 * (1 - k)); if (k >= 1) { r.t = 0; r.m.visible = false; } }
    for (const s of scorches) if (s.t > 0) { s.t -= dt; if (s.t < 8) s.m.material.opacity = 0.85 * s.t / 8; if (s.t <= 0) s.m.visible = false; }
    if (skDirty) { skGeo.attributes.position.needsUpdate = true; skDirty = false; }
    if (waterMatRef) { waterMatRef.normalMap.offset.x = time * 0.012; waterMatRef.normalMap.offset.y = time * 0.02; }
  }

