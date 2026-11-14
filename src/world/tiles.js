// ---------- world tiles: the big merged meshes (terrain, roads, walls, roofs, trees) cut into square tiles ----------
// Merged across the whole map, a mesh is drawn every frame even when most of it is behind the camera. Cut into tiles,
// three.js skips the tiles out of view, in the shadow pass too. Only meshes over MIN triangles are cut (each tile costs
// a draw call), and nothing that other code holds on to: this runs once, after the world is built.
const Tiles = (() => {
  const SIZE = 300, MIN = 20000, info = { split: 0, tiles: 0, inst: 0 };
  const tileOf = (x, z) => Math.floor(x / SIZE) * 1000 + Math.floor(z / SIZE);
  function splitMesh(m) {
    const g = m.geometry, pos = g.attributes.position, idx = g.index ? g.index.array : null, nT = (idx ? idx.length : pos.count) / 3;
    m.updateMatrixWorld(true); const mw = m.matrixWorld, v = new THREE.Vector3();
    const byTile = new Map();
    for (let t = 0; t < nT; t++) {
      const a = idx ? idx[3 * t] : 3 * t, b = idx ? idx[3 * t + 1] : 3 * t + 1, c = idx ? idx[3 * t + 2] : 3 * t + 2;
      v.set((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3, (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3).applyMatrix4(mw);
      const k = tileOf(v.x, v.z); let l = byTile.get(k); if (!l) byTile.set(k, l = []); l.push(a, b, c);
    }
    if (byTile.size < 2) return false;
    const names = Object.keys(g.attributes);
    for (const tri of byTile.values()) {
      const remap = new Map(), order = [], index = new Uint32Array(tri.length);
      for (let i = 0; i < tri.length; i++) { let n = remap.get(tri[i]); if (n === undefined) { n = order.length; remap.set(tri[i], n); order.push(tri[i]); } index[i] = n; }
      const ng = new THREE.BufferGeometry();
      for (const k of names) {
        const at = g.attributes[k], s = at.itemSize, src = at.array, out = new src.constructor(order.length * s);
        for (let i = 0; i < order.length; i++) for (let j = 0; j < s; j++) out[i * s + j] = src[order[i] * s + j];
        ng.setAttribute(k, new THREE.BufferAttribute(out, s, at.normalized));
      }
      ng.setIndex(new THREE.BufferAttribute(order.length > 65535 ? index : new Uint16Array(index), 1));
      ng.computeBoundingSphere(); ng.computeBoundingBox();
      const t = new THREE.Mesh(ng, m.material);
      t.position.copy(m.position); t.quaternion.copy(m.quaternion); t.scale.copy(m.scale);
      t.castShadow = m.castShadow; t.receiveShadow = m.receiveShadow; t.renderOrder = m.renderOrder; t.frustumCulled = m.frustumCulled;
      Object.assign(t.userData, m.userData); t.onBeforeRender = m.onBeforeRender;
      m.parent.add(t); info.tiles++;
    }
    m.parent.remove(m); g.dispose(); info.split++;
    return true;
  }
  function splitInstanced(m) {
    const n = m.count, mat = new THREE.Matrix4(), v = new THREE.Vector3(), byTile = new Map(), col = new THREE.Color();
    for (let i = 0; i < n; i++) { m.getMatrixAt(i, mat); v.setFromMatrixPosition(mat); const k = tileOf(v.x, v.z); let l = byTile.get(k); if (!l) byTile.set(k, l = []); l.push(i); }
    if (byTile.size < 2) return false;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const gb = new THREE.Box3();
    for (const list of byTile.values()) {
      const geo = m.geometry.clone(), t = new THREE.InstancedMesh(geo, m.material, list.length), box = new THREE.Box3();
      list.forEach((i, j) => { m.getMatrixAt(i, mat); t.setMatrixAt(j, mat); box.union(gb.copy(m.geometry.boundingBox).applyMatrix4(mat)); if (m.instanceColor) { m.getColorAt(i, col); t.setColorAt(j, col); } });
      geo.boundingBox = box; geo.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); // r128 culls instanced meshes on the geometry bounds
      t.frustumCulled = true; // bounds set above (r128 turns culling off for instanced meshes)
      t.castShadow = m.castShadow; t.receiveShadow = m.receiveShadow; Object.assign(t.userData, m.userData);
      m.parent.add(t); info.tiles++;
    }
    m.parent.remove(m); info.inst++;
    return true;
  }
  function run() {
    const todo = [];
    for (const o of scene.children) {
      if (!o.isMesh || Array.isArray(o.material) || (o.geometry.groups && o.geometry.groups.length) || o.userData.noTile) continue;
      if (o.isInstancedMesh) { if (o.count >= 400) todo.push(o); continue; }
      const g = o.geometry; if (!g.attributes.position) continue;
      if ((g.index ? g.index.count : g.attributes.position.count) / 3 >= MIN) todo.push(o);
    }
    for (const o of todo) { try { o.isInstancedMesh ? splitInstanced(o) : splitMesh(o); } catch (e) { console.warn('tiles', e); } }
    return info;
  }
  return { run, info, SIZE };
})();

