// ---------- textures ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function noise(g, w, h, a) {
  for (let i = 0; i < w * h / 6; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * a})`;
    g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + (Math.random() * 2 | 0), 1);
  }
}
/*@HD_MODULE@*/

const FACADES = ['house', 'block', 'industrial', 'plain', 'brick', 'church'];
// one tile = 4 bays x 4 floors = 16 m x 12.8 m
function facade(style) {
  const S = 128, [c, g] = canvas(S, S), [ce, ge] = canvas(S, S);
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  const bw = S / 4, fh = S / 4;
  if (style === 'brick') {
    g.fillStyle = 'rgba(90,30,20,.18)';
    for (let y = 0; y < S; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < S; x += 8) g.fillRect(x, y, 1, 4);
    for (let y = 0; y < S; y += 4) g.fillRect(0, y, S, 1);
  }
  if (style === 'industrial') {
    for (let x = 0; x < S; x += 4) { g.fillStyle = x % 8 ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.0)'; g.fillRect(x, 0, 2, S); }
    for (let b = 0; b < 4; b++) { // high window band
      g.fillStyle = '#2a3340'; g.fillRect(b * bw + 3, 4, bw - 6, 7);
      if (Math.random() < 0.3) { ge.fillStyle = '#c9e2ff'; ge.fillRect(b * bw + 3, 4, bw - 6, 7); }
    }
    g.fillStyle = 'rgba(80,40,20,.25)'; g.fillRect(0, S - 8, S, 8);
  }
  if (style === 'plain') {
    for (let y = 0; y < S; y += 6) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, y, S, 1); }
  }
  for (let f = 0; f < 4; f++) for (let b = 0; b < 4; b++) {
    const x = b * bw, y = f * fh; // y=0 is top of tile
    if (style === 'industrial' || style === 'plain') continue;
    let ww = bw * 0.38, wh = fh * 0.55, wx = x + (bw - ww) / 2, wy = y + fh * 0.2;
    if (style === 'block') { ww = bw * 0.6; wh = fh * 0.5; wx = x + (bw - ww) / 2; }
    if (style === 'church') { ww = bw * 0.3; wh = fh * 0.8; wx = x + (bw - ww) / 2; wy = y + fh * 0.1; if (b % 2) continue; }
    // frame / sill
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx - 1, wy + wh, ww + 2, 2);
    g.fillStyle = style === 'church' ? '#3a3550' : '#26303c';
    g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(160,190,230,.35)'; g.fillRect(wx + 1, wy + 1, ww / 2 - 1, wh / 3);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(wx + ww / 2 - 0.5, wy, 1, wh);
    if (style === 'house') { // shutters, Nantes grey-blue
      g.fillStyle = ['#5d7488', '#6f8a7c', '#8a6a5a', '#7a7f8c'][(f + b * 3) % 4];
      g.fillRect(wx - 5, wy, 4, wh); g.fillRect(wx + ww + 1, wy, 4, wh);
    }
    const r = Math.random();
    if (r < 0.32) { ge.fillStyle = r < 0.05 ? '#8fb6ff' : '#ffcf73'; ge.fillRect(wx, wy, ww, wh); }
  }
  noise(g, S, S, 0.12);
  // grime at the bottom of each floor
  const lg = g.createLinearGradient(0, S - 14, 0, S); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(40,30,30,.3)');
  g.fillStyle = lg; g.fillRect(0, S - 14, S, 14);
  const t = new THREE.CanvasTexture(c), te = new THREE.CanvasTexture(ce);
  for (const tx of [t, te]) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.magFilter = THREE.NearestFilter; tx.anisotropy = 4; }
  return [t, te];
}
function groundTex() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  noise(g, 128, 128, 0.18);
  g.fillStyle = 'rgba(0,0,0,.12)';
  for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 1, 128); g.fillRect(0, i, 128, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
}
function asphaltTex() {
  const [c, g] = canvas(64, 64);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
  noise(g, 64, 64, 0.35);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
}

