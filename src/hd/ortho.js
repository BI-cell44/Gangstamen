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
    return wetPatch(m, true);
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
    return wetPatch(m, false);
  }
  function footMat() {
    const sl = slabTextures(512, 128, true);
    return wetPatch(new THREE.MeshStandardMaterial({ map: sl.map, vertexColors: true, roughness: 0.9, metalness: 0, normalMap: sl.normal, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.4 }), true);
  }
