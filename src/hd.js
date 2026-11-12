// >>> HD MODULE
// ================= HD renderer =================
// Linear HDR pipeline (float target, MSAA, bloom, ACES tone mapping), procedural sky with image-based reflections,
// soft shadows, lofted car bodies with clear-coat paint, a particle system (smoke, fire, sparks), skid marks,
// debris, street lamps. Only active in the HD build (const HD = true); the classic build never calls into it.
const hd = !HD ? null : (() => {
  const isGL2 = renderer.capabilities.isWebGL2;
  const floatRT = isGL2 && !!renderer.extensions.get('EXT_color_buffer_float');
  const RT_TYPE = floatRT ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const QUAL = [
    { name: 'Basse', scale: 0.6, dpr: 1, msaa: 0, shadow: 1024, bloom: 3, parts: 0.5 },
    { name: 'Moyenne', scale: 0.8, dpr: 1.25, msaa: 2, shadow: 2048, bloom: 4, parts: 0.75 },
    { name: 'Haute', scale: 1, dpr: 1.5, msaa: 4, shadow: 4096, bloom: 5, parts: 1 },
    { name: 'Ultra', scale: 1, dpr: 2, msaa: 4, shadow: 4096, bloom: 5, parts: 1 },
  ];
  let q = QUAL[2], qi = 2, time = 0;
  const lin = h => new THREE.Color(h).convertSRGBToLinear();
  const linHex = h => lin(h).getHex();

  // ---------- colour management: the classic code authors everything in sRGB; convert once ----------
  const done = new WeakSet();
  function linMat(m) {
    if (!m || done.has(m)) return; done.add(m);
    if (m.isShaderMaterial) return;
    if (m.color) m.color.convertSRGBToLinear();
    if (m.emissive) m.emissive.convertSRGBToLinear();
    if (m.specular) m.specular.convertSRGBToLinear();
    for (const k of ['map', 'emissiveMap']) {
      const t = m[k]; if (!t || done.has(t)) continue; done.add(t);
      t.encoding = THREE.sRGBEncoding; t.magFilter = THREE.LinearFilter; t.anisotropy = Math.max(t.anisotropy, 8); if (t.image) t.needsUpdate = true;
    }
    m.needsUpdate = true;
  }
  function linAttr(a) {
    if (!a || done.has(a)) return; done.add(a);
    const v = a.array; for (let i = 0; i < v.length; i++) v[i] = Math.pow(v[i], 2.2);
    a.needsUpdate = true;
  }
  function linearize(root) {
    root.traverse(o => {
      if (o.userData.hdLinear) return;
      if (o.material) [].concat(o.material).forEach(linMat);
      if (o.geometry && o.geometry.attributes && o.geometry.attributes.color) linAttr(o.geometry.attributes.color);
      if (o.instanceColor) linAttr(o.instanceColor);
    });
  }

  // ---------- post-processing ----------
  const fsScene = new THREE.Scene(), fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
  const FS_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const fsMat = (uniforms, frag) => new THREE.ShaderMaterial({ uniforms, vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
  const brightMat = fsMat({ t: { value: null }, th: { value: 1.0 } }, `
    uniform sampler2D t; uniform float th; varying vec2 vUv;
    void main(){ vec3 c = clamp(texture2D(t, vUv).rgb, vec3(0.0), vec3(24.0)); float l = max(c.r, max(c.g, c.b));
      gl_FragColor = vec4(c * smoothstep(th, th + 0.8, l), 1.0); }`);
  const blurMat = fsMat({ t: { value: null }, d: { value: new THREE.Vector2() } }, `
    uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
    void main(){ vec4 c = texture2D(t, vUv) * 0.227027;
      c += (texture2D(t, vUv + d * 1.384615) + texture2D(t, vUv - d * 1.384615)) * 0.316216;
      c += (texture2D(t, vUv + d * 3.230769) + texture2D(t, vUv - d * 3.230769)) * 0.070270;
      gl_FragColor = c; }`);
  const finalMat = fsMat({
    t: { value: null }, b0: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, b4: { value: null },
    bloom: { value: 0.5 }, exposure: { value: 1 }, time: { value: 0 }, tint: { value: new THREE.Vector3(1, 1, 1) }, levels: { value: 5 }, ldr: { value: floatRT ? 0 : 1 },
  }, `
    uniform sampler2D t, b0, b1, b2, b3, b4; uniform float bloom, exposure, time, levels, ldr; uniform vec3 tint; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5; float r2 = dot(cc, cc);
      vec2 ca = cc * r2 * 0.003; // slight lens fringing towards the corners
      vec3 c = vec3(texture2D(t, vUv + ca).r, texture2D(t, vUv).g, texture2D(t, vUv - ca).b);
      vec3 bl = texture2D(b0, vUv).rgb * 0.9 + texture2D(b1, vUv).rgb * 1.0 + texture2D(b2, vUv).rgb * 1.1;
      if (levels > 3.5) bl += texture2D(b3, vUv).rgb * 1.2;
      if (levels > 4.5) bl += texture2D(b4, vUv).rgb * 1.3;
      c += bl * bloom * 0.2;
      c *= exposure * tint;
      c *= 1.0 - smoothstep(0.18, 0.95, r2 * 1.9) * 0.42; // vignette
      c = mix(c, (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 1.0 - ldr * 0.5); // ACES filmic
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.08); // a touch of saturation
      c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
      c += (hash(vUv * 917.0 + fract(time) * 31.0) - 0.5) * 0.022; // film grain, also hides banding
      gl_FragColor = vec4(c, 1.0);
    }`);
  let sceneRT = null, bA = [], bB = [], RW = 0, RH = 0;
  function resize() {
    const pr = Math.min(devicePixelRatio || 1, q.dpr) * q.scale;
    renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight);
    const sz = renderer.getDrawingBufferSize(new THREE.Vector2()); RW = Math.max(2, sz.x | 0); RH = Math.max(2, sz.y | 0);
    if (sceneRT) sceneRT.dispose(); bA.concat(bB).forEach(r => r.dispose()); bA = []; bB = [];
    const opt = { type: RT_TYPE, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, stencilBuffer: false };
    if (isGL2 && q.msaa) { sceneRT = new THREE.WebGLMultisampleRenderTarget(RW, RH, Object.assign({ depthBuffer: true }, opt)); sceneRT.samples = q.msaa; }
    else sceneRT = new THREE.WebGLRenderTarget(RW, RH, Object.assign({ depthBuffer: true }, opt));
    for (let i = 0; i < q.bloom; i++) {
      const w = Math.max(2, RW >> (i + 1)), h = Math.max(2, RH >> (i + 1));
      bA.push(new THREE.WebGLRenderTarget(w, h, Object.assign({ depthBuffer: false }, opt)));
      bB.push(new THREE.WebGLRenderTarget(w, h, Object.assign({ depthBuffer: false }, opt)));
    }
  }
  function pass(mat, target) { fsQuad.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
  function setQuality(i) {
    qi = Math.max(0, Math.min(QUAL.length - 1, i | 0)); q = QUAL[qi];
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
  }

  // ---------- sky dome, lighting and reflections ----------
  const skyU = {
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, zen: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, low: { value: new THREE.Color() },
    sunCol: { value: new THREE.Color() }, cloudLit: { value: new THREE.Color() }, cloudDark: { value: new THREE.Color() },
    night: { value: 0 }, time: { value: 0 }, disc: { value: 40 },
  };
  const SKY_FRAG = `
    uniform vec3 sunDir, zen, hor, low, sunCol, cloudLit, cloudDark; uniform float night, time, disc; varying vec3 vDir;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vDir); float h = max(d.y, 0.0);
      vec3 c = mix(hor, zen, pow(h, 0.42));
      float sd = max(dot(d, sunDir), 0.0);
      c += sunCol * (pow(sd, 6.0) * 0.22 + pow(sd, 40.0) * 0.5 + pow(sd, 400.0) * 2.0) * (1.0 - night * 0.7);
      c += sunCol * smoothstep(0.99955, 0.99985, sd) * disc;
      // stars
      vec2 sp = d.xz / (abs(d.y) + 0.35) * 90.0; float st = step(0.9965, hash(floor(sp))) * hash(floor(sp) + 3.0);
      c += vec3(0.9, 0.95, 1.0) * st * night * 1.6 * smoothstep(0.02, 0.25, d.y);
      // clouds on a plane overhead
      vec2 p = d.xz / (h + 0.14) * 1.15 + vec2(time * 0.006, time * 0.002);
      float n = fbm(p), n2 = fbm(p + sunDir.xz * 0.09);
      float cov = smoothstep(0.5, 0.82, n) * smoothstep(0.0, 0.16, d.y);
      float shade = clamp((n - n2) * 5.0 + 0.55, 0.0, 1.0);
      vec3 cl = mix(cloudDark, cloudLit, shade) + sunCol * pow(sd, 5.0) * 0.5 * (1.0 - night);
      c = mix(c, cl, cov * 0.9);
      // below the horizon: haze
      c = mix(c, low, smoothstep(0.0, -0.12, d.y));
      gl_FragColor = vec4(c, 1.0);
      #include <encodings_fragment>
    }`;
  const skyMat = new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: SKY_FRAG });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), skyMat);
  dome.frustumCulled = false; dome.renderOrder = -100; scene.add(dome);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 20), skyMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, isNight = false;
  const partLight = new THREE.Color(1, 1, 1);
  const fogU = { color: { value: new THREE.Color() }, near: { value: 100 }, far: { value: 700 } };
  let lampGlow = null, lampBulbs = null, lampPools = null, roadMatRef = null, waterMatRef = null;
  function setTime(on) {
    isNight = on;
    if (on) SUN_OFF.set(-90, 120, 110); else SUN_OFF.set(-150, 100, 85);
    skyU.sunDir.value.copy(SUN_OFF).normalize();
    skyU.night.value = on ? 1 : 0;
    if (on) {
      skyU.zen.value.setRGB(0.004, 0.006, 0.02); skyU.hor.value.setRGB(0.03, 0.028, 0.06); skyU.low.value.setRGB(0.02, 0.018, 0.035);
      skyU.sunCol.value.setRGB(0.55, 0.65, 0.9); skyU.cloudLit.value.setRGB(0.07, 0.075, 0.12); skyU.cloudDark.value.setRGB(0.012, 0.012, 0.025);
      sun.color.setRGB(0.5, 0.62, 1.0); sun.intensity = 0.32; hemi.color.setRGB(0.3, 0.36, 0.6); hemi.groundColor.setRGB(0.1, 0.08, 0.07); hemi.intensity = 0.36;
      fogU.color.value.setRGB(0.03, 0.028, 0.06); fogU.near.value = 60; fogU.far.value = 520;
      finalMat.uniforms.exposure.value = 1.25; finalMat.uniforms.bloom.value = 0.95; finalMat.uniforms.tint.value.set(0.96, 1.0, 1.1); brightMat.uniforms.th.value = 0.85;
      partLight.setRGB(0.16, 0.17, 0.24);
    } else { // golden hour over the Loire
      skyU.zen.value.setRGB(0.1, 0.19, 0.5); skyU.hor.value.setRGB(1.25, 0.62, 0.3); skyU.low.value.setRGB(0.75, 0.42, 0.3);
      skyU.sunCol.value.setRGB(1.6, 0.95, 0.5); skyU.cloudLit.value.setRGB(1.7, 1.0, 0.72); skyU.cloudDark.value.setRGB(0.36, 0.26, 0.38);
      sun.color.setRGB(1.0, 0.74, 0.5); sun.intensity = 2.2; hemi.color.setRGB(0.62, 0.68, 0.86); hemi.groundColor.setRGB(0.42, 0.34, 0.28); hemi.intensity = 0.5;
      fogU.color.value.setRGB(0.85, 0.5, 0.36); fogU.near.value = 160; fogU.far.value = 900;
      finalMat.uniforms.exposure.value = 0.92; finalMat.uniforms.bloom.value = 0.6; finalMat.uniforms.tint.value.set(1.03, 1.0, 0.96); brightMat.uniforms.th.value = 1.6;
      partLight.setRGB(1.0, 0.82, 0.68);
    }
    scene.background = null;
    scene.fog = new THREE.Fog(0, fogU.near.value, fogU.far.value); scene.fog.color.copy(fogU.color.value);
    skyU.disc.value = 6; // keep the sun disc tame in the reflection probe
    const old = envRT; envRT = pmrem.fromScene(envScene, 0, 1, 500); scene.environment = envRT.texture; if (old) old.dispose();
    skyU.disc.value = on ? 6 : 40;
    wallMats.forEach(m => { m.emissiveIntensity = on ? 2.4 : 0; });
    photoMats.forEach(m => { m.emissive.setScalar(on ? 0.035 : 0.12); });
    if (lampGlow) { lampGlow.visible = on; lampPools.visible = on; lampBulbs.material.color.setRGB(on ? 14 : 0.25, on ? 8 : 0.25, on ? 3 : 0.25); }
    if (roadMatRef) { roadMatRef.roughness = on ? 0.5 : 0.82; }
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.06; sun.shadow.radius = 2;
  }

  // ---------- particles ----------
  function puffTexture() {
    const [c, g] = canvas(128, 128);
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.283, r = Math.random() * 24, x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r, s = 18 + Math.random() * 22;
      const rg = g.createRadialGradient(x, y, 0, x, y, s); rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    }
    const t = new THREE.CanvasTexture(c); return t;
  }
  function glowTexture() {
    const [c, g] = canvas(64, 64);
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const PN = 2400;
  const P = { n: 0, x: new Float32Array(PN), y: new Float32Array(PN), z: new Float32Array(PN), vx: new Float32Array(PN), vy: new Float32Array(PN), vz: new Float32Array(PN),
    age: new Float32Array(PN), life: new Float32Array(PN), size: new Float32Array(PN), grow: new Float32Array(PN), rot: new Float32Array(PN), vrot: new Float32Array(PN),
    r: new Float32Array(PN), g: new Float32Array(PN), b: new Float32Array(PN), a: new Float32Array(PN), drag: new Float32Array(PN), grav: new Float32Array(PN), kind: new Uint8Array(PN) };
  function mkPoints(additive, tex) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PN * 3), 3));
    geo.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(PN * 4), 4));
    geo.setAttribute('aDat', new THREE.BufferAttribute(new Float32Array(PN * 2), 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: { tex: { value: tex }, uScale: { value: 500 }, uLight: { value: partLight }, fogColor: fogU.color, fogNear: fogU.near, fogFar: fogU.far },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        attribute vec4 aCol; attribute vec2 aDat; uniform float uScale; varying vec4 vCol; varying float vRot; varying float vDist;
        void main(){ vCol = aCol; vRot = aDat.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aDat.x * uScale / max(0.3, -mv.z); vDist = -mv.z;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        uniform sampler2D tex; uniform vec3 uLight, fogColor; uniform float fogNear, fogFar; varying vec4 vCol; varying float vRot; varying float vDist;
        void main(){
          #include <logdepthbuf_fragment>
          vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot); p = mat2(c, -s, s, c) * p + 0.5;
          float a = texture2D(tex, p).a * vCol.a; if (a < 0.003) discard;
          float f = smoothstep(fogNear, fogFar, vDist);
          ${additive ? 'gl_FragColor = vec4(vCol.rgb * a * (1.0 - f), 1.0);' : 'gl_FragColor = vec4(mix(vCol.rgb * uLight, fogColor, f), a);'}
        }`,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = additive ? 21 : 20; scene.add(pts);
    return pts;
  }
  const puffTex = puffTexture(), glowTex = glowTexture();
  const ptsSmoke = mkPoints(false, puffTex), ptsGlow = mkPoints(true, glowTex);
  // kind 0: lit smoke/dust (alpha), kind 1: fire/sparks/flashes (additive, HDR)
  function emit(kind, x, y, z, vx, vy, vz, size, grow, life, r, g, b, a, drag, grav) {
    if (P.n >= PN) return;
    const i = P.n++;
    P.kind[i] = kind; P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz; P.age[i] = 0; P.life[i] = life;
    P.size[i] = size; P.grow[i] = grow; P.rot[i] = Math.random() * 6.283; P.vrot[i] = (Math.random() - 0.5) * 1.6;
    P.r[i] = r; P.g[i] = g; P.b[i] = b; P.a[i] = a; P.drag[i] = drag || 0; P.grav[i] = grav || 0;
  }
  const rs = () => Math.random() - 0.5;
  const smoke = (x, y, z, vx, vy, vz, size, grow, life, grey, alpha) => emit(0, x, y, z, vx, vy, vz, size, grow, life, grey, grey, grey * 1.03, alpha, 1.2, -0.6);
  const fire = (x, y, z, vx, vy, vz, size, life, heat) => emit(1, x, y, z, vx, vy, vz, size, 1.4, life, 4.2 * heat, 1.5 * heat, 0.3 * heat, 0.8, 1.5, -3.5);
  const spark = (x, y, z, vx, vy, vz, life) => emit(1, x, y, z, vx, vy, vz, 0.16, -0.6, life, 9, 5, 1.6, 1, 0.4, 16);
  function updateParticles(dt) {
    const sp = ptsSmoke.geometry.attributes, gp = ptsGlow.geometry.attributes;
    let ns = 0, ng = 0, w = 0;
    for (let i = 0; i < P.n; i++) {
      const age = P.age[i] + dt; if (age >= P.life[i]) continue;
      const k = age / P.life[i], dr = Math.exp(-P.drag[i] * dt);
      let vx = P.vx[i] * dr, vy = P.vy[i] * dr - P.grav[i] * dt, vz = P.vz[i] * dr;
      let x = P.x[i] + vx * dt, y = P.y[i] + vy * dt, z = P.z[i] + vz * dt;
      if (P.grav[i] > 5 && vy < 0) { const gy = surfaceH(x, z) + 0.36; if (y < gy) { y = gy; vy = -vy * 0.35; vx *= 0.6; vz *= 0.6; } } // sparks bounce
      const size = P.size[i] * (1 + k * P.grow[i]);
      const kind = P.kind[i];
      const alpha = P.a[i] * (kind ? (1 - k) * (1 - k) : Math.min(1, k * 8) * (1 - k));
      const at = kind ? gp : sp, j = kind ? ng++ : ns++;
      at.position.array[j * 3] = x; at.position.array[j * 3 + 1] = y; at.position.array[j * 3 + 2] = z;
      at.aCol.array[j * 4] = P.r[i]; at.aCol.array[j * 4 + 1] = P.g[i]; at.aCol.array[j * 4 + 2] = P.b[i]; at.aCol.array[j * 4 + 3] = alpha;
      at.aDat.array[j * 2] = size; at.aDat.array[j * 2 + 1] = P.rot[i] + P.vrot[i] * age;
      // compact in place
      P.kind[w] = kind; P.x[w] = x; P.y[w] = y; P.z[w] = z; P.vx[w] = vx; P.vy[w] = vy; P.vz[w] = vz; P.age[w] = age; P.life[w] = P.life[i];
      P.size[w] = P.size[i]; P.grow[w] = P.grow[i]; P.rot[w] = P.rot[i]; P.vrot[w] = P.vrot[i]; P.r[w] = P.r[i]; P.g[w] = P.g[i]; P.b[w] = P.b[i]; P.a[w] = P.a[i];
      P.drag[w] = P.drag[i]; P.grav[w] = P.grav[i]; w++;
    }
    P.n = w;
    for (const [pts, n] of [[ptsSmoke, ns], [ptsGlow, ng]]) {
      pts.geometry.setDrawRange(0, n);
      const a = pts.geometry.attributes; a.position.needsUpdate = a.aCol.needsUpdate = a.aDat.needsUpdate = true;
    }
  }

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
  function muzzle(x1, z1, x2, z2, enemy) {
    const y = surfaceH(x1, z1) + 1.36;
    emit(1, x1, y, z1, 0, 0, 0, 1.5, 0.6, 0.05, enemy ? 12 : 12, enemy ? 3 : 8, enemy ? 3 : 2.5, 1, 0, 0);
    if (Math.random() < 0.5) flashAt(x1, y + 0.3, z1, 1, enemy ? 0.4 : 0.75, 0.35, 2.6, 0.06);
  }

  // ---------- per-car effects ----------
  function carTick(c, dt) {
    const ud = c.mesh.userData, [fx_, fz_] = c.fwd, rx = -fz_, rz = fx_;
    const vf = c.vx * fx_ + c.vz * fz_, vr = c.vx * rx + c.vz * rz;
    const st = c._hd || (c._hd = { vf, h: c.h, acc: 0, yaw: 0, pitch: 0, roll: 0, dead: 0, wl: null, wr: null, e: 0 });
    const idt = 1 / Math.max(dt, 0.004);
    st.acc += ((vf - st.vf) * idt - st.acc) * Math.min(1, dt * 6); st.vf = vf;
    let dh = c.h - st.h; if (dh > Math.PI) dh -= 6.283; if (dh < -Math.PI) dh += 6.283;
    st.yaw += (dh * idt - st.yaw) * Math.min(1, dt * 6); st.h = c.h;
    if (ud.bodyG) { // weight transfer
      const tp = Math.max(-0.045, Math.min(0.05, st.acc * 0.0035)), tr = Math.max(-0.075, Math.min(0.075, -st.yaw * vf * 0.0042));
      st.pitch += (tp - st.pitch) * Math.min(1, dt * 7); st.roll += (tr - st.roll) * Math.min(1, dt * 7);
      ud.bodyG.rotation.x = c.alive ? st.pitch : 0.02; ud.bodyG.rotation.z = c.alive ? st.roll : 0.05;
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
  function frame(dt) {
    time += dt;
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

  // ---------- frame rendering ----------
  const focus = new THREE.Vector3();
  function render(views) {
    const pr = renderer.getPixelRatio();
    skyU.time.value = time; finalMat.uniforms.time.value = time;
    for (const v of views) {
      sceneRT.viewport.set(Math.round(v.x * pr), Math.round((innerHeight - v.y - v.h) * pr), Math.round(v.w * pr), Math.round(v.h * pr));
      sceneRT.scissor.copy(sceneRT.viewport); sceneRT.scissorTest = views.length > 1;
      dome.position.copy(v.cam.position);
      if (v.car) focus.copy(v.car.mesh.position); else focus.set(0, 0, 0);
      sun.position.copy(focus).add(SUN_OFF); sun.target.position.copy(focus); sun.target.updateMatrixWorld();
      const sc = v.h * pr * 0.5 * v.cam.projectionMatrix.elements[5];
      ptsSmoke.material.uniforms.uScale.value = sc; ptsGlow.material.uniforms.uScale.value = sc;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, v.cam);
    }
    // bloom: bright pass, then a blurred mip chain
    brightMat.uniforms.t.value = sceneRT.texture; pass(brightMat, bB[0]);
    for (let i = 0; i < bA.length; i++) {
      const src = i === 0 ? bB[0] : bA[i - 1];
      if (i === 0) { blurMat.uniforms.t.value = bB[0].texture; blurMat.uniforms.d.value.set(1 / bA[0].width, 0); pass(blurMat, bA[0]); blurMat.uniforms.t.value = bA[0].texture; blurMat.uniforms.d.value.set(0, 1 / bA[0].height); pass(blurMat, bB[0]); blurMat.uniforms.t.value = bB[0].texture; blurMat.uniforms.d.value.set(0, 0); pass(blurMat, bA[0]); continue; }
      blurMat.uniforms.t.value = src.texture; blurMat.uniforms.d.value.set(1 / bA[i].width, 0); pass(blurMat, bB[i]);
      blurMat.uniforms.t.value = bB[i].texture; blurMat.uniforms.d.value.set(0, 1 / bA[i].height); pass(blurMat, bA[i]);
    }
    const u = finalMat.uniforms; u.t.value = sceneRT.texture; u.levels.value = bA.length;
    for (let i = 0; i < 5; i++) u['b' + i].value = bA[Math.min(i, bA.length - 1)].texture;
    renderer.setRenderTarget(null); renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight);
    pass(finalMat, null);
  }

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
    return m;
  }
  function waterMat() {
    const n = 128, hf = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) hf[y * n + x] = Math.sin(x * 0.196 + Math.sin(y * 0.147) * 2.1) * 1.2 + Math.sin(y * 0.245 + x * 0.098) + Math.sin((x + y) * 0.39) * 0.5;
    const nm = heightToNormal(hf, n, 0.5); nm.repeat.set(110, 110);
    const m = new THREE.MeshStandardMaterial({ color: lin(0x18323c), roughness: 0.09, metalness: 0.0, normalMap: nm, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 1.5 });
    done.add(m); waterMatRef = m;
    return m;
  }
  // ---------- high-resolution drawn facades: colour, lit windows, relief and glossy glass ----------
  // one tile = 4 bays x 4 floors = 16 m x 12.8 m, at 64 px per metre
  // ground = true paints the street-level strip instead (one floor): doors, garages, shop fronts
  function facadeTextures(style, ground) {
    const shop = style === 'shop', S = shop ? 2048 : 1024, M = 64, bw = 256, fh = 256, rows = ground ? 1 : 4, SH = rows * fh, bays = S / bw;
    const [c, g] = canvas(S, SH), [ce, ge] = canvas(S, SH), [ch, gh] = canvas(S, SH), [cr, gr] = canvas(S, SH);
    const R = Math.random;
    g.fillStyle = '#f3f0ea'; g.fillRect(0, 0, S, SH); ge.fillStyle = '#000'; ge.fillRect(0, 0, S, SH);
    gh.fillStyle = 'rgb(128,128,128)'; gh.fillRect(0, 0, S, SH); gr.fillStyle = 'rgb(0,240,0)'; gr.fillRect(0, 0, S, SH);
    const H = (v, x, y, w, h) => { gh.fillStyle = `rgb(${v},${v},${v})`; gh.fillRect(x, y, w, h); };
    // weathered plaster: soft blotches and streaks
    for (let i = 0; i < 65 * rows * bays / 4 * (ground ? 2 : 1); i++) {
      const x = R() * S, y = R() * SH, r = 30 + R() * 130, d = R() < 0.6;
      for (const ox of [0, S, -S]) for (const oy of [0, SH, -SH]) {
        const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        rg.addColorStop(0, d ? `rgba(60,50,40,${0.02 + R() * 0.035})` : `rgba(255,255,255,${0.03 + R() * 0.05})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(0, 0, S, SH);
      }
    }
    if (style === 'brick') {
      for (let y = 0, row = 0; y < SH; y += 5, row++) {
        for (let x = (row % 2) * -8; x < S; x += 16) { const v = 200 + R() * 55 | 0; g.fillStyle = `rgb(${v},${v - 14 - R() * 16 | 0},${v - 22 - R() * 18 | 0})`; g.fillRect(x, y, 15, 4); H(138, x, y, 15, 4); }
        g.fillStyle = 'rgba(235,228,214,1)'; g.fillRect(0, y + 4, S, 1); H(112, 0, y + 4, S, 1);
      }
    } else if (style === 'industrial') {
      for (let x = 0; x < S; x += 16) { const lg = g.createLinearGradient(x, 0, x + 16, 0); lg.addColorStop(0, 'rgba(0,0,0,.16)'); lg.addColorStop(0.5, 'rgba(255,255,255,.1)'); lg.addColorStop(1, 'rgba(0,0,0,.16)'); g.fillStyle = lg; g.fillRect(x, 0, 16, SH); H(104, x, 0, 3, SH); H(150, x + 6, 0, 5, SH); }
      for (let f = 0; f < (ground ? 0 : 4); f += 2) { // a band of workshop windows every other floor
        const y = f * fh + 26;
        g.fillStyle = '#d9d6cf'; g.fillRect(0, y - 5, S, 76); H(160, 0, y - 5, S, 76);
        for (let x = 6; x < S; x += 64) {
          const lg = g.createLinearGradient(0, y, 0, y + 66); lg.addColorStop(0, '#5c6b78'); lg.addColorStop(1, '#27313b'); g.fillStyle = lg; g.fillRect(x, y, 56, 66); H(70, x, y, 56, 66);
          gr.fillStyle = 'rgb(0,30,150)'; gr.fillRect(x, y, 56, 66);
          g.fillStyle = '#c8c5be'; g.fillRect(x + 27, y, 2, 66); g.fillRect(x, y + 32, 56, 2);
          if (R() < 0.3) { ge.fillStyle = '#bfd8ff'; ge.fillRect(x, y, 56, 66); }
        }
      }
      for (let i = 0; i < 10 * rows; i++) { const x = R() * S, y = R() * SH; const lg = g.createLinearGradient(0, y, 0, y + 120); lg.addColorStop(0, 'rgba(110,60,30,.22)'); lg.addColorStop(1, 'rgba(110,60,30,0)'); g.fillStyle = lg; g.fillRect(x, y, 2 + R() * 5, 120); } // rust runs
    } else if (style === 'plain' || style === 'block') {
      g.fillStyle = 'rgba(0,0,0,.2)';
      for (let f = 0; f < rows; f++) { g.fillRect(0, f * fh, S, 2); H(96, 0, f * fh, S, 3); }
      for (let b = 0; b < bays; b++) { g.fillRect(b * bw, 0, 2, SH); H(96, b * bw, 0, 3, SH); }
    }
    const SHUT = ['#5d7488', '#6f8a7c', '#8a6a5a', '#7a7f8c', '#4f6a5c'];
    // street-level features
    const WOOD = ['#5a2e1e', '#1f3d2e', '#27364a', '#6b1f1f', '#2d2d30', '#7a5a34'];
    const RG = (v, x, y, w, h) => { gr.fillStyle = `rgb(0,${v},0)`; gr.fillRect(x, y, w, h); };
    const door = (x0, wide) => {
      const dw = wide ? 150 : 66, dh = 176, x = Math.round(x0 + (bw * (wide ? 2 : 1) - dw) / 2), y = SH - dh - 6, col = WOOD[R() * WOOD.length | 0];
      g.fillStyle = '#ece7dc'; g.fillRect(x - 12, y - 46, dw + 24, dh + 52); H(152, x - 12, y - 46, dw + 24, dh + 52);          // stone surround
      const lg = g.createLinearGradient(0, y - 36, 0, y - 6); lg.addColorStop(0, '#586878'); lg.addColorStop(1, '#232c35'); g.fillStyle = lg; g.fillRect(x, y - 36, dw, 30); // fanlight
      RG(26, x, y - 36, dw, 30); gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(x, y - 36, dw, 30); H(70, x, y - 36, dw, 30);
      if (R() < 0.5) { ge.fillStyle = '#ffcf80'; ge.fillRect(x, y - 36, dw, 30); }
      g.fillStyle = col; g.fillRect(x, y, dw, dh); H(96, x, y, dw, dh); RG(120, x, y, dw, dh);
      const leaves = wide ? 2 : 1, lw = dw / leaves;
      for (let k = 0; k < leaves; k++) for (const [py, ph] of [[10, 62], [84, 80]]) {
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + k * lw + 9, y + py, lw - 18, ph); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + k * lw + 12, y + py + 3, lw - 24, ph - 6); H(84, x + k * lw + 9, y + py, lw - 18, ph);
      }
      if (wide) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x + dw / 2 - 1, y, 2, dh); }
      g.fillStyle = '#d9c070'; g.fillRect(x + (wide ? dw / 2 + 8 : dw - 14), y + 84, 6, 6);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, dw, 6); g.fillRect(x, y, 4, dh);
      g.fillStyle = '#cfcabd'; g.fillRect(x - 16, SH - 7, dw + 32, 7); H(210, x - 16, SH - 7, dw + 32, 7);                        // step
    };
    const garage = (x0, tall) => {
      const dw = tall ? 440 : 170, dh = tall ? 236 : 170, x = Math.round(x0 + ((tall ? 2 : 1) * bw - dw) / 2), y = SH - dh, col = tall ? ['#8d959c', '#4e6a58', '#6f7f95'][R() * 3 | 0] : ['#e6e2d8', '#4f6a5c', '#7a5a34', '#9aa0a6'][R() * 4 | 0];
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 5, y - 5, dw + 10, dh + 5); H(150, x - 8, y - 8, dw + 16, dh + 8);
      g.fillStyle = col; g.fillRect(x, y, dw, dh); H(100, x, y, dw, dh); RG(110, x, y, dw, dh);
      for (let yy = y + 4; yy < SH; yy += tall ? 9 : 28) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, yy, dw, tall ? 3 : 3); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x, yy + 3, dw, 2); H(86, x, yy, dw, 3); }
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y, dw, 8);
      if (tall) for (const sx of [x - 26, x + dw + 8]) for (let yy = SH - 90; yy < SH; yy += 18) { g.fillStyle = (yy / 18 | 0) % 2 ? '#e2b21f' : '#1b1b1b'; g.fillRect(sx, yy, 18, 18); }
    };
    const hall = x0 => { // glazed entrance of a block of flats, under a canopy
      const dw = 190, dh = 186, x = x0 + (bw - dw) / 2, y = SH - dh;
      g.fillStyle = '#b9b5ab'; g.fillRect(x - 26, y - 22, dw + 52, 16); H(225, x - 26, y - 22, dw + 52, 16); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 26, y - 6, dw + 52, 9);
      const lg = g.createLinearGradient(0, y, 0, SH); lg.addColorStop(0, '#5b6c7b'); lg.addColorStop(1, '#1d262e'); g.fillStyle = lg; g.fillRect(x, y, dw, dh); H(72, x, y, dw, dh);
      gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(x, y, dw, dh); ge.fillStyle = '#d9c38a'; ge.fillRect(x, y, dw, dh);
      g.fillStyle = '#30343a'; for (const fx of [0, dw / 3, dw * 2 / 3, dw - 5]) { g.fillRect(x + fx, y, 5, dh); ge.fillStyle = '#000'; ge.fillRect(x + fx, y, 5, dh); } g.fillRect(x, y, dw, 6); g.fillRect(x, y + 50, dw, 4);
      g.fillStyle = '#c9c9c9'; g.fillRect(x - 16, y + 70, 9, 22);
    };
    const SHOPS = [['BOULANGERIE', '#7a1f2b', '#f1e3c0'], ['BAR  TABAC', '#1d2f52', '#f2efe6'], ['PHARMACIE', '#1f6a3a', '#ffffff'], ['COIFFURE', '#5a2a5e', '#f6e9f2'], ['BOUCHERIE', '#8a1a1a', '#fff4e0'], ['PRESSE  LOTO', '#c9a21a', '#1b1b1b'], ['ALIMENTATION', '#2a5a2a', '#f4f0d8'], ['CAFÉ DE LA BUTTE', '#3a2a1e', '#e8c98a']];
    const shopFront = (x0, k) => {
      const [name, col, ink] = SHOPS[k % SHOPS.length], w = 2 * bw, x = x0 + 14, sw = w - 28, top = 20, sy = 70, base = SH - 30;
      g.fillStyle = col; g.fillRect(x, top, sw, 46); H(170, x, top, sw, 46); RG(120, x, top, sw, 46);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, top + 46, sw, 5);
      g.fillStyle = ink; g.font = 'bold 30px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, x + sw / 2, top + 24, sw - 30);
      ge.fillStyle = 'rgba(255,240,210,.35)'; ge.fillRect(x, top, sw, 46);
      g.fillStyle = col; g.fillRect(x, sy, sw, SH - sy); H(140, x, sy, sw, SH - sy);                                             // painted shop surround
      const lg = g.createLinearGradient(0, sy, 0, base); lg.addColorStop(0, '#6c7a86'); lg.addColorStop(1, '#2a333c');
      const panes = [[x + 12, (sw - 110) / 2 - 18], [x + (sw - 86) / 2, 86], [x + (sw + 110) / 2 + 6, (sw - 110) / 2 - 18]];
      panes.forEach(([px, pw], i) => {
        const pb = i === 1 ? SH - 6 : base;
        g.fillStyle = lg; g.fillRect(px, sy + 10, pw, pb - sy - 10); H(74, px, sy + 10, pw, pb - sy - 10); gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(px, sy + 10, pw, pb - sy - 10);
        const le = ge.createLinearGradient(0, sy, 0, pb); le.addColorStop(0, '#ffe2a8'); le.addColorStop(1, '#c08a3c'); ge.fillStyle = le; ge.fillRect(px, sy + 10, pw, pb - sy - 10);
        if (i !== 1) for (let s2 = 0; s2 < 3; s2++) { g.fillStyle = 'rgba(230,220,200,.22)'; g.fillRect(px + 8, sy + 46 + s2 * 34, pw - 16, 3); for (let q = px + 12; q < px + pw - 16; q += 14 + R() * 10) { g.fillStyle = `hsla(${R() * 360 | 0},45%,60%,.5)`; g.fillRect(q, sy + 28 + s2 * 34, 8 + R() * 6, 18); ge.fillStyle = 'rgba(0,0,0,.3)'; ge.fillRect(q, sy + 28 + s2 * 34, 10, 18); } }
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px, sy + 10, pw, 6);
      });
      if (k % 3 === 0) { // striped awning
        for (let q = 0; q < sw; q += 24) { g.fillStyle = (q / 24 | 0) % 2 ? ink : col; g.beginPath(); g.moveTo(x + q, sy - 2); g.lineTo(x + q + 24, sy - 2); g.lineTo(x + q + 24, sy + 34); g.lineTo(x + q, sy + 34); g.fill(); }
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, sy + 34, sw, 7); H(215, x, sy - 2, sw, 36); RG(200, x, sy - 2, sw, 36); ge.fillStyle = '#000'; ge.fillRect(x, sy - 2, sw, 43);
      }
    };
    const LAYOUT = { house: ['door', 'win', 'win', 'garage'], brick: ['win', 'door', 'win', 'win'], block: ['win', 'hall', 'win', 'win'], plain: ['', 'door', '', ''], industrial: ['', 'roller', '-', 'door'], church: ['', 'bigdoor', '-', ''] };
    if (shop) for (let k = 0; k < bays / 2; k++) shopFront(k * 2 * bw, (k * 3 + (R() * 8 | 0)) % 8);
    for (let f = 0; f < rows; f++) for (let b = 0; b < bays; b++) {
      if (shop) continue;
      const x0 = b * bw, y0 = f * fh;
      if (ground) {
        const what = LAYOUT[style][b];
        if (what === 'door') { door(x0, false); continue; }
        if (what === 'bigdoor') { door(x0, true); continue; }
        if (what === 'garage') { garage(x0, false); continue; }
        if (what === 'roller') { garage(x0, true); continue; }
        if (what === 'hall') { hall(x0); continue; }
        if (what !== 'win') continue;
      }
      if (style === 'industrial' || style === 'plain') continue;
      let ww = 1.0 * M, wh = 1.7 * M;
      if (style === 'block') { ww = 2.3 * M; wh = 1.45 * M; }
      if (style === 'church') { if (b % 2) continue; ww = 1.15 * M; wh = 2.5 * M; }
      const wx = Math.round(x0 + (bw - ww) / 2), wy = Math.round(y0 + (fh - wh) * (style === 'church' ? 0.35 : 0.42));
      const lit = R() < 0.3, warm = R() < 0.85;
      if (style === 'house' || style === 'brick' || style === 'church') { // stone surround
        g.fillStyle = style === 'brick' ? '#efe9dc' : 'rgba(255,255,255,.55)'; g.fillRect(wx - 9, wy - 12, ww + 18, wh + 16); H(150, wx - 9, wy - 12, ww + 18, wh + 16);
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(wx - 9, wy + wh + 4, ww + 18, 3);
      }
      // glass
      const lg = g.createLinearGradient(0, wy, 0, wy + wh);
      if (style === 'church') { lg.addColorStop(0, '#3b3466'); lg.addColorStop(1, '#1d2440'); } else { lg.addColorStop(0, '#586878'); lg.addColorStop(0.5, '#2c3742'); lg.addColorStop(1, '#1b232b'); }
      g.fillStyle = lg;
      if (style === 'church') { g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill(); } else g.fillRect(wx, wy, ww, wh);
      H(64, wx, wy, ww, wh); gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(wx, wy, ww, 7); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx, wy, 5, wh); // recess shadow
      if (lit) { const le = ge.createLinearGradient(0, wy, 0, wy + wh); le.addColorStop(0, warm ? '#ffd58a' : '#a9c8ff'); le.addColorStop(1, warm ? '#c98a3a' : '#5f86c9'); ge.fillStyle = le; ge.fillRect(wx, wy, ww, wh); }
      if (style !== 'church' && R() < 0.55) { // net curtains
        g.fillStyle = 'rgba(235,235,225,.5)'; const cw = ww * (0.25 + R() * 0.2); g.fillRect(wx + 3, wy + 4, cw, wh - 6); g.fillRect(wx + ww - 3 - cw, wy + 4, cw, wh - 6);
        if (lit) { ge.fillStyle = 'rgba(0,0,0,.25)'; ge.fillRect(wx + 3, wy + 4, cw, wh - 6); }
      }
      // frame and glazing bars
      g.strokeStyle = style === 'church' ? '#15151c' : '#f2f0ea'; g.lineWidth = 4; g.strokeRect(wx + 2, wy + 2, ww - 4, wh - 4);
      g.fillStyle = g.strokeStyle;
      if (style === 'block') { g.fillRect(wx + ww * 0.36, wy, 4, wh); g.fillRect(wx + ww * 0.68, wy, 4, wh); }
      else { g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + wh * 0.36, ww, 3); if (style === 'church') for (let k = 1; k < 6; k++) g.fillRect(wx, wy + wh * k / 6, ww, 2); }
      for (const gg of [ge]) { gg.fillStyle = '#000'; if (style === 'block') { gg.fillRect(wx + ww * 0.36, wy, 4, wh); gg.fillRect(wx + ww * 0.68, wy, 4, wh); } else { gg.fillRect(wx + ww / 2 - 2, wy, 4, wh); gg.fillRect(wx, wy + wh * 0.36, ww, 3); } }
      // sill
      g.fillStyle = '#e9e5db'; g.fillRect(wx - 12, wy + wh, ww + 24, 7); H(200, wx - 12, wy + wh, ww + 24, 7);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(wx - 12, wy + wh + 7, ww + 24, 5);
      if (style === 'house') { // louvred shutters, open against the wall
        const sc = SHUT[(f * 2 + b * 3 + (R() * 2 | 0)) % SHUT.length], sw = 0.48 * M;
        for (const sx of [wx - sw - 3, wx + ww + 3]) {
          g.fillStyle = sc; g.fillRect(sx, wy - 2, sw, wh + 4); H(176, sx, wy - 2, sw, wh + 4);
          g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = wy + 2; y < wy + wh; y += 6) g.fillRect(sx + 3, y, sw - 6, 2);
          g.fillStyle = 'rgba(255,255,255,.14)'; for (let y = wy + 4; y < wy + wh; y += 6) g.fillRect(sx + 3, y, sw - 6, 1);
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(sx + sw, wy, 3, wh + 4);
        }
        if (R() < 0.4) { g.strokeStyle = '#1c1c20'; g.lineWidth = 2; g.strokeRect(wx + 1, wy + wh - 30, ww - 2, 28); for (let x = wx + 8; x < wx + ww; x += 9) g.strokeRect(x, wy + wh - 30, 0.5, 28); } // window guard
      }
      if (style === 'block') {
        const dn = R() < 0.6 ? (0.15 + R() * 0.7) * wh : 0; // roller blind
        if (dn) { g.fillStyle = '#cfccc4'; g.fillRect(wx + 3, wy + 3, ww - 6, dn); g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = wy + 5; y < wy + dn; y += 5) g.fillRect(wx + 3, y, ww - 6, 1); ge.fillStyle = '#000'; ge.fillRect(wx + 3, wy + 3, ww - 6, dn); gr.fillStyle = 'rgb(0,220,0)'; gr.fillRect(wx + 3, wy + 3, ww - 6, dn); H(120, wx + 3, wy + 3, ww - 6, dn); }
        if (b % 2 === f % 2) { // balcony
          const by = wy + wh + 10; g.fillStyle = '#c9c5bb'; g.fillRect(x0 + 10, by, bw - 20, 10); H(215, x0 + 10, by, bw - 20, 10);
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 + 10, by + 10, bw - 20, 8);
          g.fillStyle = '#3a3d42'; g.fillRect(x0 + 10, by - 50, bw - 20, 3); for (let x = x0 + 12; x < x0 + bw - 10; x += 8) g.fillRect(x, by - 50, 2, 50);
        }
      }
      if (style === 'brick') { g.fillStyle = '#efe9dc'; g.fillRect(wx - 16, wy - 26, ww + 32, 16); H(170, wx - 16, wy - 26, ww + 32, 16); } // lintel
    }
    if (style === 'house' || style === 'brick' || style === 'church' || shop) for (let f = 0; f < rows; f++) { // string course between floors
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, f * fh, S, 7); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, f * fh + 7, S, 4); H(190, 0, f * fh, S, 7);
    }
    // fine grain
    if (ground) { // darker plinth along the pavement
      const lg = g.createLinearGradient(0, SH - 40, 0, SH); lg.addColorStop(0, 'rgba(60,50,45,0)'); lg.addColorStop(1, 'rgba(60,50,45,.3)'); g.fillStyle = lg; g.fillRect(0, SH - 40, S, 40);
    }
    const im = g.getImageData(0, 0, S, SH), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
    // relief from a softened height map
    const [cb, gb] = canvas(S, SH); try { gb.filter = 'blur(1.4px)'; } catch (e) { } gb.drawImage(ch, 0, 0);
    const hd_ = gb.getImageData(0, 0, S, SH).data, hf = new Float32Array(S * SH); for (let i = 0; i < S * SH; i++) hf[i] = hd_[i * 4] / 255 * 7;
    const mk = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
    return { map: mk(c), emissive: mk(ce), normal: heightToNormal(hf, S, 1, SH), rough: mk(cr) };
  }
  const GROUND_STYLES = ['house', 'block', 'industrial', 'plain', 'brick', 'church', 'shop'];
  function wallMat(style, ground) {
    const t = facadeTextures(style, ground);
    return new THREE.MeshStandardMaterial({ map: t.map, vertexColors: true, emissive: 0xffffff, emissiveMap: t.emissive, emissiveIntensity: 0, normalMap: t.normal, normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 1, metalness: 1, roughnessMap: t.rough, metalnessMap: t.rough, envMapIntensity: 0.9 });
  }
  // ---------- ground: gravel and grass on the terrain (chosen from the vertex colour), paved footways ----------
  function tileTex(n, f) { const t = new THREE.CanvasTexture(noiseCanvas(n, f)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
  function blotch(n, k) { // smooth tiling value noise
    const a = new Float32Array(n * n), c = n / k, v = new Float32Array(k * k).map(() => Math.random());
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const fx = x / c, fy = y / c, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const p = (i, j) => v[((iy + j) % k) * k + (ix + i) % k];
      a[y * n + x] = (p(0, 0) * (1 - sx) + p(1, 0) * sx) * (1 - sy) + (p(0, 1) * (1 - sx) + p(1, 1) * sx) * sy;
    }
    return a;
  }
  function slabTextures(n, cell, bond) { // concrete paving slabs with joints: colour and relief
    const hf = new Float32Array(n * n), b1 = blotch(n, 8), tone = new Float32Array(256).map(() => Math.random());
    const map = tileTex(n, (d, o, x, y) => {
      const cx = x / cell | 0, yy = y + (bond ? (cx % 2) * cell / 2 : 0), sx = x % cell, sy = yy % cell, joint = sx < 2 || sy < 2, i = y * n + x;
      hf[i] = joint ? 0 : 3 + Math.random() * 0.5;
      const t = tone[(cx * 7 + (yy / cell | 0) * 13) % 256];
      const v = joint ? 118 : 206 + t * 30 + b1[i] * 18 + (Math.random() - 0.5) * 22 - (Math.random() < 0.012 ? 50 : 0);
      d[o] = v; d[o + 1] = v - 2; d[o + 2] = v - 6; d[o + 3] = 255;
    });
    return { map, normal: heightToNormal(hf, n, 0.35) };
  }
  // ---------- aerial photo (IGN BD ORTHO) on the ground and the roofs ----------
  let orthoTex = null; const orthoBox = new THREE.Vector4(0, 0, 1, 1);
  function ortho() {
    if (orthoTex || !window.ORTHO) return orthoTex;
    const o = window.ORTHO; orthoTex = new THREE.TextureLoader().load(o.src); orthoTex.anisotropy = 8; done.add(orthoTex);
    orthoBox.set(o.x0, o.z0, o.x1, o.z1);
    return orthoTex;
  }
  // meshes in world coordinates sample the photo straight down
  function orthoPatch(sh, extraDecl, colourCode) {
    const t = ortho();
    sh.uniforms.orthoMap = { value: t }; sh.uniforms.oBox = { value: orthoBox }; sh.uniforms.oOn = { value: t ? 1 : 0 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec4 oBox; varying vec2 vOrtho; varying vec3 vW; attribute float aRoad; varying float vRoad;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = position; vRoad = aRoad; vOrtho = vec2((position.x - oBox.x) / (oBox.z - oBox.x), 1.0 - (position.z - oBox.y) / (oBox.w - oBox.y));');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D orthoMap; uniform float oOn; varying vec2 vOrtho; varying vec3 vW; varying float vRoad;\n' + extraDecl)
      .replace('#include <color_fragment>', `float inO = oOn * step(0.0, vOrtho.x) * step(vOrtho.x, 1.0) * step(0.0, vOrtho.y) * step(vOrtho.y, 1.0);
        vec2 ouv = clamp(vOrtho, 0.0, 1.0);` + colourCode);
  }
  // Terrain between the streets. The aerial photo is not shown as such (roofs and tree crowns lean over the pavements
  // in it); it decides where gardens are and how light or dark the ground is, and drawn textures do the rest.
  function groundMat() {
    const n = 512, b1 = blotch(n, 8), b2 = blotch(n, 32);
    const sl = slabTextures(n, 64, true); sl.map.repeat.set(2, 2); sl.normal.repeat.set(2, 2);
    const grass = tileTex(n, (d, o, x, y) => { const i = y * n + x, v = 0.62 + b1[i] * 0.3 + b2[i] * 0.22 + (Math.random() - 0.5) * 0.3; d[o] = d[o + 1] = d[o + 2] = 255 * Math.min(1, v); d[o + 3] = 255; });
    done.add(grass);
    const m = new THREE.MeshStandardMaterial({ map: sl.map, vertexColors: true, roughness: 0.93, metalness: 0, normalMap: sl.normal, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 0.3 });
    m.onBeforeCompile = sh => {
      sh.uniforms.grassMap = { value: grass };
      orthoPatch(sh, 'uniform sampler2D grassMap;', `
        vec3 oc = sRGBToLinear(texture2D(orthoMap, ouv, 1.6)).rgb, ol = sRGBToLinear(texture2D(orthoMap, ouv, 5.0)).rgb;
        float veg = smoothstep(1.1, 1.32, oc.g / (max(oc.r, oc.b) + 0.004)) * inO * (1.0 - smoothstep(0.25, 0.8, vRoad));
        float park = smoothstep(0.0, 0.02, vColor.g - max(vColor.r, vColor.b));
        float isGrass = max(veg, park);
        float lum = mix(1.0, clamp(dot(ol, vec3(0.3333)) * 3.4, 0.7, 1.25), inO);
        float gd = sRGBToLinear(texture2D(grassMap, vUv * 0.85)).g * sRGBToLinear(texture2D(grassMap, vUv * 0.11)).g * 4.2;
        vec3 paving = mix(vColor, vec3(0.36, 0.35, 0.33), inO * (1.0 - park)) * (dot(diffuseColor.rgb, vec3(0.3333)) / 0.62) * lum;
        vec3 lawn = mix(vec3(0.05, 0.13, 0.03), vec3(0.13, 0.22, 0.06), clamp(dot(ol, vec3(0.3333)) * 4.0 - 0.3, 0.0, 1.0)) * mix(gd, 1.0, 0.2) * 1.25;
        diffuseColor.rgb = mix(paving, lawn, isGrass);`);
    };
    return m;
  }
  // Roofs take their colour from the aerial photo (slate, tiles, flat roofs), softened, under drawn rows of slates.
  function roofMat() {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, envMapIntensity: 0.55 });
    m.onBeforeCompile = sh => orthoPatch(sh, '', `
        float steep = 1.0 - abs(normalize(cross(dFdx(vW), dFdy(vW))).y); // sharp on flat roofs, softened on slopes where the photo would streak
        vec3 oc = sRGBToLinear(texture2D(orthoMap, ouv, mix(0.2, 3.2, smoothstep(0.05, 0.5, steep)))).rgb;
        float row = fract(vW.y * 3.6), col2 = fract((vW.x + vW.z) * 2.2 + floor(vW.y * 3.6) * 0.5);
        float slate = 1.0 - 0.16 * step(row, 0.1) - 0.07 * step(col2, 0.07) + 0.05 * sin(vW.x * 7.0 + vW.z * 5.0) * sin(vW.z * 9.0 - vW.x * 3.0);
        diffuseColor.rgb = mix(vColor, oc * 0.92, inO) * mix(1.0, slate, smoothstep(0.02, 0.2, steep));`);
    return m;
  }
  function footMat() {
    const sl = slabTextures(512, 128, true);
    return new THREE.MeshStandardMaterial({ map: sl.map, vertexColors: true, roughness: 0.9, metalness: 0, normalMap: sl.normal, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.4 });
  }
  function crownGeo() { // a fuller, lumpy tree crown with darker undersides
    const g = new THREE.IcosahedronGeometry(2.6, 2), p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const n = v.clone().normalize();
      const d = 1 + 0.2 * Math.sin(n.x * 5.1 + n.y * 3.3) * Math.cos(n.z * 4.7 + n.y * 2.1) + 0.12 * Math.sin(n.x * 11 + n.z * 9 + n.y * 7);
      v.multiplyScalar(d); if (v.y < -1.2) v.y = -1.2 - (v.y + 1.2) * -0.25;
      p.setXYZ(i, v.x, v.y, v.z);
      const s = 0.55 + 0.45 * Math.max(0, n.y * 0.5 + 0.5) + (d - 1) * 0.8; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.max(0.3, Math.min(1.15, s));
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const nr = g.attributes.normal; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); nr.setXYZ(i, v.x, v.y, v.z); }
    return g;
  }
  function buildLamps() { // sodium street lamps along the wider streets; lit at night
    const pts = [];
    let alt = 0;
    for (const r of W.roads) {
      if (!r.d || r.b || r.w < 6) continue;
      const p = r.p; let acc = 20;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1], l = Math.hypot(dx, dz); if (l < 0.01) continue;
        let t = 36 - acc;
        while (t < l) {
          const side = (alt++ % 2) ? 1 : -1, ux = dx / l, uz = dz / l, off = r.w / 2 + 1.5;
          const x = p[i] + ux * t - uz * off * side, z = p[i + 1] + uz * t + ux * off * side;
          if (Math.abs(x) < HX - 5 && Math.abs(z) < HZ - 5 && groundH(x, z) > WATER_Y + 1 && roadEdge(x, z)[0] > 0.8 && !buildingPolys.some(b => pointInPoly(x, z, b.p || b))) pts.push([x, z, Math.atan2(-(-uz * -side), -(ux * -side))]);
          t += 36;
        }
        acc = (acc + l) % 36;
      }
    }
    const n = pts.length; if (!n) return;
    const poleG = new THREE.CylinderGeometry(0.07, 0.1, 7, 6).translate(0, 3.5, 0);
    const armG = new THREE.BoxGeometry(0.08, 0.08, 1.6).translate(0, 7, -0.75);
    const headG = new THREE.BoxGeometry(0.28, 0.1, 0.6).translate(0, 6.95, -1.5);
    const metal = new THREE.MeshStandardMaterial({ color: lin(0x3c4046), roughness: 0.6, metalness: 0.6 });
    const poles = new THREE.InstancedMesh(poleG, metal, n), arms = new THREE.InstancedMesh(armG, metal, n);
    lampBulbs = new THREE.InstancedMesh(headG, new THREE.MeshBasicMaterial({ color: 0x444444, fog: false }), n);
    const poolTex = glowTexture();
    lampPools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(0.75, 0.36, 0.1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), n);
    lampGlow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(1.6, 0.85, 0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }), n);
    const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
    pts.forEach(([x, z, a], i) => {
      const gy = surfaceH(x, z) + 0.2;
      qt.setFromEuler(e.set(0, a, 0)); m4.compose(v.set(x, gy, z), qt, s.set(1, 1, 1));
      poles.setMatrixAt(i, m4); arms.setMatrixAt(i, m4); lampBulbs.setMatrixAt(i, m4);
      const hx = x - Math.sin(a) * 1.5, hz = z - Math.cos(a) * 1.5, py = surfaceH(hx, hz) + 0.36;
      const sx = (surfaceH(hx + 3, hz) - surfaceH(hx - 3, hz)) / 6, sz = (surfaceH(hx, hz + 3) - surfaceH(hx, hz - 3)) / 6;
      qt.setFromEuler(e.set(Math.atan(sz), 0, -Math.atan(sx))); m4.compose(v.set(hx, py, hz), qt, s.set(20, 1, 20)); lampPools.setMatrixAt(i, m4);
      qt.setFromEuler(e.set(-Math.PI / 2, 0, 0)); m4.compose(v.set(hx, gy + 6.86, hz), qt, s.set(2.6, 2.6, 2.6)); lampGlow.setMatrixAt(i, m4);
      gridAdd([x - 0.12, z, x + 0.12, z], 3.5); gridAdd([x, z - 0.12, x, z + 0.12], 3.5);
    });
    poles.castShadow = true; lampPools.renderOrder = 3; lampGlow.renderOrder = 22;
    for (const o of [poles, arms, lampBulbs, lampPools, lampGlow]) { o.userData.hdLinear = true; o.frustumCulled = false; scene.add(o); }
  }

  // ---------- cars: lofted bodies ----------
  const CARS = {
    saloon: {
      yb: [[-2.27, 0.93], [-2.15, 0.99], [-1.32, 1.03], [0.92, 1.01], [1.95, 0.89], [2.2, 0.8], [2.27, 0.77]],
      hc: [[-1.5, 0], [-1.32, 0.02], [-0.72, 0.42], [0.32, 0.44], [0.94, 0.02], [1.1, 0]],
      wb: [[-2.27, 0.8], [-2.12, 0.85], [-1.0, 0.87], [1.0, 0.87], [1.9, 0.85], [2.15, 0.82], [2.27, 0.77]],
      y0: [[-2.27, 0.3], [-2.12, 0.22], [-1.9, 0.2], [1.9, 0.2], [2.12, 0.22], [2.27, 0.3]],
      glass: [-1.22, 0.86], pillar: [[-0.27, -0.19]], ramps: [[-1.32, -0.72], [0.32, 0.94]], doors: [0.9, -0.23, -1.25],
    },
    hatch: {
      yb: [[-1.97, 0.95], [-1.88, 1.0], [-1.7, 1.04], [0.72, 1.0], [1.75, 0.86], [1.94, 0.78], [2.0, 0.75]],
      hc: [[-1.97, 0], [-1.88, 0.03], [-1.62, 0.42], [0.12, 0.46], [0.74, 0.02], [0.9, 0]],
      wb: [[-1.97, 0.79], [-1.85, 0.83], [-0.9, 0.85], [0.9, 0.85], [1.65, 0.83], [1.9, 0.8], [2.0, 0.75]],
      y0: [[-1.97, 0.3], [-1.84, 0.22], [-1.65, 0.2], [1.7, 0.2], [1.86, 0.22], [2.0, 0.3]],
      glass: [-1.6, 0.66], pillar: [[-0.66, -0.58]], ramps: [[-1.88, -1.62], [0.12, 0.74]], doors: [0.7, -0.62],
    },
  };
  const kf = (pts, s) => { if (s <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (s <= pts[i][0]) { const [a, va] = pts[i - 1], [b, vb] = pts[i]; return va + (vb - va) * (s - a) / (b - a); } return pts[pts.length - 1][1]; };
  const NK = 13; // ring points per side, from the centre of the floor to the centre of the roof
  function sections(style, st) {
    const C = CARS[style], s0 = C.yb[0][0], s1 = C.yb[C.yb.length - 1][0], N = 110, S = [];
    for (let i = 0; i <= N; i++) { const s = s0 + (s1 - s0) * i / N; S.push({ s, yb: kf(C.yb, s), hc: Math.max(0.03, kf(C.hc, s)), wb: kf(C.wb, s) }); }
    for (let it = 0; it < 3; it++) for (const k of ['yb', 'hc', 'wb']) { const a = S.map(o => o[k]); for (let i = 1; i < N; i++) S[i][k] = (a[i - 1] + 2 * a[i] + a[i + 1]) / 4; }
    const R = st.wr + 0.085;
    for (const o of S) {
      const yB = kf(C.y0, o.s); let y0 = yB;
      for (const ax of [st.wb, -st.wb]) { const d = o.s - ax; if (Math.abs(d) < R) y0 = Math.max(y0, st.wr - 0.12 + Math.sqrt(R * R - d * d)); }
      o.y0 = y0;
      const H = o.yb - yB, wB = o.wb, wC = wB * 0.9 - 0.02, wR = wB * 0.74, top = o.yb + o.hc, up = (f, k) => Math.max(yB + H * f, y0 + 0.012 * k);
      o.ring = [[0, y0], [wB - 0.1, y0], [wB - 0.015, y0 + 0.045], [wB, up(0.42, 5)], [wB, up(0.6, 6)], [wB - 0.003, up(0.68, 7)], [wB - 0.02, o.yb - 0.035], [wB - 0.07, o.yb],
        [wC, o.yb + 0.008], [wR + 0.03, o.yb + o.hc * 0.93], [wR - 0.08, top], [0.17, top + 0.02], [0, top + 0.024]];
    }
    return { S, C, s0, s1 };
  }
  function shellGeo(style, st, paintC, stripeC) {
    const { S, C, s0, s1 } = sections(style, st), N = S.length, RN = 2 * NK - 2; // ring vertices (centre points shared)
    const pos = new Float32Array(N * RN * 3);
    S.forEach((o, i) => { for (let k = 0; k < RN; k++) { const r = k < NK ? o.ring[k] : o.ring[2 * NK - 2 - k], sx = k < NK ? 1 : -1, j = (i * RN + k) * 3; pos[j] = r[0] * sx; pos[j + 1] = r[1]; pos[j + 2] = -o.s; } });
    const idx = [];
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < RN; k++) { const a = i * RN + k, b = i * RN + (k + 1) % RN, c = a + RN, d = b + RN; idx.push(a, c, b, b, c, d); }
    const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g0.setIndex(idx); g0.computeVertexNormals();
    const nrm = g0.attributes.normal.array;
    // emit per-material triangle soups with smooth normals and per-quad colours
    const out = [[], [], [], []], outN = [[], [], [], []], outC = [];
    const inR = (s, r) => s >= r[0] && s <= r[1];
    for (let i = 0; i < N - 1; i++) {
      const sm = (S[i].s + S[i + 1].s) / 2, hc = (S[i].hc + S[i + 1].hc) / 2;
      const ramp = C.ramps.some(r => inR(sm, r)), sideGlass = inR(sm, C.glass) && hc > 0.1 && !C.pillar.some(r => inR(sm, r));
      const bumper = sm > s1 - 0.2 || sm < s0 + 0.2;
      for (let k = 0; k < RN; k++) {
        const kk = k < NK - 1 ? k : RN - 1 - k; // segment index on the right-hand ring (0..NK-2)
        let mat = 0, col = paintC;
        if (kk === 0) mat = 3; else if (kk === 1) mat = 2;
        else if (kk === 4 && stripeC && !bumper) col = stripeC;
        else if (kk === 8 && sideGlass) mat = 1;
        else if ((kk === 10 || kk === 11) && ramp && hc > 0.07) mat = 1;
        else if (kk === 11 && stripeC) col = stripeC;
        const a = i * RN + k, b = i * RN + (k + 1) % RN, c = a + RN, d = b + RN;
        for (const v of [a, c, b, b, c, d]) { out[mat].push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); outN[mat].push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]); if (mat === 0) outC.push(col.r, col.g, col.b); }
      }
    }
    // end caps (bumper faces)
    for (const [i, flip] of [[0, false], [N - 1, true]]) {
      const o = S[i], cy = (o.y0 + o.yb) / 2 + 0.03, cz = -o.s + (flip ? -0.02 : 0.02);
      for (let k = 0; k < RN; k++) {
        const a = (i * RN + k) * 3, b = (i * RN + (k + 1) % RN) * 3;
        const tri = flip ? [[0, cy, cz], [pos[b], pos[b + 1], pos[b + 2]], [pos[a], pos[a + 1], pos[a + 2]]] : [[0, cy, cz], [pos[a], pos[a + 1], pos[a + 2]], [pos[b], pos[b + 1], pos[b + 2]]];
        for (const p of tri) { out[0].push(...p); outN[0].push(0, 0.1, flip ? -1 : 1); outC.push(paintC.r, paintC.g, paintC.b); }
      }
    }
    const P_ = [], N_ = [], groups = []; let off = 0;
    for (let m = 0; m < 4; m++) { groups.push([off, out[m].length / 3, m]); off += out[m].length / 3; P_.push(...out[m]); N_.push(...outN[m]); }
    const colors = new Float32Array(P_.length).fill(1); colors.set(outC, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P_, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N_, 3)); g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    groups.forEach(([a, n, m]) => g.addGroup(a, n, m));
    g0.dispose();
    return { g, S, C, s0, s1 };
  }
  const shared = {};
  function sharedMats() {
    if (shared.glass) return shared;
    shared.glass = new THREE.MeshPhysicalMaterial({ color: lin(0x0b1218), roughness: 0.04, metalness: 0.85, envMapIntensity: 1.7, clearcoat: 1, clearcoatRoughness: 0.02 });
    shared.trim = new THREE.MeshStandardMaterial({ color: lin(0x1c1c20), roughness: 0.62, metalness: 0.1 });
    shared.under = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.95 });
    shared.rubber = new THREE.MeshStandardMaterial({ color: lin(0x121214), roughness: 0.88 });
    shared.chrome = new THREE.MeshStandardMaterial({ color: lin(0xe6e8ec), roughness: 0.12, metalness: 1, envMapIntensity: 1.4 });
    shared.alloy = new THREE.MeshStandardMaterial({ color: lin(0xb9bcc4), roughness: 0.28, metalness: 1 });
    shared.gold = new THREE.MeshStandardMaterial({ color: lin(0xd8a43c), roughness: 0.25, metalness: 1 });
    shared.gun = new THREE.MeshStandardMaterial({ color: lin(0x26272b), roughness: 0.38, metalness: 0.9 });
    shared.disc = new THREE.MeshStandardMaterial({ color: lin(0x55585e), roughness: 0.45, metalness: 0.9 });
    shared.ind = new THREE.MeshStandardMaterial({ color: lin(0xff8a14), emissive: lin(0xff7a10), emissiveIntensity: 0.5, roughness: 0.3 });
    shared.seam = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    Object.values(shared).forEach(m => done.add(m));
    return shared;
  }
  function wheelGeos(R) {
    const w = 0.215, pr = [[R * 0.6, -w / 2], [R * 0.9, -w / 2], [R * 0.985, -w / 2 + 0.022], [R, -w / 2 + 0.05], [R, w / 2 - 0.05], [R * 0.985, w / 2 - 0.022], [R * 0.9, w / 2], [R * 0.6, w / 2]].map(p => new THREE.Vector2(p[0], p[1]));
    const tyre = new THREE.LatheGeometry(pr, 28).rotateZ(Math.PI / 2);
    const barrel = new THREE.CylinderGeometry(R * 0.62, R * 0.62, w * 0.96, 28, 1, true).rotateZ(Math.PI / 2);
    const lip = new THREE.TorusGeometry(R * 0.615, 0.014, 6, 28).rotateY(Math.PI / 2);
    const spoke = new THREE.BoxGeometry(0.03, R * 0.6, 0.066).translate(0, R * 0.3, 0);
    const hub = new THREE.CylinderGeometry(R * 0.17, R * 0.2, 0.05, 14).rotateZ(Math.PI / 2);
    const disc = new THREE.CylinderGeometry(R * 0.52, R * 0.52, 0.03, 22).rotateZ(Math.PI / 2);
    return { tyre, barrel, lip, spoke, hub, disc, w };
  }
  const wheelCache = {};
  function makeCar(paint, stripe, isPlayer, styleName) {
    const style = styleName || (isPlayer ? 'saloon' : 'hatch'), st = CAR_STYLES[style], M = sharedMats();
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    const paintC = lin(paint), stripeC = stripe ? lin(stripe) : null;
    const { g: shell, S, C, s0, s1 } = shellGeo(style, st, paintC, stripeC);
    const mPaint = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.36, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.95 });
    done.add(mPaint);
    const sm = new THREE.Mesh(shell, [mPaint, M.glass, M.trim, M.under]); sm.castShadow = true; body.add(sm);
    const add = (geo, m, x, y, z, cast = false) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; body.add(o); return o; };
    const box = (w, h, d, m, x, y, z) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
    const at = s => { let b = S[0]; for (const o of S) if (Math.abs(o.s - s) < Math.abs(b.s - s)) b = o; return b; };
    const W_ = st.W, hl = Math.max(-s0, s1);
    // floor pan and wheel-arch liners hide the hollow shell
    box(W_ - 0.36, 0.34, s1 - s0 - 0.5, M.under, 0, 0.45, -(s0 + s1) / 2);
    // lights: emissive lenses under clear covers
    const headM = new THREE.MeshStandardMaterial({ color: lin(0xfff4d6), emissive: lin(0xffe9b0), emissiveIntensity: 1.6, roughness: 0.2 });
    const tailM = new THREE.MeshStandardMaterial({ color: lin(0x8a0a0a), emissive: lin(0xff1408), emissiveIntensity: 0.7, roughness: 0.25 });
    done.add(headM); done.add(tailM);
    const fo = S[S.length - 1], ro = S[0], zf = -s1, zr = -s0;
    for (const sx of [-1, 1]) {
      box(0.36, 0.125, 0.07, headM, sx * (fo.wb - 0.25), fo.yb - 0.115, zf - 0.008);
      box(0.09, 0.115, 0.1, M.ind, sx * (fo.wb - 0.035), fo.yb - 0.12, zf + 0.01);
      box(0.4, 0.15, 0.07, tailM, sx * (ro.wb - 0.25), ro.yb - 0.135, zr + 0.008);
      box(0.09, 0.14, 0.1, M.ind, sx * (ro.wb - 0.035), ro.yb - 0.135, zr - 0.012);
      // mirrors
      const ms = C.ramps[1][1] - 0.1, mo = at(ms);
      box(0.17, 0.1, 0.09, M.trim, sx * (mo.wb + 0.04), mo.yb + 0.07, -ms);
      // door seams and handles follow the body surface
      for (const ds of C.doors) {
        const o = at(ds), pts = [];
        for (let k = 2; k <= 7; k++) pts.push(new THREE.Vector3(sx * (o.ring[k][0] + 0.004), o.ring[k][1], -ds + (o.ring[k][1] - o.y0) * 0.03));
        const sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.006, 4, false);
        body.add(new THREE.Mesh(sg, M.seam));
      }
      for (let d = 0; d < C.doors.length - 1; d++) { const hs = C.doors[d + 1] + 0.16, o = at(hs); box(0.02, 0.03, 0.15, M.trim, sx * (o.wb + 0.004), o.yb - 0.13, -hs); }
    }
    box(2 * (fo.wb - 0.44), 0.1, 0.05, M.under, 0, fo.yb - 0.115, zf - 0.004);            // grille
    box(2 * (fo.wb - 0.44), 0.014, 0.06, M.chrome, 0, fo.yb - 0.058, zf - 0.006);
    box(2 * (ro.wb - 0.46), 0.13, 0.05, M.trim, 0, ro.yb - 0.135, zr + 0.004);            // panel between the tail lights
    box(2 * fo.wb + 0.05, 0.17, 0.22, M.trim, 0, fo.y0 + 0.15, zf + 0.05);                // bumpers
    box(2 * ro.wb + 0.05, 0.17, 0.22, M.trim, 0, ro.y0 + 0.15, zr - 0.05);
    box(2 * fo.wb - 0.5, 0.07, 0.05, M.under, 0, fo.y0 + 0.02, zf + 0.02);                // air intake
    // plates
    const pn = (isPlayer ? '1996 GS 44' : (4100 + (plateNo++) * 37) + ' RB 44');
    const pf = add(new THREE.PlaneGeometry(0.5, 0.115), new THREE.MeshStandardMaterial({ map: plateTexture(pn, false), roughness: 0.5 }), 0, fo.y0 + 0.15, zf - 0.066); pf.rotation.y = Math.PI;
    const pb = add(new THREE.PlaneGeometry(0.5, 0.115), new THREE.MeshStandardMaterial({ map: plateTexture(pn, true), roughness: 0.5 }), 0, ro.y0 + 0.15, zr + 0.066);
    linMat(pf.material); linMat(pb.material);
    // exhaust, aerial, spoiler
    add(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 10).rotateX(Math.PI / 2), M.chrome, W_ / 2 - 0.36, 0.24, zr + 0.08);
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.75, 4), M.under, -W_ / 2 + 0.24, 1.38, -(s0 + 0.75));
    if (st.spoiler) { const o = at(C.ramps[0][1] - 0.05); const sp = new THREE.Mesh(new THREE.BoxGeometry(o.wb * 1.5, 0.035, 0.26), mPaint); sp.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(72).map((_, i) => [paintC.r, paintC.g, paintC.b][i % 3]), 3)); sp.position.set(0, o.yb + o.hc + 0.05, -(C.ramps[0][1] - 0.2)); body.add(sp); }
    // twin machine guns on the bonnet
    const go = at(C.ramps[1][1] + 0.5);
    for (const sx of [-0.4, 0.4]) {
      box(0.15, 0.11, 0.44, M.gun, sx, go.yb + 0.085, -(go.s));
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 10).rotateX(Math.PI / 2), M.gun, sx, go.yb + 0.1, -(go.s + 0.55), true);
      add(new THREE.CylinderGeometry(0.042, 0.042, 0.1, 10).rotateX(Math.PI / 2), M.gun, sx, go.yb + 0.1, -(go.s + 0.92));
    }
    // wheels
    const WG = wheelCache[st.wr] || (wheelCache[st.wr] = wheelGeos(st.wr));
    const wheels = [], steer = [], rimM = isPlayer ? M.gold : M.alloy;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * (W_ / 2 - 0.13), st.wr, sz * st.wb); g.add(pivot);
      const spin = new THREE.Group(); pivot.add(spin);
      const ty = new THREE.Mesh(WG.tyre, M.rubber); ty.castShadow = true; spin.add(ty);
      const br = new THREE.Mesh(WG.barrel, M.disc); br.material.side = THREE.DoubleSide; spin.add(br);
      const dc = new THREE.Mesh(WG.disc, M.disc); dc.position.x = sx * 0.02; spin.add(dc);
      const face = sx * (WG.w / 2 - 0.02);
      const lp = new THREE.Mesh(WG.lip, rimM); lp.position.x = face; spin.add(lp);
      const hb = new THREE.Mesh(WG.hub, rimM); hb.position.x = face; spin.add(hb);
      for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(WG.spoke, rimM); sp.position.x = face; sp.rotation.x = k * Math.PI * 2 / 5; spin.add(sp); }
      wheels.push(spin); if (sz < 0) steer.push(pivot);
    }
    if (isPlayer) {
      const spot = new THREE.SpotLight(0xffe9c0, 0, 95, 0.52, 0.6, 1.1);
      spot.color.convertSRGBToLinear(); spot.position.set(0, 0.85, -hl); spot.target.position.set(0, -0.6, -24);
      g.add(spot, spot.target); g.userData.spot = spot;
    }
    const noop = { emissive: { setHex() { } } };
    Object.assign(g.userData, { wheels, steer, mBody: mPaint, mPaint: { color: { setHex() { } } }, base: 0xffffff, paint, tail: noop, head: noop,
      tailM, headM, bodyG: body, wb: st.wb, hw: W_ / 2 - 0.13, hl, hdLinear: true });
    g.traverse(o => { o.userData.hdLinear = true; });
    scene.add(g);
    return g;
  }

  function world() { buildLamps(); linearize(scene); }
  // drop one quality level when the machine cannot hold ~25 images per second
  let pfN = 0, pfT = 0, pfLast = 0;
  function perf(now) {
    if (!pfLast) { pfLast = now; return; }
    const d = now - pfLast; pfLast = now; if (d > 500) return; // tab was hidden
    pfN++; pfT += d;
    if (pfT > 5000) { const fps = pfN * 1000 / pfT; pfN = 0; pfT = 0; if (fps < 25 && qi > 0 && started && !paused) { setQuality(qi - 1); feed('Qualité graphique réduite : ' + q.name); const b = document.querySelectorAll('#hdSeg button'); b.forEach(x => x.classList.toggle('on', +x.dataset.q === qi)); } }
  }
  addEventListener('resize', resize);
  return { QUAL, setQuality, perf, get quality() { return qi; }, render, frame, setTime, world, linearize, makeCar, fx, explode: explodeAt, muzzle, roadMat, waterMat, crownGeo, wallMat, groundMat, footMat, roofMat, GROUND_STYLES, shake, lin, linHex, get floatRT() { return floatRT; } };
})();
// <<< HD MODULE
