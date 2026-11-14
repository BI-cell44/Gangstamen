  // ---------- high-resolution drawn facades: colour, lit windows, relief and glossy glass ----------
  // one tile = 4 bays x 4 floors = 16 m x 12.8 m, at 64 px per metre
  // ground = true paints the street-level strip instead (one floor): doors, garages, shop fronts
  function facadeTextures(style, ground, variant = 0) {
    const shop = style === 'shop', S = shop ? 2048 : 1024, M = 64, bw = 256, fh = 256, rows = ground ? 1 : 4, SH = rows * fh, bays = S / bw;
    const [c, g] = canvas(S, SH), [ce, ge] = canvas(S, SH), [ch, gh] = canvas(S, SH), [cr, gr] = canvas(S, SH);
    const R = Math.random;
    g.fillStyle = '#f3f0ea'; g.fillRect(0, 0, S, SH); ge.fillStyle = '#000'; ge.fillRect(0, 0, S, SH);
    gh.fillStyle = 'rgb(128,128,128)'; gh.fillRect(0, 0, S, SH); gr.fillStyle = 'rgb(0,240,0)'; gr.fillRect(0, 0, S, SH);
    const H = (v, x, y, w, h) => { gh.fillStyle = `rgb(${v},${v},${v})`; gh.fillRect(x, y, w, h); };
    // weathered plaster: soft blotches and streaks
    for (let i = 0; i < 65 * rows * bays / 4 * (ground ? 2 : 1); i++) {
      const x = R() * S, y = R() * SH, r = 30 + R() * 130, d = R() < 0.6;
      for (const ox of [0, S, -S]) for (const oy of [0, SH, -SH]) {
        const rg = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        rg.addColorStop(0, d ? `rgba(60,50,40,${0.02 + R() * 0.035})` : `rgba(255,255,255,${0.03 + R() * 0.05})`); rg.addColorStop(1, 'rgba(0,0,0,0)');
        // only the square around the blotch: outside its radius the gradient is transparent (same picture, ~30x faster:
        // painting the whole canvas 2 300 times per texture was 50 s of the HD start-up in software rendering)
        const x0 = Math.max(0, Math.floor(x + ox - r)), y0 = Math.max(0, Math.floor(y + oy - r)), x1 = Math.min(S, Math.ceil(x + ox + r)), y1 = Math.min(SH, Math.ceil(y + oy + r));
        if (x1 > x0 && y1 > y0) { g.fillStyle = rg; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
      }
    }
    if (style === 'brick') {
      for (let y = 0, row = 0; y < SH; y += 5, row++) {
        for (let x = (row % 2) * -8; x < S; x += 16) { const v = 200 + R() * 55 | 0; g.fillStyle = `rgb(${v},${v - 14 - R() * 16 | 0},${v - 22 - R() * 18 | 0})`; g.fillRect(x, y, 15, 4); H(138, x, y, 15, 4); }
        g.fillStyle = 'rgba(235,228,214,1)'; g.fillRect(0, y + 4, S, 1); H(112, 0, y + 4, S, 1);
      }
    } else if (style === 'industrial') {
      for (let x = 0; x < S; x += 16) { const lg = g.createLinearGradient(x, 0, x + 16, 0); lg.addColorStop(0, 'rgba(0,0,0,.16)'); lg.addColorStop(0.5, 'rgba(255,255,255,.1)'); lg.addColorStop(1, 'rgba(0,0,0,.16)'); g.fillStyle = lg; g.fillRect(x, 0, 16, SH); H(104, x, 0, 3, SH); H(150, x + 6, 0, 5, SH); }
      for (let f = 0; f < (ground ? 0 : 4); f += 2) { // a band of workshop windows every other floor
        const y = f * fh + 26;
        g.fillStyle = '#d9d6cf'; g.fillRect(0, y - 5, S, 76); H(160, 0, y - 5, S, 76);
        for (let x = 6; x < S; x += 64) {
          const lg = g.createLinearGradient(0, y, 0, y + 66); lg.addColorStop(0, '#5c6b78'); lg.addColorStop(1, '#27313b'); g.fillStyle = lg; g.fillRect(x, y, 56, 66); H(70, x, y, 56, 66);
          gr.fillStyle = 'rgb(0,30,150)'; gr.fillRect(x, y, 56, 66);
          g.fillStyle = '#c8c5be'; g.fillRect(x + 27, y, 2, 66); g.fillRect(x, y + 32, 56, 2);
          if (R() < 0.3) { ge.fillStyle = '#bfd8ff'; ge.fillRect(x, y, 56, 66); }
        }
      }
      for (let i = 0; i < 10 * rows; i++) { const x = R() * S, y = R() * SH; const lg = g.createLinearGradient(0, y, 0, y + 120); lg.addColorStop(0, 'rgba(110,60,30,.22)'); lg.addColorStop(1, 'rgba(110,60,30,0)'); g.fillStyle = lg; g.fillRect(x, y, 2 + R() * 5, 120); } // rust runs
    } else if (style === 'plain' || style === 'block') {
      g.fillStyle = 'rgba(0,0,0,.2)';
      for (let f = 0; f < rows; f++) { g.fillRect(0, f * fh, S, 2); H(96, 0, f * fh, S, 3); }
      for (let b = 0; b < bays; b++) { g.fillRect(b * bw, 0, 2, SH); H(96, b * bw, 0, 3, SH); }
    }
    const SHUT = ['#5d7488', '#6f8a7c', '#8a6a5a', '#7a7f8c', '#4f6a5c'];
    // street-level features
    const WOOD = ['#5a2e1e', '#1f3d2e', '#27364a', '#6b1f1f', '#2d2d30', '#7a5a34'];
    const RG = (v, x, y, w, h) => { gr.fillStyle = `rgb(0,${v},0)`; gr.fillRect(x, y, w, h); };
    const door = (x0, wide) => {
      const dw = wide ? 150 : 66, dh = 176, x = Math.round(x0 + (bw * (wide ? 2 : 1) - dw) / 2), y = SH - dh - 6, col = WOOD[R() * WOOD.length | 0];
      g.fillStyle = '#ece7dc'; g.fillRect(x - 12, y - 46, dw + 24, dh + 52); H(152, x - 12, y - 46, dw + 24, dh + 52);          // stone surround
      const lg = g.createLinearGradient(0, y - 36, 0, y - 6); lg.addColorStop(0, '#586878'); lg.addColorStop(1, '#232c35'); g.fillStyle = lg; g.fillRect(x, y - 36, dw, 30); // fanlight
      RG(26, x, y - 36, dw, 30); gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(x, y - 36, dw, 30); H(70, x, y - 36, dw, 30);
      if (R() < 0.5) { ge.fillStyle = '#ffcf80'; ge.fillRect(x, y - 36, dw, 30); }
      g.fillStyle = col; g.fillRect(x, y, dw, dh); H(96, x, y, dw, dh); RG(120, x, y, dw, dh);
      const leaves = wide ? 2 : 1, lw = dw / leaves;
      for (let k = 0; k < leaves; k++) for (const [py, ph] of [[10, 62], [84, 80]]) {
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + k * lw + 9, y + py, lw - 18, ph); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + k * lw + 12, y + py + 3, lw - 24, ph - 6); H(84, x + k * lw + 9, y + py, lw - 18, ph);
      }
      if (wide) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x + dw / 2 - 1, y, 2, dh); }
      g.fillStyle = '#d9c070'; g.fillRect(x + (wide ? dw / 2 + 8 : dw - 14), y + 84, 6, 6);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, dw, 6); g.fillRect(x, y, 4, dh);
      g.fillStyle = '#cfcabd'; g.fillRect(x - 16, SH - 7, dw + 32, 7); H(210, x - 16, SH - 7, dw + 32, 7);                        // step
    };
    const garage = (x0, tall) => {
      const dw = tall ? 440 : 170, dh = tall ? 236 : 170, x = Math.round(x0 + ((tall ? 2 : 1) * bw - dw) / 2), y = SH - dh, col = tall ? ['#8d959c', '#4e6a58', '#6f7f95'][R() * 3 | 0] : ['#e6e2d8', '#4f6a5c', '#7a5a34', '#9aa0a6'][R() * 4 | 0];
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 5, y - 5, dw + 10, dh + 5); H(150, x - 8, y - 8, dw + 16, dh + 8);
      g.fillStyle = col; g.fillRect(x, y, dw, dh); H(100, x, y, dw, dh); RG(110, x, y, dw, dh);
      for (let yy = y + 4; yy < SH; yy += tall ? 9 : 28) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, yy, dw, tall ? 3 : 3); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x, yy + 3, dw, 2); H(86, x, yy, dw, 3); }
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y, dw, 8);
      if (tall) for (const sx of [x - 26, x + dw + 8]) for (let yy = SH - 90; yy < SH; yy += 18) { g.fillStyle = (yy / 18 | 0) % 2 ? '#e2b21f' : '#1b1b1b'; g.fillRect(sx, yy, 18, 18); }
    };
    const hall = x0 => { // glazed entrance of a block of flats, under a canopy
      const dw = 190, dh = 186, x = x0 + (bw - dw) / 2, y = SH - dh;
      g.fillStyle = '#b9b5ab'; g.fillRect(x - 26, y - 22, dw + 52, 16); H(225, x - 26, y - 22, dw + 52, 16); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 26, y - 6, dw + 52, 9);
      const lg = g.createLinearGradient(0, y, 0, SH); lg.addColorStop(0, '#5b6c7b'); lg.addColorStop(1, '#1d262e'); g.fillStyle = lg; g.fillRect(x, y, dw, dh); H(72, x, y, dw, dh);
      gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(x, y, dw, dh); ge.fillStyle = '#d9c38a'; ge.fillRect(x, y, dw, dh);
      g.fillStyle = '#30343a'; for (const fx of [0, dw / 3, dw * 2 / 3, dw - 5]) { g.fillRect(x + fx, y, 5, dh); ge.fillStyle = '#000'; ge.fillRect(x + fx, y, 5, dh); } g.fillRect(x, y, dw, 6); g.fillRect(x, y + 50, dw, 4);
      g.fillStyle = '#c9c9c9'; g.fillRect(x - 16, y + 70, 9, 22);
    };
    const SHOPS = [['BOULANGERIE', '#7a1f2b', '#f1e3c0'], ['BAR  TABAC', '#1d2f52', '#f2efe6'], ['PHARMACIE', '#1f6a3a', '#ffffff'], ['COIFFURE', '#5a2a5e', '#f6e9f2'], ['BOUCHERIE', '#8a1a1a', '#fff4e0'], ['PRESSE  LOTO', '#c9a21a', '#1b1b1b'], ['ALIMENTATION', '#2a5a2a', '#f4f0d8'], ['CAFÉ DE LA BUTTE', '#3a2a1e', '#e8c98a']];
    const shopFront = (x0, k) => {
      const [name, col, ink] = SHOPS[k % SHOPS.length], w = 2 * bw, x = x0 + 14, sw = w - 28, top = 20, sy = 70, base = SH - 30;
      g.fillStyle = col; g.fillRect(x, top, sw, 46); H(170, x, top, sw, 46); RG(120, x, top, sw, 46);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, top + 46, sw, 5);
      g.fillStyle = ink; g.font = 'bold 30px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, x + sw / 2, top + 24, sw - 30);
      ge.fillStyle = 'rgba(255,240,210,.35)'; ge.fillRect(x, top, sw, 46);
      g.fillStyle = col; g.fillRect(x, sy, sw, SH - sy); H(140, x, sy, sw, SH - sy);                                             // painted shop surround
      const lg = g.createLinearGradient(0, sy, 0, base); lg.addColorStop(0, '#6c7a86'); lg.addColorStop(1, '#2a333c');
      const panes = [[x + 12, (sw - 110) / 2 - 18], [x + (sw - 86) / 2, 86], [x + (sw + 110) / 2 + 6, (sw - 110) / 2 - 18]];
      panes.forEach(([px, pw], i) => {
        const pb = i === 1 ? SH - 6 : base;
        g.fillStyle = lg; g.fillRect(px, sy + 10, pw, pb - sy - 10); H(74, px, sy + 10, pw, pb - sy - 10); gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(px, sy + 10, pw, pb - sy - 10);
        const le = ge.createLinearGradient(0, sy, 0, pb); le.addColorStop(0, '#ffe2a8'); le.addColorStop(1, '#c08a3c'); ge.fillStyle = le; ge.fillRect(px, sy + 10, pw, pb - sy - 10);
        if (i !== 1) for (let s2 = 0; s2 < 3; s2++) { g.fillStyle = 'rgba(230,220,200,.22)'; g.fillRect(px + 8, sy + 46 + s2 * 34, pw - 16, 3); for (let q = px + 12; q < px + pw - 16; q += 14 + R() * 10) { g.fillStyle = `hsla(${R() * 360 | 0},45%,60%,.5)`; g.fillRect(q, sy + 28 + s2 * 34, 8 + R() * 6, 18); ge.fillStyle = 'rgba(0,0,0,.3)'; ge.fillRect(q, sy + 28 + s2 * 34, 10, 18); } }
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px, sy + 10, pw, 6);
      });
      if (k % 3 === 0) { // striped awning
        for (let q = 0; q < sw; q += 24) { g.fillStyle = (q / 24 | 0) % 2 ? ink : col; g.beginPath(); g.moveTo(x + q, sy - 2); g.lineTo(x + q + 24, sy - 2); g.lineTo(x + q + 24, sy + 34); g.lineTo(x + q, sy + 34); g.fill(); }
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, sy + 34, sw, 7); H(215, x, sy - 2, sw, 36); RG(200, x, sy - 2, sw, 36); ge.fillStyle = '#000'; ge.fillRect(x, sy - 2, sw, 43);
      }
    };
    const rot = a => a.map((_, i) => a[(i + variant) % a.length]);
    const LAYOUT0 = { house: ['door', 'win', 'win', 'garage'], brick: ['win', 'door', 'win', 'win'], block: ['win', 'hall', 'win', 'win'], plain: ['', 'door', '', ''], industrial: ['', 'roller', '-', 'door'], church: ['', 'bigdoor', '-', ''] };
    const LAYOUT = {}; for (const k in LAYOUT0) LAYOUT[k] = k === 'industrial' || k === 'church' ? LAYOUT0[k] : rot(LAYOUT0[k]);
    if (shop) for (let k = 0; k < bays / 2; k++) shopFront(k * 2 * bw, (k * 3 + (R() * 8 | 0)) % 8);
    for (let f = 0; f < rows; f++) for (let b = 0; b < bays; b++) {
      if (shop) continue;
      const x0 = b * bw, y0 = f * fh;
      if (ground) {
        const what = LAYOUT[style][b];
        if (what === 'door') { door(x0, false); continue; }
        if (what === 'bigdoor') { door(x0, true); continue; }
        if (what === 'garage') { garage(x0, false); continue; }
        if (what === 'roller') { garage(x0, true); continue; }
        if (what === 'hall') { hall(x0); continue; }
        if (what !== 'win') continue;
      }
      if (style === 'industrial' || style === 'plain') continue;
      let ww = 1.0 * M, wh = 1.7 * M;
      if (style === 'house' && variant === 1) wh = 2.05 * M;                 // tall French windows
      if (style === 'house' && variant === 2) { ww = 0.92 * M; wh = 1.4 * M; } // plainer house, no shutters
      if (style === 'brick' && variant === 1) { ww = 1.15 * M; wh = 1.5 * M; }
      if (style === 'block') { ww = (variant ? 1.7 : 2.3) * M; wh = 1.45 * M; }
      if (style === 'church') { if (b % 2) continue; ww = 1.15 * M; wh = 2.5 * M; }
      const wx = Math.round(x0 + (bw - ww) / 2), wy = Math.round(y0 + (fh - wh) * (style === 'church' ? 0.35 : 0.42));
      const lit = R() < 0.3, warm = R() < 0.85;
      if (style === 'house' || style === 'brick' || style === 'church') { // stone surround
        g.fillStyle = style === 'brick' ? '#efe9dc' : 'rgba(255,255,255,.55)'; g.fillRect(wx - 9, wy - 12, ww + 18, wh + 16); H(150, wx - 9, wy - 12, ww + 18, wh + 16);
        g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(wx - 9, wy + wh + 4, ww + 18, 3);
      }
      // glass
      const lg = g.createLinearGradient(0, wy, 0, wy + wh);
      if (style === 'church') { lg.addColorStop(0, '#3b3466'); lg.addColorStop(1, '#1d2440'); } else { lg.addColorStop(0, '#586878'); lg.addColorStop(0.5, '#2c3742'); lg.addColorStop(1, '#1b232b'); }
      g.fillStyle = lg;
      if (style === 'church') { g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill(); } else g.fillRect(wx, wy, ww, wh);
      H(64, wx, wy, ww, wh); gr.fillStyle = 'rgb(0,26,160)'; gr.fillRect(wx, wy, ww, wh);
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(wx, wy, ww, 7); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx, wy, 5, wh); // recess shadow
      if (lit) { const le = ge.createLinearGradient(0, wy, 0, wy + wh); le.addColorStop(0, warm ? '#ffd58a' : '#a9c8ff'); le.addColorStop(1, warm ? '#c98a3a' : '#5f86c9'); ge.fillStyle = le; ge.fillRect(wx, wy, ww, wh); }
      if (style !== 'church' && R() < 0.55) { // net curtains
        g.fillStyle = 'rgba(235,235,225,.5)'; const cw = ww * (0.25 + R() * 0.2); g.fillRect(wx + 3, wy + 4, cw, wh - 6); g.fillRect(wx + ww - 3 - cw, wy + 4, cw, wh - 6);
        if (lit) { ge.fillStyle = 'rgba(0,0,0,.25)'; ge.fillRect(wx + 3, wy + 4, cw, wh - 6); }
      }
      // frame and glazing bars
      g.strokeStyle = style === 'church' ? '#15151c' : '#f2f0ea'; g.lineWidth = 4; g.strokeRect(wx + 2, wy + 2, ww - 4, wh - 4);
      g.fillStyle = g.strokeStyle;
      if (style === 'block') { g.fillRect(wx + ww * 0.36, wy, 4, wh); g.fillRect(wx + ww * 0.68, wy, 4, wh); }
      else { g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + wh * 0.36, ww, 3); if (style === 'church') for (let k = 1; k < 6; k++) g.fillRect(wx, wy + wh * k / 6, ww, 2); }
      for (const gg of [ge]) { gg.fillStyle = '#000'; if (style === 'block') { gg.fillRect(wx + ww * 0.36, wy, 4, wh); gg.fillRect(wx + ww * 0.68, wy, 4, wh); } else { gg.fillRect(wx + ww / 2 - 2, wy, 4, wh); gg.fillRect(wx, wy + wh * 0.36, ww, 3); } }
      // sill
      g.fillStyle = '#e9e5db'; g.fillRect(wx - 12, wy + wh, ww + 24, 7); H(200, wx - 12, wy + wh, ww + 24, 7);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(wx - 12, wy + wh + 7, ww + 24, 5);
      if (style === 'house' && variant !== 2) { // louvred shutters, open against the wall; one colour per house type
        const sc = SHUT[variant ? 1 + (variant * 2) % 4 : 0], sw = 0.48 * M;
        for (const sx of [wx - sw - 3, wx + ww + 3]) {
          g.fillStyle = sc; g.fillRect(sx, wy - 2, sw, wh + 4); H(176, sx, wy - 2, sw, wh + 4);
          g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = wy + 2; y < wy + wh; y += 6) g.fillRect(sx + 3, y, sw - 6, 2);
          g.fillStyle = 'rgba(255,255,255,.14)'; for (let y = wy + 4; y < wy + wh; y += 6) g.fillRect(sx + 3, y, sw - 6, 1);
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(sx + sw, wy, 3, wh + 4);
        }
        if (variant === 1 || R() < 0.3) { g.strokeStyle = '#1c1c20'; g.lineWidth = 2; g.strokeRect(wx + 1, wy + wh - 30, ww - 2, 28); for (let x = wx + 8; x < wx + ww; x += 9) g.strokeRect(x, wy + wh - 30, 0.5, 28); } // window guard
      }
      if (style === 'block') {
        const dn = R() < 0.6 ? (0.15 + R() * 0.7) * wh : 0; // roller blind
        if (dn) { g.fillStyle = '#cfccc4'; g.fillRect(wx + 3, wy + 3, ww - 6, dn); g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = wy + 5; y < wy + dn; y += 5) g.fillRect(wx + 3, y, ww - 6, 1); ge.fillStyle = '#000'; ge.fillRect(wx + 3, wy + 3, ww - 6, dn); gr.fillStyle = 'rgb(0,220,0)'; gr.fillRect(wx + 3, wy + 3, ww - 6, dn); H(120, wx + 3, wy + 3, ww - 6, dn); }
        if (variant === 1) { // coloured panel under the window, 1960s style
          g.fillStyle = ['#7d98a8', '#b5694a', '#8a9a6a'][f % 3]; g.fillRect(wx, wy + wh + 12, ww, 44); H(140, wx, wy + wh + 12, ww, 44);
        }
        if (variant === 0 && b % 2 === f % 2) { // balcony
          const by = wy + wh + 10; g.fillStyle = '#c9c5bb'; g.fillRect(x0 + 10, by, bw - 20, 10); H(215, x0 + 10, by, bw - 20, 10);
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 + 10, by + 10, bw - 20, 8);
          g.fillStyle = '#3a3d42'; g.fillRect(x0 + 10, by - 50, bw - 20, 3); for (let x = x0 + 12; x < x0 + bw - 10; x += 8) g.fillRect(x, by - 50, 2, 50);
        }
      }
      if (style === 'brick') { g.fillStyle = '#efe9dc'; g.fillRect(wx - 16, wy - 26, ww + 32, 16); H(170, wx - 16, wy - 26, ww + 32, 16); } // lintel
    }
    if (style === 'house' || style === 'brick' || style === 'church' || shop) for (let f = 0; f < rows; f++) { // string course between floors
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, f * fh, S, 7); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, f * fh + 7, S, 4); H(190, 0, f * fh, S, 7);
    }
    // fine grain
    if (ground) { // darker plinth along the pavement
      const lg = g.createLinearGradient(0, SH - 40, 0, SH); lg.addColorStop(0, 'rgba(60,50,45,0)'); lg.addColorStop(1, 'rgba(60,50,45,.3)'); g.fillStyle = lg; g.fillRect(0, SH - 40, S, 40);
    }
    const im = g.getImageData(0, 0, S, SH), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
    // relief from a softened height map
    // lights, gloss and relief at half resolution: they hold far less detail than the colour
    const S2 = S / 2, SH2 = SH / 2, half = cv => { const [c2, g2] = canvas(S2, SH2); g2.drawImage(cv, 0, 0, S2, SH2); return c2; };
    const [cb, gb] = canvas(S2, SH2); try { gb.filter = 'blur(0.8px)'; } catch (e) { } gb.drawImage(ch, 0, 0, S2, SH2);
    const hd_ = gb.getImageData(0, 0, S2, SH2).data, hf = new Float32Array(S2 * SH2); for (let i = 0; i < S2 * SH2; i++) hf[i] = hd_[i * 4] / 255 * 5;
    const mk = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
    return { map: mk(c), emissive: mk(half(ce)), normal: heightToNormal(hf, S2, 1, SH2), rough: mk(half(cr)) };
  }
  const VARIANTS = { house: 3, block: 2, industrial: 1, plain: 1, brick: 2, church: 1 };
  // every style in a few variants, for the upper floors and for the street level
  function wallSet(styles) {
    const upper = [], ground = [];
    for (const st of styles) { const n = VARIANTS[st] || 1, u = [], g = []; for (let v = 0; v < n; v++) { u.push(wallMat(st, false, v)); g.push(wallMat(st, true, v)); } upper.push(u); ground.push(g); }
    return { upper, ground };
  }
