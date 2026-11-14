const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2]);
  await page.evaluate(() => { __gm.settings.voices = false; __gm.settings.camp = { done: ['retour', 'jeanmace', 'gare', 'vautour', 'police', 'quais'] }; });
  for (let i = 0; i < 7; i++) {
    await page.evaluate(i => __gm.gx.startMission(i), i); await page.waitForTimeout(800);
    const r = await page.evaluate(() => { const m = __gm.gx.mission; m.live = true; document.querySelectorAll('#dlg').forEach(e => e.hidden = true); for (let k = 0; k < 60; k++) __gm.step(1 / 30); const L = __gm.locals()[0]; return [m.id, Math.round(L.car.x), Math.round(L.car.z), L.car.alive, !!__gm.gx.mission]; });
    console.log(JSON.stringify(r));
  }
  console.log(errs.slice(0, 10).join('\n') || 'no errors'); await browser.close();
})();
