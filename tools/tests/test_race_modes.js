// (17 nov.) checkpoint race in split screen and the end-of-game choices of each mode: node tools/tests/test_race_modes.js [gangstamen-ultra.html]
// needs three.min.js next to nov14_h.js (see CLAUDE.md, « Tester ») ; the online race is checked with two pages on the server branch: see docs/HISTORIQUE.md (17 nov.)
const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2] || __dirname + '/../../gangstamen-ultra.html');
  const menu = await page.evaluate(() => {
    const q = s => document.querySelector(s), lab = sel => [...document.querySelectorAll(sel + ' .goalSeg button')].filter(b => !b.hidden).map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join(',');
    const out = {};
    q('#mSeg [data-m="0"]').click(); out.split0 = lab('#vSplit');
    q('#mSeg [data-m="2"]').click(); out.split2 = lab('#vSplit');
    q('#mSeg [data-m="3"]').click(); out.split3 = lab('#vSplit');
    q('#mSeg [data-m="4"]').click(); q('#vSplit .goalSeg [data-g="2"]').click(); out.split4 = lab('#vSplit');
    q('#oSeg [data-m="3"]').click(); out.online3 = lab('#vOnline');
    out.hunt = lab('#vHunt'); out.laps = __gm.settings.raceLaps; out.goal = __gm.settings.goal;
    return out;
  });
  console.log(JSON.stringify(menu));
  const r = await page.evaluate(() => {
    const s = __gm.settings; s.nPlayers = 2; s.gmode = 4; s.teams = false; s.limit = 5;
    __gm.start('split');
    const g = __gm.gx.gmState, Ls = __gm.locals();
    const head = L => { const t = g.cps[0], c = L.car; const want = Math.atan2(-(t.x - c.x), -(t.z - c.z)); return +(Math.atan2(Math.sin(c.h - want), Math.cos(c.h - want))).toFixed(3); };
    const out = { goal: __gm.Match.goal, laps: g.laps, clock: document.getElementById('clock').textContent, headErr: Ls.map(head), pos: Ls.map(L => [L.car.x | 0, L.car.z | 0]), vis0: g.cps.map(m => m.ring.visible ? 1 : 0).join('') };
    for (let i = 0; i < 2; i++) __gm.step(0.1); // during countdown: teleport into CP1 must not count
    Ls[0].car.place(g.cps[0].x, g.cps[0].z, 0); __gm.step(0.05); out.cpDuringCount = Ls[0].cp;
    for (let i = 0; i < 40; i++) __gm.step(0.1);
    out.tgt = __gm.gx.modeTarget(Ls[1]);
    const L = Ls[0], log = [];
    for (let k = 0; k < 20 && !__gm.Match.over; k++) {
      const t = __gm.gx.modeTarget(L); if (!t) break;
      L.car.place(t.x, t.z, 0); for (let i = 0; i < 3; i++) __gm.step(0.05);
      log.push(document.querySelector('#objective .oText').textContent);
      if (k === 4) { // wreck and respawn
        L.car.hp = 0; __gm.applyHit && 0; L.car.alive = false; L.deadT = 0.01; __gm.step(0.05); __gm.step(0.05);
        const rs = __gm.gx.raceRespawn(L); out.respawn = [L.car.alive, L.car.x | 0, L.car.z | 0, rs.map(v => +v.toFixed(2))];
      }
    }
    out.vis = g.cps.map(m => m.ring.visible ? 1 : 0).join('');
    out.log = log; out.over = __gm.Match.over; out.res = document.getElementById('resTitle').textContent;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await page.evaluate(() => { document.getElementById('results').hidden = true; __gm.gx.rematch && 0; });
  console.log([...new Set(errs)].join('\n') || 'no errors');
  await browser.close();
})();
