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
    if (window.__trHold) dt = 0;
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

