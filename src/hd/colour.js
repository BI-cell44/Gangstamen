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

