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
    bloom: { value: 0.5 }, exposure: { value: 1 }, time: { value: 0 }, dep: { value: null }, dof: { value: 0 }, cn: { value: 0.5 }, cf: { value: 2200 }, asp: { value: 1.78 }, tint: { value: new THREE.Vector3(1, 1, 1) }, levels: { value: 5 }, ldr: { value: floatRT ? 0 : 1 },
  }, `
    uniform sampler2D t, b0, b1, b2, b3, b4, dep; uniform float bloom, exposure, time, levels, ldr, dof, cn, cf, asp; uniform vec3 tint; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * cn * cf / (cf + cn - z * (cf - cn)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 cc = vUv - 0.5; float r2 = dot(cc, cc);
      vec2 ca = cc * r2 * 0.003; // slight lens fringing towards the corners
      vec3 c = vec3(texture2D(t, vUv + ca).r, texture2D(t, vUv).g, texture2D(t, vUv - ca).b);
      if (dof > 0.0) { // photo mode depth of field: sharp at the distance of what is in the centre, blurred before and behind
        float z = lin(texture2D(dep, vUv).r), f = lin(texture2D(dep, vec2(0.5)).r);
        float coc = clamp(abs(z - f) / max(f, 2.0), 0.0, 1.0) * dof * 0.014;
        if (coc > 0.0006) { vec3 acc = c; for (int i = 0; i < 16; i++) { float a = float(i) * 2.39996, r = sqrt((float(i) + 0.5) / 16.0); acc += texture2D(t, vUv + vec2(cos(a) / asp, sin(a)) * r * coc).rgb; } c = acc / 17.0; }
      }
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
    qi = Math.max(0, Math.min(QUAL.length - 1, i | 0)); q = safe ? Object.assign({}, QUAL[qi], { msaa: 0 }) : QUAL[qi];
    sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    resize();
  }

