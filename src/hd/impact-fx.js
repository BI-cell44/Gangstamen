  // ---------- flashes, debris, shockwaves, scorch marks, skid marks ----------
  const flashes = [];
  for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffffff, 0, 45, 2); l.userData.t = 0; scene.add(l); flashes.push(l); }
  let flashNext = 0;
  function flashAt(x, y, z, r, g, b, intensity, dur) {
    const l = flashes[flashNext++ % flashes.length];
    l.position.set(x, y, z); l.color.setRGB(r, g, b); l.intensity = intensity; l.userData.i0 = intensity; l.userData.t = dur; l.userData.d = dur;
  }
  const debris = [], debrisG = new THREE.BoxGeometry(1, 1, 1), debrisM = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8, metalness: 0.4 });
  for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(debrisG, debrisM); m.visible = false; m.castShadow = true; scene.add(m); debris.push({ m, t: 0, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0, sz: 0 }); }
  let debrisNext = 0;
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    m.visible = false; scene.add(m); rings.push({ m, t: 0 });
  }
  let ringNext = 0;
  const scorches = [];
  function scorchTexture() {
    const [c, g] = canvas(128, 128);
    const rg = g.createRadialGradient(64, 64, 4, 64, 64, 62); rg.addColorStop(0, 'rgba(0,0,0,.95)'); rg.addColorStop(0.55, 'rgba(0,0,0,.6)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 26; i++) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1 + Math.random() * 3; const a = Math.random() * 6.283; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a) * (30 + Math.random() * 32), 64 + Math.sin(a) * (30 + Math.random() * 32)); g.stroke(); }
    return new THREE.CanvasTexture(c);
  }
  const scorchTex = scorchTexture();
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.visible = false; m.renderOrder = 2; scene.add(m); scorches.push({ m, t: 0 });
  }
  let scorchNext = 0;
  const SK = 1400, skPos = new Float32Array(SK * 18), skGeo = new THREE.BufferGeometry();
  skGeo.setAttribute('position', new THREE.BufferAttribute(skPos, 3));
  const skMesh = new THREE.Mesh(skGeo, new THREE.MeshBasicMaterial({ color: 0x020202, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  skMesh.frustumCulled = false; skMesh.renderOrder = 1; scene.add(skMesh);
  let skNext = 0, skDirty = false;
  function skidQuad(ax, ay, az, bx, by, bz) {
    let dx = bx - ax, dz = bz - az; const l = Math.hypot(dx, dz); if (l < 0.05 || l > 4) return;
    dx /= l; dz /= l; const nx = -dz * 0.11, nz = dx * 0.11, o = (skNext++ % SK) * 18;
    skPos.set([ax - nx, ay, az - nz, ax + nx, ay, az + nz, bx + nx, by, bz + nz, ax - nx, ay, az - nz, bx + nx, by, bz + nz, bx - nx, by, bz - nz], o);
    skDirty = true;
  }

  function shake(x, z, amount) {
    for (const L of locals) { const d = Math.hypot(L.car.x - x, L.car.z - z); if (d < 90) L.shake = Math.max(L.shake || 0, amount * (1 - d / 90)); }
  }
  function explodeAt(x, z) {
    const y = surfaceH(x, z) + 0.34, n = q.parts;
    flashAt(x, y + 2.2, z, 1, 0.62, 0.25, 26, 0.45);
    for (let i = 0; i < 34 * n; i++) { const a = Math.random() * 6.283, s = 2 + Math.random() * 9; fire(x + rs() * 1.5, y + 0.6 + Math.random() * 1.2, z + rs() * 1.5, Math.cos(a) * s, 2 + Math.random() * 8, Math.sin(a) * s, 2.2 + Math.random() * 2.2, 0.45 + Math.random() * 0.5, 1.6); }
    for (let i = 0; i < 46 * n; i++) { const a = Math.random() * 6.283, s = 6 + Math.random() * 16; spark(x, y + 1, z, Math.cos(a) * s, 5 + Math.random() * 14, Math.sin(a) * s, 0.7 + Math.random() * 0.9); }
    for (let i = 0; i < 26 * n; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 5; smoke(x + rs() * 2, y + 1 + Math.random() * 2, z + rs() * 2, Math.cos(a) * s, 3 + Math.random() * 5, Math.sin(a) * s, 2.6 + Math.random() * 2, 2.4, 2.2 + Math.random() * 1.8, 0.035, 0.85); }
    emit(1, x, y + 1.4, z, 0, 0, 0, 13, 0.8, 0.16, 14, 9, 4, 1, 0, 0); // core flash
    for (let i = 0; i < 9; i++) {
      const d = debris[debrisNext++ % debris.length], a = Math.random() * 6.283, s = 5 + Math.random() * 9;
      d.m.visible = true; d.m.position.set(x, y + 1, z); d.m.scale.set(0.15 + Math.random() * 0.5, 0.06 + Math.random() * 0.12, 0.15 + Math.random() * 0.45);
      d.vx = Math.cos(a) * s; d.vz = Math.sin(a) * s; d.vy = 6 + Math.random() * 9; d.t = 5; d.sx = rs() * 14; d.sy = rs() * 14; d.sz = rs() * 14;
    }
    const r = rings[ringNext++ % rings.length]; r.m.visible = true; r.m.position.set(x, y + 0.25, z); r.t = 0.0001;
    const sc = scorches[scorchNext++ % scorches.length]; sc.m.visible = true; sc.m.position.set(x, y + 0.03, z); sc.m.scale.setScalar(9 + Math.random() * 3); sc.m.rotation.y = Math.random() * 6; sc.t = 45; sc.m.material.opacity = 0.85;
    shake(x, z, 1);
    sfx.boom();
  }
  // classic effect calls routed by their colour code
  function fx(x, y0, z, size, color) {
    const y = y0 + surfaceH(x, z) + 0.34;
    if (color === 0xffe28a) { // bullet hit / metal impact
      for (let i = 0; i < 7 * q.parts; i++) spark(x, y, z, rs() * 14, 1 + Math.random() * 8, rs() * 14, 0.25 + Math.random() * 0.35);
      emit(1, x, y, z, 0, 0, 0, 1.6 + size * 2, 0.5, 0.07, 10, 7, 3, 1, 0, 0);
      if (size > 0.45) flashAt(x, y + 0.5, z, 1, 0.8, 0.5, 4, 0.12);
    } else if (color === 0xcbbfae) { // wall hit: dust
      for (let i = 0; i < 3; i++) smoke(x + rs() * 0.3, y + rs() * 0.3, z + rs() * 0.3, rs() * 2, 0.6 + Math.random(), rs() * 2, 0.5, 2.6, 0.7 + Math.random() * 0.5, 0.5, 0.5);
      for (let i = 0; i < 3 * q.parts; i++) spark(x, y, z, rs() * 9, 1 + Math.random() * 5, rs() * 9, 0.2 + Math.random() * 0.2);
    } else if (color === 0x9fc4d8) { // water
      for (let i = 0; i < 4; i++) smoke(x + rs(), y, z + rs(), rs() * 3, 3 + Math.random() * 4, rs() * 3, 0.9, 2, 0.8, 0.85, 0.6);
    }
  }
  function muzzle(x, y, z, enemy, dx, dz) { // flash at the barrel tip, stretched along the shot, and a wisp of gun smoke
    const g = enemy ? 3 : 8, b = enemy ? 3 : 2.5;
    emit(1, x, y, z, 0, 0, 0, 0.55, 0.5, 0.05, 10, g * 0.9, b, 1, 0, 0);
    emit(1, x + dx * 0.3, y, z + dz * 0.3, dx * 4, 0, dz * 4, 0.4, 0.2, 0.04, 9, g * 0.8, b, 0.9, 0, 0);
    emit(1, x + dx * 0.6, y, z + dz * 0.6, dx * 6, 0, dz * 6, 0.25, 0, 0.03, 8, g * 0.6, b, 0.7, 0, 0);
    if (Math.random() < 0.35) smoke(x + dx * 0.3, y, z + dz * 0.3, dx * 2 + rs(), 0.4, dz * 2 + rs(), 0.25, 3, 0.45, 0.7, 0.18);
    if (Math.random() < 0.5) flashAt(x, y + 0.2, z, 1, enemy ? 0.4 : 0.75, 0.35, 2.6, 0.06);
  }

