// ---------- effects ----------
const fxPool = [];
const fxGeo = new THREE.IcosahedronGeometry(1, 0);
function spawnFx(x, y, z, size, color, life, vy, grow) {
  if (HD) return hd.fx(x, y, z, size, color);
  let f = fxPool.find(o => !o.alive);
  if (!f) {
    if (fxPool.length > 160) return;
    const m = new THREE.Mesh(fxGeo, new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
    f = { m, alive: false }; fxPool.push(f); scene.add(m);
  }
  Object.assign(f, { alive: true, t: 0, life, vy, grow, size, vx: (Math.random() - .5) * 4, vz: (Math.random() - .5) * 4 });
  f.m.material.color.set(color); f.m.material.opacity = 1; f.m.visible = true;
  f.m.position.set(x, y + surfaceH(x, z), z); f.m.scale.setScalar(size);
}
function updateFx(dt) {
  for (const f of fxPool) {
    if (!f.alive) continue;
    f.t += dt; const k = f.t / f.life;
    if (k >= 1) { f.alive = false; f.m.visible = false; continue; }
    f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
    f.m.scale.setScalar(f.size * (1 + k * f.grow)); f.m.material.opacity = 1 - k;
  }
}
function explode(x, z) {
  if (gx && gx.Fences) gx.Fences.blast(x, z, 7);
  if (gx && gx.LightPoles) gx.LightPoles.blast(x, z, 6);
  if (HD) return hd.explode(x, z);
  for (let i = 0; i < 10; i++) spawnFx(x + (Math.random() - .5) * 3, 1 + Math.random() * 2, z + (Math.random() - .5) * 3, 1.2 + Math.random(), i % 2 ? 0xffb03a : 0xff5a1f, 0.7, 3, 2.5);
  for (let i = 0; i < 8; i++) spawnFx(x, 2, z, 1.5, 0x2a2228, 2.2, 4, 3);
  sfx.boom();
}
// tracers
const TR_MAX = 64;
const trPos = new Float32Array(TR_MAX * 6), trCol = new Float32Array(TR_MAX * 6);
const trGeo = new THREE.BufferGeometry();
trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3));
trGeo.setAttribute('color', new THREE.BufferAttribute(trCol, 3));
const tracers = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ vertexColors: true, fog: false }));
tracers.frustumCulled = false; scene.add(tracers);
const trLife = new Float32Array(TR_MAX); let trNext = 0;
function tracer(x1, y1, z1, x2, y2, z2, enemy, dx, dz) {
  const i = trNext++ % TR_MAX, o = i * 6;
  trPos.set([x1, y1, z1, x2, y2, z2], o);
  const c = HD ? (enemy ? [9, 1.6, 2] : [9, 6.5, 2]) : enemy ? [1, 0.25, 0.3] : [1, 0.9, 0.4];
  if (HD) hd.muzzle(x1, y1, z1, enemy, dx, dz);
  else muzzleFlash(x1, y1, z1, enemy);
  trCol.set([...c, ...c], o); trLife[i] = 0.07;
}
// classic build: a small flash sprite at the barrel tip
const mfMat = new THREE.SpriteMaterial({ color: 0xffd36b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const mfPool = [];
for (let k = 0; k < 6; k++) { const sp = new THREE.Sprite(mfMat.clone()); sp.visible = false; sp.userData.t = 0; scene.add(sp); mfPool.push(sp); }
let mfNext = 0;
function muzzleFlash(x, y, z, enemy) {
  const sp = mfPool[mfNext++ % mfPool.length];
  sp.position.set(x, y, z); sp.scale.setScalar(0.55 + Math.random() * 0.25); sp.material.color.setHex(enemy ? 0xff6a50 : 0xffd36b); sp.material.opacity = 1; sp.visible = true; sp.userData.t = 0.05;
}
function updateTracers(dt) {
  if (window.__trHold) return; // test hook: keep the last shots on screen
  for (const sp of mfPool) if (sp.userData.t > 0) { sp.userData.t -= dt; if (sp.userData.t <= 0) sp.visible = false; }
  for (let i = 0; i < TR_MAX; i++) if (trLife[i] > 0) { trLife[i] -= dt; if (trLife[i] <= 0) trPos.fill(0, i * 6, i * 6 + 6); }
  trGeo.attributes.position.needsUpdate = true; trGeo.attributes.color.needsUpdate = true;
}

