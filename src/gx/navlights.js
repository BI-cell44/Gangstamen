  // =====================================================================================
  // (16 nov., backlog « Loire, suite ») navigation lights on the boats at night (red to port, green to starboard, white
  // at the top) and the ferry's horn when it leaves the quay, louder the closer the player is
  // =====================================================================================
  const NavLights = (() => {
    let done = false, lastWait = null; const lamps = [];
    function setup() {
      if (done || !Boats.list || !Boats.list.length) return; done = true;
      const ball = new THREE.SphereGeometry(1, 10, 8); ball.userData.shared = true;
      const M = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), fog: false });
      const red = M([5, 0.2, 0.15]), green = M([0.2, 4, 0.8]), white = M([4, 4, 3.6]);
      for (const b of Boats.list) {
        b.body.updateMatrix(); b.body.geometry.computeBoundingBox(); // in the boat's own frame
        const bb = b.body.geometry.boundingBox.clone().applyMatrix4(b.body.matrix), sz = bb.getSize(new THREE.Vector3()), big = b.kind === 'ferry', r = big ? 0.32 : 0.16;
        const top = big ? sz.y * 0.75 : sz.y * 0.95, side = Math.min(sz.x, sz.z) / 2 * 0.9, alongX = sz.x > sz.z, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, deck = big ? sz.y * 0.45 : sz.y * 0.18;
        for (const [m, a, y] of [[red, -side, deck], [green, side, deck], [white, 0, top]]) { // a: across the hull (the long axis can be x or z)
          const o = new THREE.Mesh(ball, m); o.scale.setScalar(r); o.position.set(alongX ? cx : cx + a, y, alongX ? cz + a : cz); o.visible = false; o.userData.hdLinear = true; b.g.add(o); lamps.push(o);
        }
      }
    }
    function step(dt) {
      setup(); if (!done) return;
      const night = !!(hd.amb && hd.amb.t > 1.4);
      if (lamps.length && lamps[0].visible !== night) for (const o of lamps) o.visible = night;
      const f = Boats.ferry; if (!f) return;
      if (lastWait !== null && lastWait > 0 && f.wait <= 0) { const d = minPlayerDist(f.x, f.z); if (d < 600) sfx.shipHorn && sfx.shipHorn(Math.max(0.15, 1 - d / 600)); }
      lastWait = f.wait;
    }
    return { step };
  })();
