// (17 nov.) capture the flag in split screen: where each player's minimap chevron points. node tools/tests/test_ctf_target.js [gangstamen-ultra.html]
const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2] || __dirname + '/../../gangstamen-ultra.html');
  const r = await page.evaluate(() => {
    const s = __gm.settings; s.nPlayers = 2; s.gmode = 2; s.teams = true; s.team = [0, 1, 0, 1]; s.goalCtf = 3;
    __gm.start('split'); __gm.step(0.1);
    const g = __gm.gx.gmState, [A, B] = __gm.locals(), T = L => { const t = __gm.gx.modeTarget(L); return t && [t.x | 0, t.z | 0]; };
    const f = g.flags, out = { homes: f.map(x => x.home.map(v => v | 0)) };
    out.start = [T(A), T(B)];                          // each goes for the other flag
    B.car.place(500, 0, 0); A.car.place(f[1].x, f[1].z, 0); __gm.step(0.05);   // A (Rapace) takes the Chantenaysiens' flag
    out.carrying = [!!f[1].carrier, T(A), T(B)];       // A: home; B: chase A
    A.car.place(420, -120, 0); __gm.step(0.05); A.car.alive = false; A.deadT = 5; __gm.step(0.05); // A wrecked: flag dropped
    out.dropped = [f[1].atHome, T(B), [f[1].x | 0, f[1].z | 0]]; // B: pick his own flag up
    return out;
  });
  console.log(JSON.stringify(r));
  await page.evaluate(() => { const [A] = __gm.locals(); A.car.alive = true; A.deadT = 0; A.car.place(300, 100, 0); });
  for (let i = 0; i < 4; i++) await page.evaluate(() => __gm.step(0.1));
  await page.waitForTimeout(3000); await page.screenshot({ path: '/home/claude/t/ctf.png' });
  console.log([...new Set(errs)].join('\n') || 'no errors'); await browser.close();
})();
