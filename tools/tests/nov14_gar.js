const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2]);
  await page.evaluate(() => { __gm.settings.voices = false; __gm.start('solo'); });
  await page.waitForTimeout(2500);
  console.log('garages', JSON.stringify(await page.evaluate(() => __gm.gx.garages.map(g => [g.name, Math.round(g.x), Math.round(g.z), !!g.pad]))));
  const G = await page.evaluate(() => { const g = __gm.gx.garages[1]; const L = __gm.locals()[0]; L.car.place(g.x + 1, g.z + 1, 0); L.car.vx = L.car.vz = 0; return g.name; });
  for (let i = 0; i < 8; i++) await page.evaluate(() => __gm.step(1 / 30));
  await page.waitForTimeout(800);
  console.log('open:', await page.evaluate(() => { const e = document.getElementById('garage'); return [e.hidden, e.querySelector('h2') && e.querySelector('h2').textContent]; }));
  await page.screenshot({ path: 'out/garage-menu.png' });
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  // the north wall: drive north hard near x=600
  const r = await page.evaluate(() => {
    const L = __gm.locals()[0], c = L.car; const x = 600, wz = __gm.tramS(x);
    c.place(x, wz + 15, Math.PI); const out = [];
    for (let i = 0; i < 90; i++) { c.vx = 0; c.vz = -15; __gm.step(1 / 30); }
    out.push(['after pushing north', +c.z.toFixed(1), 'south track', +wz.toFixed(1)]);
    // west edge
    c.place(__gm.EDGE.x0 + 25, -155, -Math.PI / 2); for (let i = 0; i < 90; i++) { c.vx = -15; c.vz = 0; __gm.step(1 / 30); }
    out.push(['west', +c.x.toFixed(1), 'edge', __gm.EDGE.x0]);
    // tram sweep: park on the south track ahead of the eastbound tram
    const T = __gm.trams[0]; T.sleep = 0; T.wait = 0; T.x = 400; T.v = 10; T.left = 616; T.hitCd = 0;
    c.place(430, __gm.tramS(430) + 0.5, 0); c.vx = c.vz = 0; c.hp = 100; c.shield = 0;
    for (let i = 0; i < 120; i++) { c.vx = 0; c.vz = 0; __gm.step(1 / 30); }
    out.push(['tram', 'car z-track', +(c.z - __gm.tramS(c.x)).toFixed(1), 'hp', Math.round(c.hp), 'tram x', Math.round(T.x)]);
    return out;
  });
  console.log(JSON.stringify(r));
  console.log(errs.slice(0, 10).join('\n') || 'no errors'); await browser.close();
})();
