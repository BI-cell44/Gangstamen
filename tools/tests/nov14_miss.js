const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2]);
  await page.evaluate(() => { __gm.settings.cars = [{ s: 'twingo', p: 9 }]; __gm.settings.voices = false; __gm.settings.camp = { done: ['retour','jeanmace','gare','vautour'] }; });
  await page.evaluate(() => __gm.gx.startMission(4)); await page.waitForTimeout(2500);
  await page.waitForTimeout(3000); console.log('intro:', await page.evaluate(() => __gm.gx.MISSIONS[4].intro()[0][1]));
  for (let i = 0; i < 40 && await page.evaluate(() => !__gm.gx.mission.live); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(900); }
  const flash = () => page.evaluate(() => (document.body.innerText.match(/(Tu t’es planté[^\n]*|Démoli par[^\n]*)/g) || []).join(' | '));
  const r1 = await page.evaluate(() => {
    const L = __gm.locals()[0], cop = __gm.gx.cars().find(c => c.npc === 'cop');
    L.respect = 400; L.car.shield = 0; __gm.damage(L.car, 500, cop);
    return { live: __gm.gx.mission.live, alive: L.car.alive, respect: L.respect, cops: __gm.gx.cars().filter(c => c.npc === 'cop').length };
  });
  console.log('after cop kill', JSON.stringify(r1), '| flash:', await flash());
  await page.evaluate(() => { for (let i = 0; i < 60; i++) __gm.step(1 / 30); });
  await page.waitForTimeout(1500);
  console.log('mres:', await page.evaluate(() => { const e = document.getElementById('mres'); return [e.hidden, e.innerText.replace(/\n+/g, ' / ')]; }));
  console.log('respect restored:', await page.evaluate(() => __gm.locals()[0].respect));
  // retry
  await page.evaluate(() => document.querySelector('#mres button').click()); await page.waitForTimeout(1500);
  for (let i = 0; i < 40 && await page.evaluate(() => !__gm.gx.mission.live); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(900); }
  console.log('retry', JSON.stringify(await page.evaluate(() => { const L = __gm.locals()[0]; return { live: __gm.gx.mission.live, alive: L.car.alive, hp: L.car.hp, heat: +L.heat.toFixed(1), cops: __gm.gx.cars().filter(c => c.npc === 'cop').length }; })));
  // free roam: crash alone vs after a Rapace fight
  await page.evaluate(() => { __gm.gx.cleanupMission(); });
  const r2 = await page.evaluate(() => {
    const L = __gm.locals()[0]; const o = {};
    L.car.alive = true; L.car.hp = 100; L.car.shield = 0; __gm.damage(L.car, 500); o.crash = document.body.innerText.match(/(Tu t’es planté[^\n]*|Démoli par[^\n]*)/g);
    L.car.alive = true; L.car.hp = 100; const r = __gm.rivals().find(x => x.alive) || __gm.rivals()[0];
    __gm.applyHit(r, L.car, 5, L.car.x, L.car.z); __gm.damage(L.car, 500); o.fight = document.body.innerText.match(/(Tu t’es planté[^\n]*|Démoli par[^\n]*)/g);
    return o;
  });
  console.log(JSON.stringify(r2));
  console.log(errs.join('\n') || 'no errors'); await browser.close();
})();
