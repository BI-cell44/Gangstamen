  // ---------- real shop fronts (OpenStreetMap): one painted front per shop, in one atlas ----------
  const CHAINS = /cr[ée]dit|^cic$|caisse d|banque|lidl|intermarch|superdry|^pfg$|vival|poste/i; // national brands get a generic sign
  const FAMILY = {
    bakery: ['BOULANGERIE', '#7a1f2b', '#f1e3c0', 1], pharmacy: ['PHARMACIE', '#eef2ee', '#1f7a3a', 0], cafe: ['CAFÉ', '#3a2a1e', '#e8c98a', 1], restaurant: ['RESTAURANT', '#1f2d2a', '#f0e6d0', 1],
    bank: ['BANQUE', '#dfe3e8', '#1d2f52', 0], hair: ['COIFFURE', '#4a2a52', '#f6e9f2', 0], tabac: ['TABAC PRESSE', '#8a1a1a', '#fff4e0', 0], market: ['ALIMENTATION', '#2a5a2a', '#f4f0d8', 1],
    garage: ['GARAGE', '#c9b21a', '#1b1b1b', 0], post: ['POSTE', '#f2c81e', '#1d2f52', 0], florist: ['FLEURISTE', '#2f5d3a', '#f3f0dc', 1], shop: ['', '#27364a', '#f2efe6', 0],
  };
  const SHOP_COLS = ['#27364a', '#5a2e1e', '#1f4a36', '#6b1f1f', '#3b3b3b', '#7a5a34'];
  function shopSet(shops) {
    const TW = 512, TH = 256, COLS = 8, AW = 4096, AH = 2048;
    const [c, g] = canvas(AW, AH), [ce, ge] = canvas(AW, AH), [cr, gr] = canvas(AW, AH), R = Math.random;
    g.fillStyle = '#888'; g.fillRect(0, 0, AW, AH); ge.fillStyle = '#000'; ge.fillRect(0, 0, AW, AH); gr.fillStyle = 'rgb(0,230,0)'; gr.fillRect(0, 0, AW, AH);
    const info = [];
    shops.slice(0, 64).forEach((sh, i) => {
      const f = FAMILY[sh.k] || FAMILY.shop, x = (i % COLS) * TW, y = ((i / COLS) | 0) * TH, top = 14, sy = 66, base = TH - 28;
      const col = sh.k === 'shop' ? SHOP_COLS[i % SHOP_COLS.length] : f[1], ink = f[2];
      const name = (!sh.n || CHAINS.test(sh.n) ? f[0] || 'BOUTIQUE' : sh.n).toUpperCase();
      g.fillStyle = col; g.fillRect(x, y, TW, TH);                                                  // painted shop surround
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y + top, TW, 44); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, y + top + 44, TW, 5);
      g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 32px Georgia, "Times New Roman", serif';
      g.fillText(name, x + TW / 2, y + top + 23, TW - 60);
      ge.fillStyle = 'rgba(255,235,200,.3)'; ge.fillRect(x, y + top, TW, 44);
      if (sh.k === 'pharmacy') { g.fillStyle = '#19a34a'; g.fillRect(x + 20, y + top + 14, 30, 12); g.fillRect(x + 29, y + top + 5, 12, 30); ge.fillStyle = '#3dff7a'; ge.fillRect(x + 20, y + top + 14, 30, 12); ge.fillRect(x + 29, y + top + 5, 12, 30); }
      if (sh.k === 'tabac') { g.fillStyle = '#d21f1f'; g.beginPath(); g.moveTo(x + 36, y + top + 2); g.lineTo(x + 52, y + top + 22); g.lineTo(x + 36, y + top + 42); g.lineTo(x + 20, y + top + 22); g.fill(); ge.fillStyle = '#ff4030'; ge.fillRect(x + 26, y + top + 12, 20, 20); }
      const glass = (px, pw, pb, lit) => {
        const lg = g.createLinearGradient(0, y + sy, 0, y + pb); lg.addColorStop(0, '#6c7a86'); lg.addColorStop(1, '#262f38');
        g.fillStyle = lg; g.fillRect(px, y + sy + 8, pw, pb - sy - 8); gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(px, y + sy + 8, pw, pb - sy - 8);
        const le = ge.createLinearGradient(0, y + sy, 0, y + pb); le.addColorStop(0, lit ? '#ffe2a8' : '#8a7a5a'); le.addColorStop(1, lit ? '#c08a3c' : '#4a3c28'); ge.fillStyle = le; ge.fillRect(px, y + sy + 8, pw, pb - sy - 8);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px, y + sy + 8, pw, 6);
      };
      if (sh.k === 'garage') { // workshop: a roller door and a small office window
        g.fillStyle = '#8d959c'; g.fillRect(x + 30, y + sy, 300, TH - sy); for (let yy = y + sy + 4; yy < y + TH; yy += 9) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 30, yy, 300, 3); }
        gr.fillStyle = 'rgb(0,110,0)'; gr.fillRect(x + 30, y + sy, 300, TH - sy); glass(x + 360, 120, base, true);
      } else if (sh.k === 'bank') { // sober front with a cash machine
        glass(x + 24, 150, base, false); glass(x + 190, 90, TH - 6, false); glass(x + 296, 110, base, false);
        g.fillStyle = '#c9ccd2'; g.fillRect(x + 424, y + sy + 30, 64, 110); g.fillStyle = '#18324a'; g.fillRect(x + 434, y + sy + 42, 44, 32); ge.fillStyle = '#6fd0ff'; ge.fillRect(x + 434, y + sy + 42, 44, 32);
      } else {
        const side = (TW - 110) / 2 - 22;
        glass(x + 16, side, base, true); glass(x + (TW - 86) / 2, 86, TH - 6, true); glass(x + (TW + 110) / 2 + 6, side, base, true);
        for (const px of [x + 16, x + (TW + 110) / 2 + 6]) for (let s2 = 0; s2 < 3; s2++) { // goods in the window
          g.fillStyle = 'rgba(230,220,200,.22)'; g.fillRect(px + 8, y + sy + 44 + s2 * 34, side - 16, 3);
          for (let q = px + 12; q < px + side - 18; q += 13 + R() * 10) { g.fillStyle = `hsla(${sh.k === 'bakery' ? 30 + R() * 20 : sh.k === 'florist' ? R() * 360 : R() * 360 | 0},${sh.k === 'florist' ? 80 : 45}%,60%,.55)`; g.fillRect(q, y + sy + 26 + s2 * 34, 8 + R() * 6, 18); }
        }
        if (sh.k === 'cafe' || sh.k === 'restaurant') { g.fillStyle = '#1b1b1b'; g.fillRect(x + 30, y + sy + 60, 60, 84); g.fillStyle = '#e9e2cf'; for (let l = 0; l < 6; l++) g.fillRect(x + 36, y + sy + 70 + l * 12, 20 + R() * 28, 3); } // menu board
      }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y, 3, TH); g.fillRect(x + TW - 3, y, 3, TH);
      info.push({ uv: [(x + 2) / AW, 1 - (y + TH) / AH, (x + TW - 2) / AW, 1 - (y + 1) / AH], col: ink, awning: !!f[3] });
    });
    const mk = cv => { const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return t; };
    const half = cv => { const [c2, g2] = canvas(AW / 2, AH / 2); g2.drawImage(cv, 0, 0, AW / 2, AH / 2); return c2; };
    const rm = mk(half(cr));
    const mat = new THREE.MeshStandardMaterial({ map: mk(c), emissive: 0xffffff, emissiveMap: mk(half(ce)), emissiveIntensity: 0, roughness: 1, metalness: 1, roughnessMap: rm, metalnessMap: rm, envMapIntensity: 0.9 });
    mat.color.setScalar(0.8); // painted wood, not a light box: keep it in step with the walls
    return { mat, info };
  }
  function wallMat(style, ground, variant) {
    const t = facadeTextures(style, ground, variant);
    return new THREE.MeshStandardMaterial({ map: t.map, vertexColors: true, emissive: 0xffffff, emissiveMap: t.emissive, emissiveIntensity: 0, normalMap: t.normal, normalScale: new THREE.Vector2(0.9, 0.9),
      roughness: 1, metalness: 1, roughnessMap: t.rough, metalnessMap: t.rough, envMapIntensity: 0.9 });
  }
