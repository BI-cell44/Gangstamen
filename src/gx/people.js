  // =====================================================================================
  // Animated people: rigged low-poly characters and motion clips (downloaded pack, see DATA-LICENSES.md), baked by
  // tools/assets/bake_people.js into W.people. Each pedestrian of the street gets one skinned mesh and its own bones;
  // the clips are sampled here (no AnimationMixer): rotation of each bone relative to its parent, and the height of the hips.
  // Without W.people the crowd falls back on the instanced figures of crowd.js (terrace customers still use them).
  // =====================================================================================
  const People = (() => {
    const D = W.people, on = !!(D && ULTRA), mats = [], geos = {}, clips = {}, all = [];
    const bin = (s, T) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
    const SPEED = { walk: 1.35, slow: 0.8, phone: 1.1, run: 4.2 }; // metres per second the clip was made for
    let last = 0, qa = null, qb = null;
    function init() {
      if (!on || mats.length) return;
      qa = new THREE.Quaternion(); qb = new THREE.Quaternion();
      for (const src of D.pal) {
        const img = new Image(), t = new THREE.Texture(img); t.flipY = false; t.encoding = THREE.sRGBEncoding; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.userData = { hdLinear: true };
        img.onload = () => { t.needsUpdate = true; }; img.src = 'data:image/png;base64,' + src;
        const m = new THREE.MeshStandardMaterial({ map: t, skinning: true, roughness: 0.85, metalness: 0, flatShading: true, envMapIntensity: 0.35 }); m.userData.shared = true; m.userData.hdLinear = true; mats.push(m);
      }
      for (const [n, c] of Object.entries(D.clips)) clips[n] = { fps: c.fps, f: c.f, q: bin(c.q, Int16Array), y: c.y, hip: c.hip, nb: c.bones.length, ix: Object.fromEntries(c.bones.map((b, i) => [b, i])) };
    }
    function geoOf(name) {
      if (geos[name]) return geos[name];
      const c = D.chars[name], g = new THREE.BufferGeometry(), pq = bin(c.p, Int16Array), uq = bin(c.uv, Uint16Array), si = bin(c.si, Uint8Array), sw = bin(c.sw, Uint8Array);
      const pos = new Float32Array(pq.length), uv = new Float32Array(uq.length), w = new Float32Array(sw.length);
      for (let i = 0; i < pq.length; i++) pos[i] = pq[i] * 2.2 / 32767; for (let i = 0; i < uq.length; i++) uv[i] = uq[i] / 65535; for (let i = 0; i < sw.length; i++) w[i] = sw[i] / 255;
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(si), 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
      g.setIndex(new THREE.BufferAttribute(bin(c.i, Uint16Array), 1)); g.computeVertexNormals(); g.computeBoundingSphere(); g.boundingSphere.radius *= 1.6; g.userData.shared = true;
      return geos[name] = g;
    }
    function pick(p) {
      const r = R();
      if (p.kid) return 'little_boy_B';
      if (p.old && p.woman) return 'elder_Female_A';
      if (p.woman) return r < 0.5 ? 'casual_Female_G' : 'casual_Female_K';
      return r < 0.07 ? 'tradesperson_man' : r < 0.14 ? 'worker_Male_constructor_B' : r < 0.57 ? 'casual_Male_G' : 'casual_Male_K';
    }
    function make(p) {
      const name = pick(p), c = D.chars[name], mesh = new THREE.SkinnedMesh(geoOf(name), mats[(R() * mats.length) | 0]), bones = [], m4 = new THREE.Matrix4();
      c.bones.forEach((b, i) => { const o = new THREE.Bone(); o.name = b.n; m4.fromArray(b.m); m4.decompose(o.position, o.quaternion, o.scale); bones.push(o); if (b.p < 0) mesh.add(o); else bones[b.p].add(o); });
      mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
      mesh.castShadow = true; mesh.userData.hdLinear = true; mesh.userData.shared = true; mesh.visible = false; scene.add(mesh);
      const root = c.bones.findIndex(b => b.p < 0);
      const o = { mesh, bones, c, sex: c.sex, root, rootY: bones[root].position.y, k: 1.72 / c.h, clip: '', t: R() * 3, fade: 0, from: bones.map(() => new THREE.Quaternion()), phone: !p.kid && R() < 0.1, far: 0 };
      all.push(o); return o;
    }
    function pose(o, name, t) {
      const cl = clips[name], fr = (t * cl.fps) % cl.f, i0 = Math.floor(fr), i1 = (i0 + 1) % cl.f, a = fr - i0, K = 1 / 32767, fade = o.fade > 0 ? 1 - o.fade / 0.22 : 1;
      for (let b = 0; b < o.bones.length; b++) {
        const ci = cl.ix[o.bones[b].name]; if (ci === undefined) continue;
        const p0 = (i0 * cl.nb + ci) * 4, p1 = (i1 * cl.nb + ci) * 4, q = cl.q;
        qa.set(q[p0] * K, q[p0 + 1] * K, q[p0 + 2] * K, q[p0 + 3] * K); qb.set(q[p1] * K, q[p1 + 1] * K, q[p1 + 2] * K, q[p1 + 3] * K); qa.slerp(qb, a);
        if (fade < 1) qa.copy(qb.copy(o.from[b]).slerp(qa, fade));
        o.bones[b].quaternion.copy(qa);
      }
      o.bones[o.root].position.y = o.rootY * (cl.y[i0] + (cl.y[i1] - cl.y[i0]) * a) / cl.hip;
    }
    function begin() { const n = performance.now() / 1000; People.dt = Math.min(0.1, Math.max(0, n - last)); last = n; }
    function draw(p) { // one pedestrian of crowd.js, as it stands after pedStep
      let o = p._sk;
      if (!p.on) { if (o) o.mesh.visible = false; return; }
      if (!o) { init(); o = p._sk = make(p); }
      const m = o.mesh, dt = People.dt || 0, run = p.state === 'flee' || p.state === 'panic', down = p.state === 'down';
      let kind = run ? 'run' : p.state === 'idle' || p.state === 'wait' || down ? (o.phone && o.sex === 'm' ? 'talk' : 'idle') : p.old ? 'slow' : o.phone ? 'phone' : 'walk';
      const name = o.sex + '_' + kind, sp = run ? (p.state === 'panic' ? p.run || 4.5 : 5.5) : p.speed;
      if (name !== o.clip) { if (o.clip) { for (let b = 0; b < o.bones.length; b++) o.from[b].copy(o.bones[b].quaternion); o.fade = 0.22; } o.clip = name; }
      if (!down) o.t += dt * (SPEED[kind] ? Math.max(0.5, Math.min(1.6, sp / SPEED[kind])) : 1);
      o.fade = Math.max(0, o.fade - dt);
      m.visible = true; m.position.set(p.x, p.y - 0.36 + (down ? 0.22 : 0), p.z); m.rotation.set(down ? -Math.PI / 2 : 0, p.h, 0, 'YXZ'); m.scale.setScalar(p.s * o.k);
      pose(o, name, o.t);
    }
    function hideAll() { for (const o of all) o.mesh.visible = false; }
    return { on, draw, begin, hideAll, all, clips, dt: 0, _pose: pose };
  })();
