  // =====================================================================================
  // (15 nov., user request) breakable traffic lights: a car that hits a pole fast enough knocks it over, shots and
  // blasts bring it down too. The poles, heads and lamps are the instances built by buildLights (traffic.js, TF.im):
  // a broken one is tilted about its foot, its lamps go dark, and it stands up again a while later, out of sight.
  // =====================================================================================
  const LightPoles = (() => {
    const CELL = 16, grid = new Map(), m4 = new THREE.Matrix4(), rot = new THREE.Matrix4(), tr = new THREE.Matrix4(), axis = new THREE.Vector3();
    let ready = false, list = [];
    function setup() {
      if (ready || !TF.im) return; ready = true;
      const { pm, hm, lamps, poles } = TF.im;
      list = poles.map(([x, z], i) => {
        const p = { i, x, z, y: surfaceH(x, z), broken: false, hp: 8, t: 0, m0: [] };
        for (const [im, k] of [[pm, i], [hm, i], [lamps, i * 3], [lamps, i * 3 + 1], [lamps, i * 3 + 2]]) { const m = new THREE.Matrix4(); im.getMatrixAt(k, m); p.m0.push([im, k, m]); }
        const key = Math.floor(x / CELL) * 10000 + Math.floor(z / CELL); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(p);
        return p;
      });
    }
    function near(x, z, r, fn) {
      for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        const l = grid.get(i * 10000 + j); if (l) for (const p of l) if (!p.broken) fn(p);
      }
    }
    function topple(p, dx, dz, c) { // falls away from the impact: rotation about the horizontal axis across (dx, dz), at its foot
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      p.broken = true; p.t = 0; p.hp = 8;
      axis.set(dz, 0, -dx); rot.makeRotationAxis(axis, 1.35 + R() * 0.15);
      const full = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(rot).multiply(tr.makeTranslation(-p.x, -p.y, -p.z));
      for (const [im, k, m] of p.m0) { m4.copy(m).premultiply(full); im.setMatrixAt(k, m4); im.instanceMatrix.needsUpdate = true; }
      const head = TF.heads && TF.heads[p.i]; if (head) head.broken = true;
      for (let k = 0; k < 6; k++) hd.spark && hd.spark(p.x, p.y + 1 + R() * 2, p.z, (R() - 0.5) * 4 + dx * 3, 1 + R() * 3, (R() - 0.5) * 4 + dz * 3, 0.35);
      if (c && c.local) { sfx.impact(7); L_resp(c, 1); addHeat(c, 0.05); }
    }
    function restore(p) {
      p.broken = false; p.hp = 8;
      for (const [im, k, m] of p.m0) { im.setMatrixAt(k, m); im.instanceMatrix.needsUpdate = true; }
      const head = TF.heads && TF.heads[p.i]; if (head) head.broken = false;
    }
    let visT = 0;
    function step(dt) {
      setup(); if (!list.length) return;
      for (const c of allPlayerCars().concat(rivals, npcs, extras)) {
        if (!c.alive || c.remote || c.proxy || (c.air || 0) > 1.4 || c.speed < 3) continue;
        near(c.x, c.z, 2, p => {
          if (Math.hypot(c.x - p.x, c.z - p.z) > 1.4) return;
          topple(p, c.vx, c.vz, c); c.vx *= 0.88; c.vz *= 0.88; damage(c, 1 + c.speed * 0.08);
        });
      }
      if ((visT -= dt) > 0) return; visT = 0.5;
      for (const p of list) if (p.broken && (p.t += 0.5) > 90 && minPlayerDist(p.x, p.z) > 60) restore(p);
    }
    function shoot(ox, oz, dx, dz, range, from, dmg) { // a bullet stops on the first pole it meets (thin: 0.35 m)
      if (!list.length) return range;
      let best = range, hit = null;
      for (let s = 0; s <= range + CELL; s += CELL * 0.5) near(ox + dx * s, oz + dz * s, 1, p => {
        const px = p.x - ox, pz = p.z - oz, t = px * dx + pz * dz; if (t < 0.5 || t > best) return;
        if (Math.abs(px * dz - pz * dx) < 0.35) { best = t; hit = p; }
      });
      if (!hit) return range;
      hd.spark && hd.spark(ox + dx * best, hit.y + 1.2, oz + dz * best, -dx * 3, 1.5, -dz * 3, 0.25);
      if ((hit.hp -= dmg) <= 0) topple(hit, dx, dz, from);
      return best;
    }
    function blast(x, z, r, from) { near(x, z, r, p => { const d = Math.hypot(p.x - x, p.z - z); if (d < r) topple(p, p.x - x, p.z - z, from); }); }
    return { step, shoot, blast, get count() { return list.length; }, get broken() { return list.filter(p => p.broken).length; }, get list() { return list; } };
  })();
