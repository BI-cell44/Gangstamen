  // ---------- frame rendering ----------
  const focus = new THREE.Vector3();
  let dofRT = null;
  function render(views) {
    const pr = renderer.getPixelRatio();
    skyU.time.value = time; finalMat.uniforms.time.value = time;
    const now = performance.now() / 1000, rdt = Math.min(0.1, now - (render.last || now)); render.last = now;
    ambienceTick(rdt); rainU.uTime.value = now % 1000;
    for (const v of views) {
      sceneRT.viewport.set(Math.round(v.x * pr), Math.round((innerHeight - v.y - v.h) * pr), Math.round(v.w * pr), Math.round(v.h * pr));
      sceneRT.scissor.copy(sceneRT.viewport); sceneRT.scissorTest = views.length > 1;
      dome.position.copy(v.cam.position);
      rainU.uCam.value.copy(v.cam.position);
      if (v.car) rainU.uTilt.value.set(-v.car.vx, 0, -v.car.vz); else rainU.uTilt.value.set(2, 0, 1);
      if (lampStreaks && lampStreaks.visible) { // each streak faces this camera and lies on the road
        const m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
        lampStreaks.userData.pts.forEach(([x, z], i) => { const a = Math.atan2(v.cam.position.x - x, v.cam.position.z - z);
          e.set(-Math.PI / 2, a, 0, 'YXZ'); qt.setFromEuler(e); m4.compose(pv.set(x + Math.sin(a) * 6, surfaceH(x, z) + 0.38, z + Math.cos(a) * 6), qt, sv.set(1.6, 16, 1)); lampStreaks.setMatrixAt(i, m4); });
        lampStreaks.instanceMatrix.needsUpdate = true;
      }
      if (v.car) focus.copy(v.car.mesh.position); else focus.set(0, 0, 0);
      sun.position.copy(focus).add(SUN_OFF); sun.target.position.copy(focus); sun.target.updateMatrixWorld();
      const sc = v.h * pr * 0.5 * v.cam.projectionMatrix.elements[5];
      ptsSmoke.material.uniforms.uScale.value = sc; ptsGlow.material.uniforms.uScale.value = sc;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, v.cam);
    }
    // bloom: bright pass, then a blurred mip chain
    brightMat.uniforms.t.value = sceneRT.texture; pass(brightMat, bB[0]);
    for (let i = 0; i < bA.length; i++) {
      const src = i === 0 ? bB[0] : bA[i - 1];
      if (i === 0) { blurMat.uniforms.t.value = bB[0].texture; blurMat.uniforms.d.value.set(1 / bA[0].width, 0); pass(blurMat, bA[0]); blurMat.uniforms.t.value = bA[0].texture; blurMat.uniforms.d.value.set(0, 1 / bA[0].height); pass(blurMat, bB[0]); blurMat.uniforms.t.value = bB[0].texture; blurMat.uniforms.d.value.set(0, 0); pass(blurMat, bA[0]); continue; }
      blurMat.uniforms.t.value = src.texture; blurMat.uniforms.d.value.set(1 / bA[i].width, 0); pass(blurMat, bB[i]);
      blurMat.uniforms.t.value = bB[i].texture; blurMat.uniforms.d.value.set(0, 1 / bA[i].height); pass(blurMat, bA[i]);
    }
    const u = finalMat.uniforms; u.t.value = sceneRT.texture; u.levels.value = bA.length;
    // photo mode (one view): exposure, and the depth of field from a depth pass of the same view
    const ex0 = u.exposure.value; u.exposure.value = ex0 * PhotoMode.exposure;
    u.dof.value = 0;
    if (PhotoMode.dof > 0 && views.length === 1) {
      if (!dofRT || dofRT.width !== RW || dofRT.height !== RH) { if (dofRT) dofRT.dispose(); dofRT = new THREE.WebGLRenderTarget(RW, RH); dofRT.depthTexture = new THREE.DepthTexture(RW, RH); dofRT.depthTexture.type = THREE.UnsignedIntType; }
      const cam = views[0].cam; renderer.setRenderTarget(dofRT); renderer.render(scene, cam);
      u.dep.value = dofRT.depthTexture; u.dof.value = PhotoMode.dof; u.cn.value = cam.near; u.cf.value = cam.far; u.asp.value = RW / RH;
    }
    for (let i = 0; i < 5; i++) u['b' + i].value = bA[Math.min(i, bA.length - 1)].texture;
    renderer.setRenderTarget(null); renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight);
    pass(finalMat, null);
    u.exposure.value = ex0;
  }

