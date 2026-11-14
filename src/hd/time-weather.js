  // ---------- time of day and weather ----------
  // Four lighting keyframes (afternoon, golden hour, blue hour, night) blended continuously, then greyed and
  // darkened by the rain. 'Cycle' runs the clock; the reflection probe is refreshed when the light has moved enough.
  const C3 = (r, g, b) => new THREE.Color(r, g, b), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const KEYS = [
    { sun: V3(-120, 190, 60), zen: C3(0.06, 0.17, 0.52), hor: C3(0.62, 0.72, 0.86), low: C3(0.5, 0.5, 0.53), sunCol: C3(1.5, 1.35, 1.1), cLit: C3(1.6, 1.6, 1.66), cDark: C3(0.45, 0.5, 0.6),
      sCol: C3(1, 0.93, 0.82), sI: 2.6, hCol: C3(0.55, 0.65, 0.86), hGr: C3(0.4, 0.36, 0.3), hI: 0.62, fog: C3(0.62, 0.68, 0.8), fN: 200, fF: 1000,
      exp: 0.86, bloom: 0.45, tint: V3(1, 1, 1), th: 2.0, part: C3(1, 0.97, 0.92), night: 0, lamps: 0, disc: 40, win: 0 },
    { sun: V3(-150, 100, 85), zen: C3(0.1, 0.19, 0.5), hor: C3(1.25, 0.62, 0.3), low: C3(0.75, 0.42, 0.3), sunCol: C3(1.6, 0.95, 0.5), cLit: C3(1.7, 1.0, 0.72), cDark: C3(0.36, 0.26, 0.38),
      sCol: C3(1.0, 0.74, 0.5), sI: 2.2, hCol: C3(0.62, 0.68, 0.86), hGr: C3(0.42, 0.34, 0.28), hI: 0.5, fog: C3(0.85, 0.5, 0.36), fN: 160, fF: 900,
      exp: 0.92, bloom: 0.6, tint: V3(1.03, 1.0, 0.96), th: 1.6, part: C3(1.0, 0.82, 0.68), night: 0, lamps: 0, disc: 40, win: 0 },
    { sun: V3(-160, 30, 95), zen: C3(0.025, 0.045, 0.15), hor: C3(0.5, 0.22, 0.2), low: C3(0.16, 0.11, 0.14), sunCol: C3(1.2, 0.45, 0.25), cLit: C3(0.6, 0.3, 0.32), cDark: C3(0.07, 0.06, 0.11),
      sCol: C3(0.9, 0.45, 0.35), sI: 0.75, hCol: C3(0.35, 0.38, 0.62), hGr: C3(0.15, 0.12, 0.12), hI: 0.42, fog: C3(0.2, 0.13, 0.17), fN: 110, fF: 720,
      exp: 1.12, bloom: 0.82, tint: V3(1, 0.98, 1.05), th: 1.1, part: C3(0.5, 0.42, 0.48), night: 0.55, lamps: 1, disc: 20, win: 1.6 },
    { sun: V3(-90, 120, 110), zen: C3(0.004, 0.006, 0.02), hor: C3(0.03, 0.028, 0.06), low: C3(0.02, 0.018, 0.035), sunCol: C3(0.55, 0.65, 0.9), cLit: C3(0.07, 0.075, 0.12), cDark: C3(0.012, 0.012, 0.025),
      sCol: C3(0.5, 0.62, 1.0), sI: 0.32, hCol: C3(0.3, 0.36, 0.6), hGr: C3(0.1, 0.08, 0.07), hI: 0.36, fog: C3(0.03, 0.028, 0.06), fN: 60, fF: 520,
      exp: 1.25, bloom: 0.95, tint: V3(0.96, 1.0, 1.1), th: 0.85, part: C3(0.16, 0.17, 0.24), night: 1, lamps: 1, disc: 6, win: 2.4 },
  ];
  const TOD = { day: 0, sunset: 1, dusk: 2, night: 3 };
  const amb = { dist: 1, t: 1, target: 1, cycle: false, clock: 0.1, rain: 0, rainTarget: 0, wet: 0, auto: false, autoT: 90, bolt: 0, boltT: 14, envAt: -99, envT: -1, envR: -1 };
  const A = {}; for (const k in KEYS[0]) A[k] = KEYS[0][k].clone ? KEYS[0][k].clone() : KEYS[0][k];
  const wetU = { value: 0 };
  const grey = new THREE.Color();
  function blendKeys(t) {
    const i = Math.min(2, Math.floor(t)), f = t - i, a = KEYS[i], b = KEYS[i + 1];
    for (const k in a) {
      if (typeof a[k] === 'number') A[k] = a[k] + (b[k] - a[k]) * f;
      else if (a[k].isColor) A[k].copy(a[k]).lerp(b[k], f);
      else A[k].copy(a[k]).lerp(b[k], f);
    }
  }
  // Cycle: a 12-minute day, afternoon -> golden hour -> blue hour -> night -> dawn
  function cycleT(c) {
    const P = [[0, 0], [0.32, 0], [0.45, 1], [0.53, 2], [0.6, 3], [0.88, 3], [0.94, 2], [0.97, 1], [1, 0]];
    for (let i = 1; i < P.length; i++) if (c <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], k = (c - x0) / (x1 - x0); return y0 + (y1 - y0) * k * k * (3 - 2 * k); }
    return 0;
  }
  function applyAmbience(force) {
    blendKeys(amb.t);
    const r = amb.rain, ov = r * 0.85;
    const toGrey = (c, lvl) => { const l = (c.r * 0.3 + c.g * 0.55 + c.b * 0.15); grey.setRGB(l * 0.95, l, l * 1.08).multiplyScalar(lvl); c.lerp(grey, ov); };
    for (const k of ['zen', 'hor', 'low', 'cLit', 'cDark', 'fog']) toGrey(A[k], k === 'cLit' ? 0.55 : 0.7);
    A.sunCol.multiplyScalar(1 - ov * 0.85); A.sCol.lerp(grey.setRGB(0.8, 0.85, 0.95), ov);
    skyU.sunDir.value.copy(A.sun).normalize(); SUN_OFF.copy(A.sun);
    skyU.zen.value.copy(A.zen); skyU.hor.value.copy(A.hor); skyU.low.value.copy(A.low); skyU.sunCol.value.copy(A.sunCol);
    skyU.cloudLit.value.copy(A.cLit); skyU.cloudDark.value.copy(A.cDark); skyU.night.value = A.night; skyU.cover.value = r;
    skyU.disc.value = A.disc * (1 - ov);
    sun.color.copy(A.sCol); sun.intensity = A.sI * (1 - ov * 0.8);
    hemi.color.copy(A.hCol).lerp(grey.setRGB(0.5, 0.55, 0.62), ov * 0.6); hemi.groundColor.copy(A.hGr); hemi.intensity = A.hI * (1 + ov * 0.25);
    fogU.color.value.copy(A.fog); fogU.near.value = A.fN * (1 - r * 0.7) * amb.dist; fogU.far.value = A.fF * (1 - r * 0.45) * amb.dist;
    if (!scene.fog) scene.fog = new THREE.Fog(0, 100, 700);
    scene.fog.color.copy(A.fog); scene.fog.near = fogU.near.value; scene.fog.far = fogU.far.value;
    const fu = finalMat.uniforms; fu.exposure.value = A.exp * (1 + r * 0.12); fu.bloom.value = A.bloom; fu.tint.value.copy(A.tint).lerp(V3(0.97, 1.0, 1.04), ov); brightMat.uniforms.th.value = A.th;
    partLight.copy(A.part).multiplyScalar(1 - ov * 0.35);
    isNight = A.night > 0.4 || (A.night > 0.1 && r > 0.4);
    wallMats.forEach(m => { m.emissiveIntensity = A.win; });
    if (clockMat) clockMat.emissiveIntensity = A.night > 0.3 ? 1.5 : 0;
    photoMats.forEach(m => { m.emissive.setScalar(0.12 - 0.085 * A.night); });
    const lp = A.lamps * (1 + r * 0.2);
    if (lampGlow) { lampGlow.visible = lp > 0.02; lampPools.visible = lp > 0.02; lampPools.material.opacity = Math.min(1, lp); lampGlow.material.opacity = Math.min(1, lp); lampBulbs.material.color.setRGB(0.25 + 13.75 * lp, 0.25 + 7.75 * lp, 0.25 + 2.75 * lp); }
    if (lampStreaks) { lampStreaks.visible = lp > 0.02 && amb.wet > 0.05; lampStreaks.material.opacity = lp * amb.wet; }
    const w = amb.wet; wetU.value = w;
    if (roadMatRef) { roadMatRef.roughness = 0.82 - A.night * 0.32; roadMatRef.envMapIntensity = 0.55 + w * 0.9; }
    if (waterMatRef) { waterMatRef.roughness = 0.09 + r * 0.22; waterMatRef.normalScale.setScalar(0.5 + r * 0.7); }
    rainLines.visible = r > 0.01; rainU.uRain.value = r; rainU.uLight.value.copy(partLight).multiplyScalar(0.6).addScalar(0.18 * A.lamps);
    // refresh the reflection probe when the light has changed enough
    if (force || Math.abs(amb.t - amb.envT) > 0.08 || Math.abs(r - amb.envR) > 0.1) {
      if (force || time - amb.envAt > 1.2) {
        amb.envAt = time; amb.envT = amb.t; amb.envR = r;
        const d = skyU.disc.value; skyU.disc.value = Math.min(6, d);
        const old = envRT; envRT = pmrem.fromScene(envScene, 0, 1, 500); scene.environment = envRT.texture; if (old) old.dispose();
        skyU.disc.value = d;
      }
    }
  }
  function setTime(on) { // the classic API: night on/off
    setTod(on ? 'night' : 'sunset');
  }
  function setTod(v) {
    if (v === 'cycle') { amb.cycle = true; amb.clock = [0.1, 0.42, 0.53, 0.7][Math.round(amb.target)] || 0.1; return; }
    amb.cycle = false; amb.target = typeof v === 'number' ? v : TOD[v] ?? 1;
    if (!amb.started) amb.t = amb.target;
    applyAmbience(!amb.started); amb.started = true;
  }
  function setDistance(k) { amb.dist = Math.max(0.3, Math.min(1, k)); applyAmbience(false); }
  function setRain(v) { // 0..1, or 'auto' for weather that comes and goes
    amb.auto = v === 'auto'; if (amb.auto) { amb.autoT = 30 + Math.random() * 60; return; }
    amb.rainTarget = Math.max(0, Math.min(1, +v || 0));
  }
  function ambienceTick(dt) {
    if (amb.cycle) { amb.clock = (amb.clock + dt / 720) % 1; amb.target = cycleT(amb.clock); }
    const dT = amb.target - amb.t; amb.t += Math.sign(dT) * Math.min(Math.abs(dT), dt * (amb.cycle ? 1 : 0.6));
    if (amb.auto) { amb.autoT -= dt; if (amb.autoT <= 0) { amb.rainTarget = amb.rainTarget > 0.3 ? 0 : 0.55 + Math.random() * 0.45; amb.autoT = 70 + Math.random() * 150; } }
    const dr = amb.rainTarget - amb.rain; amb.rain += Math.sign(dr) * Math.min(Math.abs(dr), dt / 12);
    amb.wet += ((amb.rain > 0.15 ? 1 : 0) - amb.wet) * Math.min(1, dt / (amb.rain > 0.15 ? 18 : 70));
    // lightning in heavy rain
    if (amb.rain > 0.7) {
      amb.boltT -= dt;
      if (amb.boltT <= 0) { amb.bolt = 0.45; amb.boltT = 9 + Math.random() * 22; const dly = 0.6 + Math.random() * 2.5; setTimeout(() => sfx.thunder && sfx.thunder(), dly * 1000); }
    }
    applyAmbience(false);
    if (amb.bolt > 0) { amb.bolt -= dt; const f = (amb.bolt > 0.3 || (amb.bolt > 0.12 && amb.bolt < 0.2)) ? 1 : 0; hemi.intensity += f * 3.5; skyU.zen.value.addScalar(f * 0.5); skyU.cloudLit.value.addScalar(f * 1.2); }
    sfx.rain && sfx.rain(amb.rain);
  }
  // rain: streaks that wrap around the camera, splashes, spray behind the wheels
  const RN = 7000, rainU = { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uRain: { value: 0 }, uTilt: { value: new THREE.Vector3() }, uLight: { value: new THREE.Color(1, 1, 1) } };
  const rainLines = (() => {
    const pos = new Float32Array(RN * 6), dat = new Float32Array(RN * 4);
    for (let i = 0; i < RN; i++) {
      const x = Math.random() * 70, y = Math.random() * 36, z = Math.random() * 70, r = Math.random();
      pos.set([x, y, z, x, y, z], i * 6); dat.set([0, r, 1, r], i * 4);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aDat', new THREE.BufferAttribute(dat, 2));
    const m = new THREE.ShaderMaterial({ uniforms: rainU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        uniform vec3 uCam, uTilt; uniform float uTime, uRain; attribute vec2 aDat; varying float vA;
        void main(){
          const vec3 B = vec3(70.0, 36.0, 70.0);
          vec3 w = position + vec3(uTilt.x * 0.4, -24.0 - aDat.y * 6.0, uTilt.z * 0.4) * uTime;
          w = uCam + mod(w - uCam + B * 0.5, B) - B * 0.5;
          w.y = uCam.y + mod(w.y - uCam.y + 8.0, B.y) - 8.0;
          w -= vec3(-uTilt.x, 24.0, -uTilt.z) * 0.032 * aDat.x;
          vA = step(aDat.y, uRain) * (1.0 - smoothstep(12.0, 34.0, distance(w, uCam))) * (0.5 + aDat.x * 0.5);
          vec4 mv = modelViewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `
        #include <common>
        #include <logdepthbuf_pars_fragment>
        uniform vec3 uLight; varying float vA;
        void main(){
          #include <logdepthbuf_fragment>
          if (vA < 0.01) discard;
          gl_FragColor = vec4(uLight * vA * 0.32, 1.0);
        }`,
    });
    const l = new THREE.LineSegments(g, m); l.frustumCulled = false; l.renderOrder = 23; l.visible = false; l.userData.hdLinear = true; scene.add(l);
    return l;
  })();
  let lampStreaks = null; // long reflections of the lamps on the wet road
  // wet surfaces: darker, glossier, with puddles in the hollows (patched into the standard materials)
  function wetPatch(m, horizontalOnly) {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      sh.uniforms.uWet = wetU;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWetW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWetW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uWet; varying vec3 vWetW;
        float wHash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float wNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
        .replace('#include <lights_physical_fragment>', `
        if (uWet > 0.001) {
          float wup = clamp(dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)), 0.0, 1.0);
          float pn = wNoise(vWetW.xz * 0.16) * 0.65 + wNoise(vWetW.xz * 0.61 + 7.0) * 0.35;
          float puddle = smoothstep(0.56, 0.7, pn) * smoothstep(0.9, 0.99, wup) * uWet;
          float wk = uWet * ${horizontalOnly ? 'smoothstep(0.5, 0.9, wup)' : 'mix(0.55, 1.0, wup)'};
          diffuseColor.rgb *= mix(1.0, 0.58, wk) * (1.0 - puddle * 0.35);
          roughnessFactor = mix(roughnessFactor, 0.32, wk); roughnessFactor = mix(roughnessFactor, 0.05, puddle);
          normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), puddle));
        }
        #include <lights_physical_fragment>`);
    };
    const key = 'wet' + (horizontalOnly ? 1 : 0) + ':' + (prev ? prev.toString() : m.type + m.uuid);
    m.customProgramCacheKey = () => key;
    m.needsUpdate = true;
    return m;
  }
