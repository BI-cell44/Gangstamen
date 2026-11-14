  // ---------- sky dome, lighting and reflections ----------
  const skyU = {
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, zen: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, low: { value: new THREE.Color() },
    sunCol: { value: new THREE.Color() }, cloudLit: { value: new THREE.Color() }, cloudDark: { value: new THREE.Color() },
    night: { value: 0 }, time: { value: 0 }, disc: { value: 40 }, cover: { value: 0 },
  };
  const SKY_FRAG = `
    uniform vec3 sunDir, zen, hor, low, sunCol, cloudLit, cloudDark; uniform float night, time, disc, cover; varying vec3 vDir;
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
      float cov = smoothstep(0.5 - cover * 0.5, 0.82 - cover * 0.32, n) * smoothstep(0.0, 0.16, d.y);
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
