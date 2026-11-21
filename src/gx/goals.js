  // ---------- (21 nov., audit UX) first game guided step by step, and three challenges of the day ----------
  // The guide shows one short instruction at a time at the bottom of the screen, the first time a solo game is played;
  // each step ends when the player has done it, or after a while so nobody is stuck. The challenges change every day (the
  // same three for everybody on a given date), count in every solo game, and pay respect into the bank.
  const GUIDE = [
    { k: 'go', kb: () => 'Avance avec ' + kk('up'), tc: () => document.body.classList.contains('joy') ? 'Pousse le joystick vers le haut pour accélérer' : 'Accélère avec le bouton GAZ', pad: 'Accélère avec la gâchette droite', t: 20, ok: (L, c) => c.speed > 9 },
    { k: 'hb', kb: () => 'Frein à main : ' + kk('hb') + ' en braquant pour tourner serré', tc: 'Frein à main : bouton FREIN À MAIN en braquant', pad: 'Frein à main : bouton A en braquant', t: 25, ok: (L, c) => L._inp && L._inp.hb && c.speed > 5 },
    { k: 'fire', kb: () => 'Tire avec ' + kk('fire') + ' : le losange jaune montre ta cible', tc: 'Tire avec le bouton FEU : le losange jaune montre ta cible', pad: 'Tire avec RB : le losange jaune montre ta cible', t: 35, hunt: true, ok: L => L.locals0Hit },
    { k: 'pu', kb: 'Ramasse un bonus : les boîtes chromées qui tournent', t: 45, ok: L => (L.puN || 0) > (L._gPu || 0) },
    { k: 'free', kb: 'Les colonnes de lumière lancent courses et défis ; le respect gagné paie le garage', t: 9, free: true, ok: () => false },
    { k: 'end', kb: () => kk('fix') + ' pour se remettre sur ses roues, Échap pour la pause et la carte. Bonne route !', tc: '❚❚ ouvre la pause ; touche la minicarte pour la grande carte. Bonne route !', pad: 'Y pour se remettre sur ses roues, Start pour la pause. Bonne route !', t: 7, ok: () => false },
  ];
  let guide = null;
  const kk = a => { const v = SCHEMES.kb1[a]; return keyName(Array.isArray(v) ? v[0] : v); };
  function guideCard(text, n) {
    let el = $('guide');
    if (!el) { el = document.createElement('div'); el.id = 'guide'; el.className = 'hud'; el.innerHTML = '<small></small><span></span><button type="button" aria-label="Fermer le guide">×</button>'; document.body.append(el); el.lastChild.addEventListener('click', () => guideEnd()); }
    el.hidden = !text; if (!text) return;
    el.children[0].textContent = n; el.children[1].textContent = text;
  }
  function guideEnd() { guide = null; guideCard(null); if (!settings.guided) { settings.guided = true; saveSettings(); } }
  function guideStep(dt) {
    const L = locals[0];
    if (!guide) {
      if (settings.guided || mode !== 'solo' || !L || gm || mission || !started || Intro.playing) return;
      guide = { i: 0, t: 0, hunt: !freeDrive() }; guide.L = L; L._gPu = L.puN || 0; L.locals0Hit = false;
    }
    if (mode !== 'solo' || gm || mission || !started || L !== guide.L) { guide = null; guideCard(null); return; }
    let s = GUIDE[guide.i];
    while (s && ((s.hunt && !guide.hunt) || (s.free && guide.hunt))) s = GUIDE[++guide.i];
    if (!s) { guideEnd(); return; }
    if (paused || blocking || ($('spawnMap') && !$('spawnMap').hidden)) { guideCard(null); return; }
    if (L.car.hitMarkT && performance.now() - L.car.hitMarkT < 500) L.locals0Hit = true;
    guide.t += dt;
    const dev = document.body.classList.contains('touch') && L.slot === 0 ? 'tc' : L.ctl && padIndexOf(L.ctl) >= 0 && pads[padIndexOf(L.ctl)] && pads[padIndexOf(L.ctl)].gp ? 'pad' : 'kb';
    const n = GUIDE.filter(g => !((g.hunt && !guide.hunt) || (g.free && guide.hunt))), k = n.indexOf(s);
    const tx = s[dev] || s.kb; guideCard(typeof tx === 'function' ? tx() : tx, (k + 1) + ' / ' + n.length);
    if (s.ok(L, L.car) && guide.t > 0.6) { sfx.pick(); guide.i++; guide.t = 0; L._gPu = L.puN || 0; }
    else if (guide.t > s.t) { guide.i++; guide.t = 0; L._gPu = L.puN || 0; }
  }
  const freeDrive = () => soloKind === 'free';

  const DAILY = [
    { k: 'ko', n: [4, 6, 8], txt: v => 'Démolis ' + v + ' Rapaces' },
    { k: 'speed', n: [110, 125, 140], txt: v => 'Atteins ' + v + ' km/h' },
    { k: 'dist', n: [3, 5, 8], txt: v => 'Roule ' + v + ' km' },
    { k: 'air', n: [1.2, 1.6, 2], txt: v => 'Reste ' + String(v).replace('.', ',') + ' s en l’air d’un seul saut' },
    { k: 'pu', n: [3, 5, 7], txt: v => 'Ramasse ' + v + ' bonus' },
    { k: 'smash', n: [12, 20, 30], txt: v => 'Casse ' + v + ' objets du mobilier urbain' },
    { k: 'esc', n: [1, 2, 3], txt: v => v > 1 ? 'Sème la police ' + v + ' fois' : 'Sème la police' },
  ];
  const REWARD = [150, 200, 250];
  function dayKey(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dailyList() {
    const key = dayKey() + '·2'; let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967296; };
    const pool = DAILY.slice(), out = [];
    for (let i = 0; i < 3; i++) { const d = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; out.push({ k: d.k, goal: d.n[i], text: d.txt(d.n[i]), reward: REWARD[i] }); }
    let s = settings.daily; if (!s || s.d !== key) { s = settings.daily = { d: key, p: [0, 0, 0] }; saveSettings(); }
    out.forEach((o, i) => { o.p = s.p[i] || 0; o.done = o.p >= o.goal; });
    return out;
  }
  let dSave = 0, dLast = null;
  function dailyStep(dt) {
    const L = locals[0];
    if (mode !== 'solo' || !L || !started || paused || !L.car.alive) { dLast = null; return; }
    const list = dailyList(), s = settings.daily, c = L.car;
    const now = { ko: L.koN || 0, pu: L.puN || 0, smash: brokenCount(), esc: L.escN || 0 };
    if (!dLast || dLast.L !== L) { dLast = { L, ...now, air: 0 }; return; }
    c.air > 0.25 ? (dLast.air += dt) : (dLast.air = 0);
    const add = { ko: Math.max(0, now.ko - dLast.ko), pu: Math.max(0, now.pu - dLast.pu), smash: Math.max(0, now.smash - dLast.smash), esc: Math.max(0, now.esc - dLast.esc), dist: c.speed * dt / 1000 };
    Object.assign(dLast, now);
    let changed = false;
    list.forEach((o, i) => {
      if (o.done) return;
      let v = s.p[i] || 0;
      if (o.k === 'speed') v = Math.max(v, Math.round(c.speed * 3.6));
      else if (o.k === 'air') v = Math.max(v, Math.round(dLast.air * 10) / 10);
      else v += add[o.k] || 0;
      if (v !== s.p[i]) { s.p[i] = v; changed = true; }
      if (v >= o.goal) {
        L.respect += o.reward; saveBank(L); sfx.pick(); rumbleFor(L, 0.3, 0.6, 200);
        flashFor(L, 'Défi du jour réussi', o.text + ' · +' + o.reward + ' respect');
      }
    });
    dSave += dt; if (changed && dSave > 3) { dSave = 0; saveSettings(); }
  }
  // in the main menu, beside the driving style, and in the pause
  function dailyHTML() {
    const fmt = o => o.k === 'dist' ? (Math.min(o.p, o.goal)).toFixed(1).replace('.', ',') + ' / ' + o.goal : o.k === 'air' ? String(Math.min(o.p, o.goal)).replace('.', ',') + ' / ' + String(o.goal).replace('.', ',') + ' s' : o.k === 'speed' ? Math.min(o.p, o.goal) + ' / ' + o.goal : Math.floor(Math.min(o.p, o.goal)) + ' / ' + o.goal;
    return '<span class="lab">Défis du jour</span>' + dailyList().map(o => '<div class="dly' + (o.done ? ' done' : '') + '"><b>' + (o.done ? '✔ ' : '') + o.text + '</b><small>' + (o.done ? 'réussi' : fmt(o)) + ' · +' + o.reward + ' respect</small><i style="width:' + Math.min(100, 100 * o.p / o.goal).toFixed(0) + '%"></i></div>').join('');
  }
  function dailyBox(host) {
    if (!host) return;
    let el = host.querySelector('.dailyBox'); if (!el) { el = document.createElement('div'); el.className = 'dailyBox'; host.append(el); }
    el.innerHTML = dailyHTML();
  }
