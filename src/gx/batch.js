  // ---------- batching: many identical small objects drawn as instances, per 250 m tile ----------
  // Batch.add(group): the group stays out of the scene, each of its meshes becomes one instance of an InstancedMesh
  // (one per geometry shape, material and tile, so the tiles out of view are skipped, in the shadow pass too).
  // Batch.hide(group) puts the real group back in the scene (to animate it: furniture knocked over) and hides its
  // instances; Batch.show(group) does the reverse. Batch.build() once everything is added.
  const Batch = (() => {
    const TILE = 250, entries = new Map(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
    const gkey = g => g.type + ':' + JSON.stringify(g.parameters || {});
    function add(group) {
      group.updateMatrixWorld(true);
      const refs = [], tile = Math.floor(group.position.x / TILE) + ',' + Math.floor(group.position.z / TILE);
      group.traverse(o => {
        if (!o.isMesh || Array.isArray(o.material)) return;
        const k = gkey(o.geometry) + '|' + o.material.uuid + '|' + tile + '|' + (o.castShadow ? 1 : 0);
        let e = entries.get(k); if (!e) entries.set(k, e = { geo: o.geometry, mat: o.material, cast: o.castShadow, m: [], im: null });
        refs.push([e, e.m.length]); e.m.push(o.matrixWorld.clone());
      });
      group.userData.batch = refs;
    }
    function build() {
      const gb = new THREE.Box3();
      for (const e of entries.values()) {
        if (e.im) continue;
        const geo = e.geo.clone(), im = new THREE.InstancedMesh(geo, e.mat, e.m.length);
        e.m.forEach((m, i) => im.setMatrixAt(i, m));
        geo.computeBoundingBox(); const box = new THREE.Box3(); for (const m of e.m) box.union(gb.copy(e.geo.boundingBox || (e.geo.computeBoundingBox(), e.geo.boundingBox)).applyMatrix4(m));
        geo.boundingBox = box; geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); // r128 culls instanced meshes on the geometry bounds: make them cover every instance
        im.frustumCulled = true; // r128 InstancedMesh turns culling off by default (it has no instance bounds); ours are set just above
        im.castShadow = e.cast; im.receiveShadow = true; im.userData.hdLinear = true; scene.add(im); e.im = im;
      }
    }
    function set(group, hidden) {
      const refs = group.userData.batch; if (!refs) return false;
      for (const [e, i] of refs) { if (!e.im) continue; e.im.setMatrixAt(i, hidden ? Z : e.m[i]); e.im.instanceMatrix.needsUpdate = true; }
      return true;
    }
    return {
      add, build,
      hide(group) { if (set(group, true) && !group.parent) scene.add(group); },
      show(group) { if (set(group, false)) scene.remove(group); },
      get count() { let n = 0; for (const e of entries.values()) if (e.im) n++; return n; },
    };
  })();
