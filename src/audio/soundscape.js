// ---------- soundscape (sound v2): the player's car, the cars around, the places ----------
// Called every frame from the game loop with the first local player. Works in every build: the places come from the
// shared world (relief, Loire, tram, Sainte-Anne); the crowd only where the HD game module has pedestrians.
const Soundscape = (() => {
  let gullT = 5, lastHour = -1, placeT = 0, place = { water: 0, crowd: 0, tram: 0, brake: 0 }, cob = null;
  const dir = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3();
  const key = (x, z) => ((x + 4000) >> 1) * 10000 + ((z + 4000) >> 1);
  function cobbles() { // 2 m cells covered by a cobbled street or square (OSM surface=sett / cobblestone / paving_stones)
    cob = new Set();
    for (const r of W.roads) {
      if (!r.s) continue; const p = r.p, w = r.w / 2 + 0.5;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5);
        for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; for (let dx = -w; dx <= w; dx += 1.5) for (let dz = -w; dz <= w; dz += 1.5) cob.add(key(x + dx, z + dz)); }
      }
    }
  }
  // the hour the bells of Sainte-Anne strike: the game clock when the day cycle runs (HD), otherwise the real time
  function hourNow() {
    if (HD && hd.amb && hd.amb.cycle) { // clock 0..1 -> 13 h at 0, 18 h at 0.32, 21 h at 0.53, 5 h at 0.88, 13 h at 1
      const P = [[0, 13], [0.32, 18], [0.45, 20], [0.53, 21], [0.6, 22], [0.88, 29], [0.94, 30], [0.97, 31], [1, 37]], c = hd.amb.clock;
      for (let i = 1; i < P.length; i++) if (c <= P[i][0]) return Math.floor(P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (c - P[i - 1][0]) / (P[i][0] - P[i - 1][0])) % 24;
    }
    // (16 nov.) a fixed time of day sets the hour too: terraces, crowds and bells used the computer's clock, so at 1 am
    // under a sunset sky the terraces were empty
    if (HD && typeof settings !== 'undefined' && { day: 1, sunset: 1, night: 1 }[settings.tod]) return { day: 13, sunset: 19, night: 22 }[settings.tod];
    return new Date().getHours();
  }
  let stPos = null; // the church (a landmark in HD; in the classic build, the building of that name)
  function stAnne() {
    if (stPos) return stPos;
    const st = landmarks.find(o => o.k === 'stAnne'); if (st) return (stPos = [st.x, st.z]);
    const b = W.buildings.find(o => o.n === 'Église Sainte-Anne'); if (!b) return (stPos = [1e9, 1e9]);
    const p = b.p; let x = 0, z = 0; for (let i = 0; i < p.length; i += 2) { x += p[i]; z += p[i + 1]; } return (stPos = [x / (p.length / 2), z / (p.length / 2)]);
  }
  function slipOf(c, inp) {
    if ((c.air || 0) > 0.25) return 0;
    const [fx, fz] = c.fwd, vf = c.vx * fx + c.vz * fz, vr = Math.abs(c.vx * -fz + c.vz * fx), sp = Math.hypot(c.vx, c.vz);
    let s = (vr - 1.6) / 6;
    if (c.phys && useRealPhysics(c)) s = Math.max(s, (c.phys.slipR - 0.1) * 4);
    if (inp.hb && sp > 6) s = Math.max(s, 0.55);
    if (inp.t < 0 && vf > 14) s = Math.max(s, 0.3); // hard braking at speed
    if (inp.t > 0.8 && vf > 0 && vf < 4 && (c._es && c._es.gear === 1)) s = Math.max(s, 0.25); // wheelspin off the line
    return s;
  }
  function tick(dt, L) {
    if (!sfx.ctx || !L) return;
    if (!cob) cobbles();
    const c = L.car, inp = L._inp || { t: 0, s: 0 }, alive = c && c.alive;
    // the player's car
    if (c) {
      const s = engineState(c, alive ? inp.t : 0), sp = Math.hypot(c.vx, c.vz);
      const onCob = alive && sp > 2 && (c.air || 0) < 0.2 && cob.has(key(c.x, c.z)) ? Math.min(0.14, 0.03 + sp * 0.006) : 0;
      sfx.car(s, !!alive, alive ? slipOf(c, inp) : 0, onCob, !!(vehOf(c).turbo));
    }
    // the listener is the camera; its right vector gives the stereo side
    const cam = L.cam || camera, lx = cam.position.x, lz = cam.position.z; cam.getWorldDirection(dir); right.crossVectors(dir, UP).normalize();
    const lvx = c ? c.vx : 0, lvz = c ? c.vz : 0;
    // the 4 nearest other cars: engine with distance, side and Doppler (343 m/s)
    const cand = [];
    const pool = [...rivals, ...(gx ? gx.cars() : []), ...allPlayerCars()];
    for (const o of pool) {
      if (!o || o === c || !o.alive || !o.mesh || !o.mesh.visible) continue;
      const d = Math.hypot(o.x - lx, o.z - lz); if (d < 110) cand.push([d, o]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const list = cand.slice(0, 4).map(([d, o]) => {
      const sp = Math.hypot(o.vx || 0, o.vz || 0), acc = sp - (o._sv || 0); o._sv = sp;
      const s = engineState(o, acc > 0.01 ? 0.8 : 0.15), ux = (lx - o.x) / (d || 1), uz = (lz - o.z) / (d || 1);
      const rel = ((o.vx || 0) - lvx) * ux + ((o.vz || 0) - lvz) * uz; // > 0: coming closer
      const f = Math.max(0.8, Math.min(1.25, 343 / (343 - rel)));
      const k = Math.min(1, 9 / (d + 3)) ** 2 * 0.8;
      return { s, k, f, pan: Math.max(-1, Math.min(1, (-(ux) * right.x - uz * right.z))) };
    });
    sfx.others(list);
    // places, every quarter second: the Loire (relief under the water level nearby), the crowd, the tram
    placeT -= dt;
    if (placeT <= 0) {
      placeT = 0.25;
      let dw = 1e9; for (let a = 0; a < 8; a++) for (const r of [0, 30, 60, 100]) { const x = lx + Math.cos(a * 0.785) * r, z = lz + Math.sin(a * 0.785) * r; if (groundH(x, z) < WATER_Y) { dw = Math.min(dw, r); break; } }
      place.water = dw > 1e8 ? 0 : Math.max(0, 1 - dw / 110);
      let n = 0;
      if (gx && gx.peds) for (const p of gx.peds()) if (p.on && Math.abs(p.x - lx) < 35 && Math.abs(p.z - lz) < 35) n++;
      if (gx && gx.customers) for (const p of gx.customers()) if (Math.abs(p.x - lx) < 30 && Math.abs(p.z - lz) < 30) n += 1.5;
      place.crowd = Math.min(1, n / 14);
      let tr = 0, br = 0;
      for (const T of trams) {
        if (T.sleep > 0) continue; const tz = (T.dir > 0 ? tramS : tramN)(T.x), d = Math.hypot(T.x - lx, tz - lz);
        if (d > 120) continue; const k = 1 - d / 120;
        tr = Math.max(tr, k * Math.min(1, T.v / 8) * (0.4 + 0.6 * k));
        if (T._pv !== undefined && T._pv - T.v > 0.4 && T.v > 0.5 && T.v < 7) br = Math.max(br, k); // braking for the station
        T._pv = T.v;
      }
      place.tram = tr; place.brake = br;
    }
    sfx.places(place);
    // gulls over the river
    gullT -= dt;
    if (gullT <= 0) { gullT = 5 + Math.random() * 12; if (place.water > 0.25) sfx.gull(0.025 + 0.04 * place.water); }
    // Sainte-Anne strikes the hour (once per hour, up to about 700 m)
    const h = hourNow();
    if (h !== lastHour) {
      if (lastHour >= 0) { const [sx, sz] = stAnne(), d = Math.hypot(sx - lx, sz - lz); if (d < 700) sfx.bells(h % 12 || 12, 0.14 * (1 - d / 750)); }
      lastHour = h;
    }
    // music and ambience duck while a dialogue is shown or spoken
    let talk = false; const dl = document.getElementById('dlg'); if (dl && !dl.hidden) talk = true;
    try { if (window.speechSynthesis && speechSynthesis.speaking) talk = true; } catch (e) { }
    sfx.duck(talk);
  }
  // silence everything that belongs to a running game (back to the menu, end of a match)
  function hush() { if (!sfx.ctx) return; sfx.car({ rpm: 900, load: 0, gear: 1, shift: 0 }, false, 0, 0, false); sfx.others([]); sfx.places({ water: 0, crowd: 0, tram: 0, brake: 0 }); }
  return { tick, hush, hourNow, stAnne, _place: place, ring() { lastHour = (hourNow() + 1) % 24; } };
})();
