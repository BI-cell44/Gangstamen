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
    // one tile of ripples (waves of whole numbers of periods in many directions, so it wraps), read three times by the
    // shader at sizes and angles that never line up: no visible repeat, and the far water calms down instead of shimmering
    const n = 256, hf = new Float32Array(n * n), K = 6.2832 / n;
    const WV = [[3, 1, 1, 0.3], [2, -3, 0.8, 1.7], [5, 2, 0.55, 4.1], [-4, 5, 0.5, 2.6], [7, -2, 0.33, 0.9], [1, 8, 0.3, 5.2], [9, 6, 0.2, 3.3], [-11, 4, 0.16, 1.1], [6, -13, 0.13, 2.2]];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let h = 0; for (const [a, b, amp, ph] of WV) { const t = (a * x + b * y) * K + ph; h += amp * (Math.sin(t) + 0.35 * Math.sin(2 * t + 1.3)); } hf[y * n + x] = h; }
    const nm = heightToNormal(hf, n, 0.9);
    const m = new THREE.MeshStandardMaterial({ color: lin(0x18323c), roughness: 0.09, metalness: 0.0, normalMap: nm, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 1.5 });
    const uT = { value: 0 }; m.userData.uT = uT;
    m.onBeforeCompile = sh => {
      sh.uniforms.uWaterT = uT;
      const a = 'vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;', chunk = THREE.ShaderChunk.normal_fragment_maps;
      if (chunk.split(a).length !== 2) return; // another three.js: keep the plain normal map
      sh.fragmentShader = 'uniform float uWaterT;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', chunk.replace(a, `
        vec2 wU = vUv * 4000.0; float wD = length( vViewPosition );
        vec3 wn1 = texture2D( normalMap, wU * 0.031 + uWaterT * vec2( 0.010, 0.016 ) ).xyz * 2.0 - 1.0;
        vec3 wn2 = texture2D( normalMap, mat2( 0.8, -0.6, 0.6, 0.8 ) * wU * 0.0113 + uWaterT * vec2( -0.006, 0.004 ) ).xyz * 2.0 - 1.0;
        vec3 wn3 = texture2D( normalMap, mat2( 0.6, 0.8, -0.8, 0.6 ) * wU * 0.083 + uWaterT * vec2( 0.02, -0.011 ) ).xyz * 2.0 - 1.0;
        vec3 mapN = normalize( vec3( ( wn1.xy * 0.9 + wn2.xy * 1.1 + wn3.xy * 0.6 * clamp( 1.0 - wD / 160.0, 0.0, 1.0 ) ) / ( 1.0 + wD / 380.0 ), 1.5 ) );`));
    };
    done.add(m); waterMatRef = m;
    return m;
  }
