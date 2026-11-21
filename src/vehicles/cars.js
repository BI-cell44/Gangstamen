// ---------- cars: low-poly 90s saloons and hatchbacks built from extruded side profiles ----------
const CAR_STYLES = {
  // s = metres along the car (front positive), y = height. Body and greenhouse silhouettes.
  saloon: {
    L: 4.45, W: 1.74, wb: 1.36, wr: 0.32,
    body: [[2.24, 0.34], ['arcF'], ['arcR'], [-2.22, 0.34], [-2.27, 0.58], [-2.2, 0.98], [-1.32, 1.03], [0.92, 1.01], [2.0, 0.88], [2.27, 0.74]],
    cabin: [[-1.3, 1.0], [-0.72, 1.43], [0.32, 1.45], [0.94, 0.99]],
    spoiler: false,
  },
  hatch: {
    L: 3.95, W: 1.7, wb: 1.24, wr: 0.31,
    body: [[1.98, 0.34], ['arcF'], ['arcR'], [-1.9, 0.34], [-1.97, 0.62], [-1.93, 1.0], [-1.7, 1.04], [0.72, 1.0], [1.78, 0.86], [2.0, 0.72]],
    cabin: [[-1.88, 1.0], [-1.62, 1.46], [0.12, 1.48], [0.74, 0.99]],
    spoiler: true,
  },
  // street traffic of 1996 (HD bodies in hd.js; the classic build reuses the hatch silhouette)
  r5: { L: 3.52, W: 1.53, wb: 1.2, wr: 0.29, body: [[1.74, 0.34], ['arcF'], ['arcR'], [-1.7, 0.34], [-1.76, 0.6], [-1.74, 0.99], [-1.5, 1.0], [0.6, 0.97], [1.55, 0.84], [1.76, 0.7]],
    cabin: [[-1.68, 0.99], [-1.5, 1.44], [0.05, 1.47], [0.62, 0.97]], spoiler: false },
  p205: { L: 3.7, W: 1.57, wb: 1.21, wr: 0.3, body: [[1.83, 0.34], ['arcF'], ['arcR'], [-1.8, 0.34], [-1.85, 0.6], [-1.8, 0.97], [-1.55, 1.0], [0.65, 0.96], [1.62, 0.82], [1.85, 0.68]],
    cabin: [[-1.74, 0.97], [-1.35, 1.42], [0.1, 1.45], [0.72, 0.96]], spoiler: false },
  // (cycle 13) new categories: a 90s sports coupé (an original design), a tall utility van, the police saloon
  sport: { L: 4.3, W: 1.78, wb: 1.3, wr: 0.32, body: [[2.13, 0.32], ['arcF'], ['arcR'], [-2.1, 0.32], [-2.15, 0.55], [-2.1, 0.86], [-1.2, 0.9], [0.9, 0.86], [1.95, 0.68], [2.15, 0.58]],
    cabin: [[-1.45, 0.88], [-0.55, 1.26], [0.25, 1.27], [1.0, 0.87]], spoiler: true },
  van: { L: 4.6, W: 1.84, wb: 1.45, wr: 0.33, body: [[2.28, 0.36], ['arcF'], ['arcR'], [-2.25, 0.36], [-2.3, 0.6], [-2.3, 1.1], [-2.0, 1.12], [1.3, 1.1], [2.05, 0.94], [2.3, 0.78]],
    cabin: [[-2.28, 1.1], [-2.25, 1.97], [1.2, 1.98], [1.9, 1.1]], spoiler: false },
  twingo: { L: 3.43, W: 1.63, wb: 1.17, wr: 0.3, body: [[1.69, 0.34], ['arcF'], ['arcR'], [-1.66, 0.34], [-1.71, 0.6], [-1.68, 1.0], [-1.4, 1.02], [0.9, 0.98], [1.5, 0.86], [1.71, 0.72]],
    cabin: [[-1.62, 1.0], [-1.45, 1.62], [-0.2, 1.68], [0.3, 1.62], [1.2, 1.0]], spoiler: false },
};
CAR_STYLES.police = CAR_STYLES.saloon; // the police saloon: same body, its own livery
function plateTexture(text, rear) {
  const [c, g] = canvas(128, 32);
  g.fillStyle = rear ? '#f2c230' : '#f4f1e8'; g.fillRect(0, 0, 128, 32);
  g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 125, 29);
  g.fillStyle = '#111'; g.font = 'bold 21px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 17);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
// paint + panel lines for the body sides (shape UVs are metres along / up the car)
function paintTexture(st, paint, stripe, trim) {
  const PX = 96, Wd = Math.round(st.L * PX) + 40, Hd = Math.round(1.6 * PX);
  const [c, g] = canvas(Wd, Hd);
  const X = s => (s + st.L / 2 + 0.2) * PX, Y = y => Hd - y * PX;
  g.fillStyle = paint; g.fillRect(0, 0, Wd, Hd);
  // light gradient: darker sills, lighter shoulder line
  const lg = g.createLinearGradient(0, Y(1.05), 0, Y(0.3)); lg.addColorStop(0, 'rgba(255,255,255,.18)'); lg.addColorStop(0.45, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = lg; g.fillRect(0, 0, Wd, Hd);
  if (stripe) { g.fillStyle = stripe; g.fillRect(0, Y(0.86), Wd, 0.07 * PX); g.fillRect(0, Y(0.76), Wd, 0.025 * PX); }
  // rubbing strip
  g.fillStyle = trim; g.fillRect(0, Y(0.62), Wd, 0.06 * PX);
  // door seams
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2;
  const doors = st.L > 4.2 ? [0.9, -0.28, -1.32] : [0.72, -0.9];
  for (const s of doors) { g.beginPath(); g.moveTo(X(s), Y(1.0)); g.lineTo(X(s - 0.04), Y(0.38)); g.stroke(); }
  g.beginPath(); g.moveTo(X(doors[0]), Y(0.38)); g.lineTo(X(doors[doors.length - 1]), Y(0.38)); g.stroke();
  // handles
  g.fillStyle = 'rgba(20,20,24,.85)';
  for (let i = 0; i < doors.length - 1; i++) g.fillRect(X(doors[i + 1]) + 0.12 * PX, Y(0.9), 0.16 * PX, 0.035 * PX);
  // fuel cap
  g.beginPath(); g.arc(X(-st.L / 2 + 0.75), Y(0.84), 0.06 * PX, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.repeat.set(1 / (Wd / PX), 1 / (Hd / PX)); t.offset.set((st.L / 2 + 0.2) / (Wd / PX), 0);
  t.anisotropy = 4;
  return t;
}
function profileShape(pts, st) {
  const sh = new THREE.Shape();
  pts.forEach((p, i) => {
    if (p[0] === 'arcF' || p[0] === 'arcR') {
      const cx = p[0] === 'arcF' ? st.wb : -st.wb, r = st.wr + 0.1;
      sh.lineTo(cx + r, 0.34); sh.absarc(cx, 0.34, r, 0, Math.PI, false); sh.lineTo(cx - r, 0.34);
    } else if (i === 0) sh.moveTo(p[0], p[1]); else sh.lineTo(p[0], p[1]);
  });
  sh.closePath();
  return sh;
}
function extrudeSide(shape, width, bevel) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  geo.rotateY(Math.PI / 2);                 // shape s -> -z (front of the car is -z), extrusion -> x
  geo.translate(-(width - 2 * bevel) / 2, 0, 0);
  return geo;
}
let plateNo = 0;
function makeCar(paint, stripe, isPlayer, styleName, opts) {
  if (HD) return hd.makeCar(paint, stripe, isPlayer, styleName, opts);
  const st = CAR_STYLES[styleName || (isPlayer ? 'saloon' : 'hatch')];
  const g = new THREE.Group();
  const hex = '#' + new THREE.Color(paint).getHexString();
  const sideTex = paintTexture(st, hex, stripe ? '#' + new THREE.Color(stripe).getHexString() : null, '#1d1b20');
  const mSide = new THREE.MeshPhongMaterial({ map: sideTex, shininess: 70, specular: 0x666666 });
  const mPaint = new THREE.MeshPhongMaterial({ color: paint, shininess: 70, specular: 0x666666 });
  const mGlass = new THREE.MeshPhongMaterial({ color: 0x1b2433, shininess: 120, specular: 0xaaaaaa, emissive: 0x05080d });
  const mBlack = new THREE.MeshLambertMaterial({ color: 0x141317 });
  const mTrim = new THREE.MeshPhongMaterial({ color: 0x2a2a2e, shininess: 20 });
  const mChrome = new THREE.MeshPhongMaterial({ color: 0xc9cbd0, shininess: 120, specular: 0xffffff });
  const mHead = new THREE.MeshPhongMaterial({ color: 0xfff6d8, emissive: 0x8a8060, shininess: 90 });
  const mTail = new THREE.MeshPhongMaterial({ color: 0xb01818, emissive: 0x400000, shininess: 60 });
  const mInd = new THREE.MeshPhongMaterial({ color: 0xff9a1f, emissive: 0x301500 });
  const add = (geo, m, x, y, z, cast = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; g.add(o); return o; };
  const box = (w, h, d, m, x, y, z) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const L = st.L, W = st.W, hl = L / 2;
  const fz = -Math.max(...st.body.filter(p => typeof p[0] === 'number').map(p => p[0])) - 0.012;
  const rz = -Math.min(...st.body.filter(p => typeof p[0] === 'number').map(p => p[0])) + 0.012;

  // body shell: side panels get the painted texture, top/bottom surfaces the plain paint
  const body = new THREE.Mesh(extrudeSide(profileShape(st.body, st), W, 0.07), [mSide, mPaint]);
  body.castShadow = true; g.add(body);
  // greenhouse: glass sides, painted roof and pillars
  const cabW = W * 0.86;
  const cab = new THREE.Mesh(extrudeSide(profileShape(st.cabin, st), cabW, 0.05), [mGlass, mPaint]);
  cab.castShadow = true; g.add(cab);
  // windscreen and rear window panes laid on the sloped faces
  const cp = st.cabin;
  const mPane = new THREE.MeshPhongMaterial({ color: 0x1e2a3c, shininess: 140, specular: 0xbbbbbb, emissive: 0x06090f, side: THREE.DoubleSide });
  const cs = (cp[0][0] + cp[2][0]) / 2, cyy = (cp[0][1] + cp[2][1]) / 2;
  const pane = (a, b) => { // quad on a sloped greenhouse face, nudged outwards
    const [s1, y1] = a, [s2, y2] = b, hw = cabW / 2 - 0.06;
    let nz = -(y2 - y1), ny = s2 - s1; // perpendicular in the (s, y) plane
    const nl = Math.hypot(nz, ny) || 1; nz /= nl; ny /= nl;
    const ms = (s1 + s2) / 2, my = (y1 + y2) / 2;
    if ((ms + nz * 0.1 - cs) ** 2 + (my + ny * 0.1 - cyy) ** 2 < (ms - cs) ** 2 + (my - cyy) ** 2) { nz = -nz; ny = -ny; }
    const o = 0.025, P = (s, y, x) => [x, y + ny * o, -(s + nz * o)];
    const geo = new THREE.BufferGeometry();
    const v = [...P(s1, y1, -hw), ...P(s1, y1, hw), ...P(s2, y2, hw), ...P(s1, y1, -hw), ...P(s2, y2, hw), ...P(s2, y2, -hw)];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mPane));
  };
  pane(cp[3], cp[2]); pane(cp[0], cp[1]);
  // B-pillar
  const bp = st.L > 4.2 ? -0.22 : -0.62;
  box(cabW + 0.01, 0.42, 0.08, mPaint, 0, 1.22, -bp);
  // chassis between the wheel arches (hides the see-through arch cut-outs)
  box(W - 0.42, 0.42, L - 0.5, mBlack, 0, 0.5, 0);
  // bumpers wrapping the ends
  box(W + 0.04, 0.2, 0.18, mTrim, 0, 0.47, -hl - 0.02);
  box(W + 0.04, 0.2, 0.18, mTrim, 0, 0.47, hl + 0.02);
  // grille + headlights + indicators
  box(W * 0.46, 0.13, 0.04, mBlack, 0, 0.7, fz + 0.005);
  box(W * 0.48, 0.02, 0.05, mChrome, 0, 0.775, fz + 0.005);
  const heads = [];
  for (const sx of [-1, 1]) {
    heads.push(box(0.36, 0.13, 0.04, mHead, sx * (W / 2 - 0.27), 0.7, fz));
    box(0.1, 0.13, 0.04, mInd, sx * (W / 2 - 0.06), 0.7, fz + 0.01);
  }
  // tail lights: wide red bar with a dark centre panel, and reversing lights
  const tails = [];
  for (const sx of [-1, 1]) tails.push(box(0.5, 0.15, 0.04, mTail, sx * (W / 2 - 0.3), 0.8, rz));
  box(W - 1.1, 0.15, 0.04, mBlack, 0, 0.8, rz + 0.002);
  // plates (French 1996: white front, yellow rear)
  const pn = (isPlayer ? '1996 GS 44' : (4100 + (plateNo++) * 37) + ' RB 44');
  add(new THREE.PlaneGeometry(0.52, 0.12), new THREE.MeshLambertMaterial({ map: plateTexture(pn, false) }), 0, 0.5, -hl - 0.12, false).rotation.y = Math.PI;
  add(new THREE.PlaneGeometry(0.52, 0.12), new THREE.MeshLambertMaterial({ map: plateTexture(pn, true) }), 0, 0.64, rz + 0.01, false);
  // mirrors, exhaust, aerial
  for (const sx of [-1, 1]) { box(0.16, 0.1, 0.07, mTrim, sx * (W / 2 + 0.06), 1.07, -(cp[3][0] - 0.12)); }
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8).rotateX(Math.PI / 2), mChrome, W / 2 - 0.35, 0.3, hl + 0.06);
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4), mBlack, -W / 2 + 0.2, 1.35, hl - 0.6);
  if (st.spoiler) { box(cabW, 0.05, 0.28, mPaint, 0, cp[1][1] + 0.03, -cp[1][0] + 0.12); }
  // wheels: tyre, alloy rim with spokes, hub; front ones steer
  const wheels = [], steer = [];
  const tyreG = new THREE.CylinderGeometry(st.wr, st.wr, 0.22, 16).rotateZ(Math.PI / 2);
  const rimG = new THREE.CylinderGeometry(st.wr * 0.64, st.wr * 0.64, 0.23, 12).rotateZ(Math.PI / 2);
  const spokeG = new THREE.BoxGeometry(0.235, st.wr * 1.15, 0.05);
  const mRim = new THREE.MeshPhongMaterial({ color: isPlayer ? 0xd9b25a : 0x9da1a8, shininess: 90, specular: 0xffffff });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * (W / 2 - 0.13), st.wr, sz * st.wb); g.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const tyre = new THREE.Mesh(tyreG, mBlack); tyre.castShadow = true; spin.add(tyre);
    spin.add(new THREE.Mesh(rimG, mRim));
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(spokeG, mRim); sp.rotation.x = k * Math.PI * 2 / 5; spin.add(sp); }
    wheels.push(spin); if (sz < 0) steer.push(pivot);
  }
  // twin machine guns on the bonnet
  const gunM = new THREE.MeshPhongMaterial({ color: 0x2b2b2b, shininess: 40 });
  const muzzles = [];
  for (const sx of [-0.42, 0.42]) {
    const gz = -(st.body[st.body.length - 3][0] + 0.45);
    box(0.16, 0.12, 0.42, gunM, sx, 1.03, gz);
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 8).rotateX(Math.PI / 2), gunM, sx, 1.05, gz - 0.55);
    const mz = new THREE.Object3D(); mz.position.set(sx, 1.05, gz - 0.97); g.add(mz); muzzles.push(mz);
  }
  g.userData.muzzles = muzzles;
  if (isPlayer) {
    const spot = new THREE.SpotLight(0xfff0c8, 0, 90, 0.5, 0.5, 1.2);
    spot.position.set(0, 0.9, -hl); spot.target.position.set(0, 0, -20);
    g.add(spot, spot.target); g.userData.spot = spot;
  }
  g.userData.wheels = wheels; g.userData.steer = steer; g.userData.mBody = mSide; g.userData.mPaint = mPaint;
  g.userData.base = 0xffffff; g.userData.paint = paint; g.userData.tail = mTail; g.userData.head = mHead;
  scene.add(g);
  return g;
}

const R_CAR = 2.0;
class Car {
  constructor(mesh, player) {
    Object.assign(this, { mesh, player, x: 0, z: 0, h: 0, vx: 0, vz: 0, hp: 100, alive: true, steer: 0, wreck: 0, fireCd: 0, ai: null });
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
  get fwd() { return [-Math.sin(this.h), -Math.cos(this.h)]; }
  place(x, z, h) { this.x = x; this.z = z; this.h = h; this.vx = this.vz = 0; this.yb = undefined; this.yv = 0; this.air = 0; this.nitro = 0; this.sink = 0; this._sp = undefined; this._ap = undefined; this._pe = this._re = this._pev = this._rev = this.sq = this.sqv = 0; this.jt = null; if (this.phys) { this.phys.r = 0; this.phys.gear = 1; this.phys.ax = 0; } this.sync(); }
  sync() {
    const [fx, fz] = this.fwd, rx = -fz, rz = fx, wb = this.bus ? 4.4 : 1.7; // (16 nov., user) the bus's axles are far apart: measured there, its ends no longer dig into a bump
    let hf = surfaceH(this.x + fx * wb, this.z + fz * wb), hb = surfaceH(this.x - fx * wb, this.z - fz * wb);
    let hr = surfaceH(this.x + rx * 0.9, this.z + rz * 0.9), hl = surfaceH(this.x - rx * 0.9, this.z - rz * 0.9);
    if (this.sink > 0) { // in the Loire: floats a moment, then goes down nose first
      const d = this.sink < 0.6 ? 0.25 : 0.25 + (this.sink - 0.6) * 0.75;
      if (this._sp === undefined) { this._sp = this.mesh.rotation.x; this._sr = this.mesh.rotation.z; } // (16 nov., user) it keeps the angle it hit the water at, then goes down nose first
      this.mesh.position.set(this.x, WATER_Y + 0.25 - d, this.z); this.mesh.rotation.set(Math.max(-1.1, this._sp - Math.min(0.5, this.sink * 0.22)), this.h, this._sr + Math.sin(this.sink * 2.3) * 0.07, 'YXZ'); return;
    }
    // a wheel over a drop (the edge of the ferry's deck, a quay) does not lay the car on its side: the body leans as if
    // the ground went on a little lower, no more (15 Nov.: the car lay over on the deck's edge)
    { const h0 = surfaceH(this.x, this.z); hr = Math.max(hr, h0 - 0.35); hl = Math.max(hl, h0 - 0.35);
      if (groundH(this.x, this.z) < WATER_Y + 0.9) { // over the water (ferry, ramp, bridge): a wheel past the edge counts as level with the car, no lean at all (user, 16 Nov.)
        const void_ = (x, z) => groundH(x, z) < WATER_Y + 0.9 && deckH(x, z) === null;
        if (void_(this.x + fx * 1.7, this.z + fz * 1.7)) hf = h0; if (void_(this.x - fx * 1.7, this.z - fz * 1.7)) hb = h0;
        if (void_(this.x + rx * 0.9, this.z + rz * 0.9)) hr = h0; if (void_(this.x - rx * 0.9, this.z - rz * 0.9)) hl = h0;
      } }
    // (20 nov.) jumps: in the air the body keeps the pitch and roll rates it had when it left the ground, the nose slowly
    // drops; on landing the body sinks on its springs (sq, set by the landing in vertical()) and the difference between its
    // attitude in the air and the ground's comes back with a damped bounce. Real time, so the same at any frame rate
    const now = performance.now(), sdt = Math.min(0.05, Math.max(0, (now - (this._st || now)) / 1000)); this._st = now;
    const gp = Math.atan2(hf - hb, wb * 2), groll = Math.atan2(hr - hl, 1.8), base = Math.max(surfaceH(this.x, this.z), (hf + hb) / 2) + 0.34;
    if (this.air > 0.2) {
      if (this._ap === undefined) { this._ap = this._gp ?? gp; this._ar = this._gr ?? groll; this._apv = Math.max(-1.2, Math.min(1.2, this._gpv || 0)); this._arv = Math.max(-1, Math.min(1, this._grv || 0)); }
      this._apv = (this._apv - 0.6 * sdt) * Math.exp(-0.4 * sdt); this._arv *= Math.exp(-1.5 * sdt);
      this._ap = Math.max(-0.75, Math.min(0.6, this._ap + this._apv * sdt)); this._ar = Math.max(-0.5, Math.min(0.5, this._ar + this._arv * sdt));
      this.mesh.position.set(this.x, base + this.air, this.z); this.mesh.rotation.set(this._ap, this.h, this._ar, 'YXZ'); return;
    }
    if (this._ap !== undefined) { this._pe = Math.max(-0.5, Math.min(0.5, this._ap - gp)); this._re = Math.max(-0.4, Math.min(0.4, this._ar - groll)); this._pev = this._rev = 0; this._ap = undefined; }
    // the ground's pitch and roll rates, handed to the body at the next take-off
    if (sdt > 0) { this._gpv = (gp - (this._gp ?? gp)) / sdt; this._grv = (groll - (this._gr ?? groll)) / sdt; } this._gp = gp; this._gr = groll;
    if (this._pe || this._re || this.sq || this.sqv) {
      this._pe = this._pe || 0; this._re = this._re || 0; this._pev = this._pev || 0; this._rev = this._rev || 0;
      this._pev += (-150 * this._pe - 13 * this._pev) * sdt; this._pe += this._pev * sdt;
      this._rev += (-170 * this._re - 15 * this._rev) * sdt; this._re += this._rev * sdt;
      this.sqv = (this.sqv || 0) + (-190 * (this.sq || 0) - 17 * (this.sqv || 0)) * sdt; this.sq = Math.max(-0.12, Math.min(0.32, (this.sq || 0) + this.sqv * sdt));
      if (Math.abs(this._pe) + Math.abs(this._pev) * 0.05 < 1e-3 && Math.abs(this._re) + Math.abs(this._rev) * 0.05 < 1e-3 && Math.abs(this.sq) + Math.abs(this.sqv) * 0.05 < 1e-3) this._pe = this._re = this._pev = this._rev = this.sq = this.sqv = 0; this.jt = null;
    }
    this.mesh.position.set(this.x, base - (this.sq || 0), this.z);
    this.mesh.rotation.set(gp + (this._pe || 0), this.h, groll + (this._re || 0), 'YXZ');
  }
}

// a car in the river: it drifts on a little, goes under, and its driver is back on dry land a moment later
function sinking(c, dt) {
  c.sink += dt; const k = Math.exp(-4.5 * dt); // the water stops it within a few metres c.vx *= k; c.vz *= k; c.x += c.vx * dt; c.z += c.vz * dt; c.air = 0; c.yv = 0;
  if (Math.random() < dt * 9) spawnFx(c.x + (Math.random() - 0.5) * 2.4, WATER_Y + 0.2, c.z + (Math.random() - 0.5) * 3.4, 0.35, 0xe8f4f8, 0.25, 2, 1.2); // bubbles
  if (c.sink > 3.2 && c.alive) { c.alive = false; c.hp = 0;
    // (21 nov., audit UX) a Rapace pushed or shot into the Loire is the player's KO
    if (c.botIndex !== undefined && c.lastHitBy && c.lastHitBy.alive && performance.now() - (c.lastHitT || 0) < 8000 && typeof credit === 'function') credit(c.lastHitBy, 150, botLabel(c) + ' : plongeon dans la Loire'); if (c.owner) c.owner.deadT = 1.4; if (!c.local) { c.wreck = 1.5; c.dead = 0; c.mesh.visible = false; c.vx = c.vz = 0; } } // a bot under water: gone, then back as a wreck would
  return 0;
}
function drive(c, inp, dt) {
  if (c.sink > 0) return sinking(c, dt); // (16 nov., user) in the water: no more throttle, brake or steering, it drifts and sinks
  const real = useRealPhysics(c);
  if (real) planarReal(c, inp, dt); else planarArcade(c, inp, dt);
  const ox = c.x, oz = c.z;
  c.x += c.vx * dt; c.z += c.vz * dt;
  // The Loire. A bridge or the ferry carries the car. A player's car that leaves the quay, the ramp or the deck falls in
  // and sinks (Ultra, 15 Nov.); the others (bots, traffic, classic and HD builds) are still turned back at the water's edge.
  const wet = groundH(c.x, c.z) < WATER_Y + 0.9 && deckH(c.x, c.z) === null, canSink = HD && ULTRA && (c.local || ((!c.npc || c.npc === 'cop') && Math.hypot(c.vx, c.vz) > 10)); // (16 nov., user) a Rapace or a police car that comes at you fast and misses goes in too; the traffic is still turned back
  if (wet && !canSink) {
    c.x = ox; c.z = oz; c.vx *= -0.3; c.vz *= -0.3;
    if (c.player && Math.random() < 0.3) spawnFx(c.x, 0.5, c.z, 0.6, 0x9fc4d8, 0.4, 3, 2);
  }
  if (HD) { // vertical motion: crests and bridge ramps throw the car in the air at speed
    // arcade: strong gravity, damage only on big falls; realistic: 1.35 g, a hard landing hurts sooner
    const G = real ? 9.81 * PHYS.airG : 22, hurt = real ? 8 : 12, hk = real ? 3 : 1.5;
    let g = surfaceH(c.x, c.z);
    // (16 nov., user: a very high jump coming onto the pont Anne-de-Bretagne from the side) the edge of a deck is a step: a
    // car on the ground cannot climb a step of more than 30 cm steeper than 45°; it is stopped like at a wall instead of being
    // thrown into the air. Slopes stay drivable, the big bumps of the Misery quarry still throw it (user, the same day)
    const run0 = Math.hypot(c.x - ox, c.z - oz);
    if (c.yb !== undefined && (c.air || 0) < 0.2 && g > c.yb + 0.3 && g - c.yb > run0 && g - groundH(c.x, c.z) > 0.25) { // (16 nov., user) only the edge of a deck or a structure: the ground itself (the walls of the Misery quarry) can be climbed
      const gxs = (surfaceH(c.x + 1, c.z) - surfaceH(c.x - 1, c.z)) / 2, gzs = (surfaceH(c.x, c.z + 1) - surfaceH(c.x, c.z - 1)) / 2, gl = Math.hypot(gxs, gzs);
      {
        const nx = gl > 1e-3 ? gxs / gl : c.vx / (Math.hypot(c.vx, c.vz) || 1), nz = gl > 1e-3 ? gzs / gl : c.vz / (Math.hypot(c.vx, c.vz) || 1), u = c.vx * nx + c.vz * nz;
        if (u > 0) { c.vx -= nx * u * 1.25; c.vz -= nz * u * 1.25; if (c.local && u > 6) sfx.impact(u * 0.6); }
        c.x = ox; c.z = oz; g = surfaceH(c.x, c.z);
      }
    }
    if (c.yb === undefined || c.yb < g - 8) { c.yb = g; c.yv = 0; c.air = 0; } // (only when it ends up under the ground: a car flying off the quarry stays in the air)
    const ny = c.yb + (c.yv || 0) * dt - G / 2 * dt * dt;
    if (ny > g + 0.14) { c.yv -= G * dt; c.yb = ny; c.air = c.yb - g; }
    else {
      // (20 nov.) the springs take the landing: the body sinks, more for a bigger fall (sync)
      if (c.air > 0.3 && c.yv < -2.5) c.sqv = (c.sqv || 0) + Math.min(7, -c.yv * 0.55);
      if (c.air > 0.4 && c.yv < -6) { spawnFx(c.x, 0.3, c.z, 0.5, 0xffe28a, 0.2, 2, 2); if (c.local) { sfx.impact(-c.yv * 0.8); rumbleFor(c.owner, 0.5, 0.5, 150); } if (c.yv < -hurt) damage(c, (-c.yv - hurt) * hk); }
      // (16 nov., user: « sauts très étranges ») the climb rate comes from the grade of the ground under the wheels, capped and
      // smoothed over a few hundredths of a second: a kerb, the edge of a bridge deck or the top of the ferry ramp is a step of a
      // few tens of centimetres in one frame, which used to give up to 14 m/s upwards and a launch; a real slope still does
      const run = Math.hypot(c.vx, c.vz) * dt, gr = Math.max(-0.75, Math.min(0.75, (g - c.yb) / Math.max(run, 0.02)));
      c.gr = c.air > 0.4 ? 0 : (c.gr || 0) + (gr - (c.gr || 0)) * Math.min(1, dt * 12);
      c.yv = Math.max(-14, Math.min(14, c.gr * run / Math.max(dt, 1e-3))); c.yb = g; c.air = 0;
    }
    if (wet && canSink && c.yb < WATER_Y + 0.3 && groundH(c.x, c.z) < WATER_Y - 0.1) { // touches the water where it is deep enough
      c.sink = 0.001; c.air = 0; c.yv = 0; for (let i = 0; i < 4; i++) spawnFx(c.x + (Math.random() - 0.5) * 3, WATER_Y + 0.4, c.z + (Math.random() - 0.5) * 3, 1.1, 0xcfe4ee, 0.5, 5, 3);
      if (c.owner) { sfx.impact(9); rumbleFor(c.owner, 0.7, 0.4, 300); if (typeof flashFor === 'function') flashFor(c.owner, 'À L’EAU !', 'La voiture coule'); } // (16 nov., user) only for a player's car: a bot drowning far away showed it
    }
  }
  let impact = 0;
  for (let it = 0; it < 2; it++) impact = Math.max(impact, collideWalls(c));
  if (impact > 0 && c.phys) c.phys.r *= 0.4; // a wall kills the spin
  c.x = Math.max(CX - HX - 30, Math.min(CX + HX + 30, c.x));
  c.z = Math.max(CZ - HZ - 30, Math.min(CZ + HZ + 21, c.z));
  return impact;
}
// arcade driving (the original model): forward and lateral speeds, drift on the handbrake; bots and traffic use it
function planarArcade(c, inp, dt) {
  let MAX = c.maxV || (c.player ? 44 : (c.ai && c.ai.mode === 'hunt' ? 36 : 15));
  const boost = c.nitro > 0 ? 1.6 : 1; MAX *= c.nitro > 0 ? 1.3 : 1;
  const grip = c.air > 0.25 ? 0.08 : 1; // airborne: no traction
  // (21 nov., audit UX) quick half-turn: backing up fast, handbrake and full lock spin the car round in half a second
  // (a J-turn); the speed goes on in the same direction, so the car comes out of it driving forward
  if (c.jt) { const d = Math.min(c.jt.left, 6.5 * dt); c.h += c.jt.dir * d; c.jt.left -= d; c.vx *= Math.exp(-0.8 * dt); c.vz *= Math.exp(-0.8 * dt); c.steer = 0; if (c.jt.left <= 0) c.jt = null; return; }
  const [fx, fz] = c.fwd, rx = -fz, rz = fx; // right vector
  let vf = c.vx * fx + c.vz * fz, vr = c.vx * rx + c.vz * rz;
  if (c.player && vf < -6 && inp.hb && Math.abs(inp.s) > 0.5 && grip === 1) { c.jt = { left: Math.PI, dir: inp.s > 0 ? 1 : -1 }; return; }
  const acc = (c.accK || 1) * boost * grip;
  const T = c.tune || {}; // garage settings (cycle 12)
  if (inp.t > 0) { if (vf < MAX) vf += inp.t * (vf < 0 ? 26 : Math.max(2, 15 - vf * 0.12 * 44 / MAX)) * acc * dt; }
  else if (inp.t < 0) { if (vf > 0.5) vf -= 30 * (1 + 0.15 * (T.brake || 0)) * grip * dt; else if (vf > -13) vf += inp.t * 11 * grip * dt; }
  else vf -= vf * 0.45 * grip * dt;
  if (c.nitro > 0 && vf < MAX) vf += 9 * dt;
  vf -= vf * Math.abs(vf) * 0.0011 * dt * 10 * (44 / Math.max(44, MAX));
  // handbrake: the rear lets go; keep the slide going a moment after release if the throttle is held (drift)
  if (inp.hb && Math.abs(vf) > 7) c.drift = 0.8; else c.drift = Math.max(0, (c.drift || 0) - dt * (inp.t > 0 ? 0.7 : 1.7));
  if (inp.hb) vf -= vf * 0.55 * dt;
  // the tyres take hold again little by little as the slide dies (15 Nov.: the grip came back all at once, the slide stopped dead)
  const dw = Math.min(1, (c.drift || 0) / 0.55), hold = dw * dw * (3 - 2 * dw);
  vr *= Math.exp(-(inp.hb ? 1.0 : 2.4 * hold + 9 * (1 + 0.12 * (T.grip || 0)) * (1 - hold)) * grip * dt);
  // gravity along the slope of the Chantenay hills
  const slope = (surfaceH(c.x + fx * 1.7, c.z + fz * 1.7) - surfaceH(c.x - fx * 1.7, c.z - fz * 1.7)) / 3.4;
  vf -= 9.81 * slope * 0.75 * dt;
  c.steer += (inp.s - c.steer) * Math.min(1, dt * 8);
  const yaw = c.steer * Math.max(-1, Math.min(1, vf / 6)) * (2.1 / (1 + Math.abs(vf) / 30)) * (inp.hb ? 1.9 : 1 + 0.35 * hold) * (grip < 1 ? 0.25 : 1);
  c.h += yaw * dt;
  const [nfx, nfz] = c.fwd, nrx = -nfz, nrz = nfx;
  c.vx = nfx * vf + nrx * vr; c.vz = nfz * vf + nrz * vr;
}
function collideWalls(c) {
  // the car is about 4.4 m by 1.8 m: three circles along its length (front, middle, rear) rather than one big
  // circle, so it fits through any gap a little wider than itself
  const segs = cellOf(c.x, c.z); if (!segs) return 0;
  const [fx, fz] = c.fwd, half = c.mesh && c.mesh.userData.hl ? Math.max(1, c.mesh.userData.hl - 1.0) : 1.25;
  let impact = 0;
  for (const [k, r] of [[half, 1.0], [0, 1.0], [-half, 1.0]]) {
    for (const [ax, az, bx, bz, top] of segs) {
      if (top !== undefined && (c.air || 0) > top) continue; // flying over a low obstacle (tree trunk, lamp post)
      const cx = c.x + fx * k, cz = c.z + fz * k;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6;
      let t = ((cx - ax) * dx + (cz - az) * dz) / L2; t = Math.max(0, Math.min(1, t));
      const px = ax + dx * t, pz = az + dz * t;
      let nx = cx - px, nz = cz - pz; const d = Math.hypot(nx, nz);
      if (d >= r) continue;
      if (d < 1e-4) { nx = -dz; nz = dx; } const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      c.x += nx * (r - d); c.z += nz * (r - d);
      const vn = c.vx * nx + c.vz * nz;
      if (vn < 0) { impact = Math.max(impact, -vn); c.vx -= 1.25 * vn * nx; c.vz -= 1.25 * vn * nz; c.vx *= 0.9; c.vz *= 0.9; }
    }
  }
  return impact;
}
function segHit(ox, oz, dx, dz, maxT) { // ray vs walls, returns distance
  let best = maxT; const seen = new Set();
  for (let s = 0; s <= maxT; s += CELL * 0.5) {
    const segs = cellOf(ox + dx * s, oz + dz * s); if (!segs) continue;
    for (const sg of segs) {
      if (seen.has(sg)) continue; seen.add(sg);
      const [ax, az, bx, bz] = sg, ex = bx - ax, ez = bz - az;
      const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
      const t = ((ax - ox) * ez - (az - oz) * ex) / den, u = ((ax - ox) * dz - (az - oz) * dx) / den;
      if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    if (best < s) break;
  }
  return best;
}

