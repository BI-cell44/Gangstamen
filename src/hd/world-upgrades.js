  // ---------- world upgrades ----------
  function noiseCanvas(n, f) { const [c, g] = canvas(n, n); const im = g.createImageData(n, n); for (let i = 0; i < n * n; i++) f(im.data, i * 4, i % n, (i / n) | 0); g.putImageData(im, 0, 0); return c; }
  function heightToNormal(hf, n, strength, nh = n) {
    const [c, g] = canvas(n, nh), im = g.createImageData(n, nh), H = (x, y) => hf[((y + nh) % nh) * n + ((x + n) % n)];
    for (let y = 0; y < nh; y++) for (let x = 0; x < n; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), o = (y * n + x) * 4;
      im.data[o] = (-dx / l * 0.5 + 0.5) * 255; im.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }
  function roadMat() {
    const n = 256, hf = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) hf[i] = Math.random();
    for (let k = 0; k < 500; k++) { const x = (Math.random() * n) | 0, y = (Math.random() * n) | 0; hf[y * n + x] = Math.random() < 0.5 ? 2.2 : -1.2; } // aggregate chips and pits
    const c = noiseCanvas(n, (d, o, x, y) => { const v = 200 + hf[y * n + x] * 26 + (Math.random() - 0.5) * 22; d[o] = d[o + 1] = d[o + 2] = Math.max(0, Math.min(255, v)); d[o + 3] = 255; });
    const map = new THREE.CanvasTexture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.encoding = THREE.sRGBEncoding; map.anisotropy = 8; done.add(map);
    const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.82, metalness: 0, normalMap: heightToNormal(hf, n, 0.9), normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 0.55 });
    m.color.setScalar(1); done.add(m); roadMatRef = m;
    return wetPatch(m, true);
  }
  function waterMat() {
    const n = 128, hf = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) hf[y * n + x] = Math.sin(x * 0.196 + Math.sin(y * 0.147) * 2.1) * 1.2 + Math.sin(y * 0.245 + x * 0.098) + Math.sin((x + y) * 0.39) * 0.5;
    const nm = heightToNormal(hf, n, 0.5); nm.repeat.set(110, 110);
    const m = new THREE.MeshStandardMaterial({ color: lin(0x18323c), roughness: 0.09, metalness: 0.0, normalMap: nm, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 1.5 });
    done.add(m); waterMatRef = m;
    return m;
  }
