  // ---------- ground: gravel and grass on the terrain (chosen from the vertex colour), paved footways ----------
  function tileTex(n, f) { const t = new THREE.CanvasTexture(noiseCanvas(n, f)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
  function blotch(n, k) { // smooth tiling value noise
    const a = new Float32Array(n * n), c = n / k, v = new Float32Array(k * k).map(() => Math.random());
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const fx = x / c, fy = y / c, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const p = (i, j) => v[((iy + j) % k) * k + (ix + i) % k];
      a[y * n + x] = (p(0, 0) * (1 - sx) + p(1, 0) * sx) * (1 - sy) + (p(0, 1) * (1 - sx) + p(1, 1) * sx) * sy;
    }
    return a;
  }
  function slabTextures(n, cell, bond) { // concrete paving slabs with joints: colour and relief
    const hf = new Float32Array(n * n), b1 = blotch(n, 8), tone = new Float32Array(256).map(() => Math.random());
    const map = tileTex(n, (d, o, x, y) => {
      const cx = x / cell | 0, yy = y + (bond ? (cx % 2) * cell / 2 : 0), sx = x % cell, sy = yy % cell, joint = sx < 2 || sy < 2, i = y * n + x;
      hf[i] = joint ? 0 : 3 + Math.random() * 0.5;
      const t = tone[(cx * 7 + (yy / cell | 0) * 13) % 256];
      const v = joint ? 118 : 206 + t * 30 + b1[i] * 18 + (Math.random() - 0.5) * 22 - (Math.random() < 0.012 ? 50 : 0);
      d[o] = v; d[o + 1] = v - 2; d[o + 2] = v - 6; d[o + 3] = 255;
    });
    return { map, normal: heightToNormal(hf, n, 0.35) };
  }
