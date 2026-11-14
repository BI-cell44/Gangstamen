const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2]);
  await page.evaluate(() => __gm.start('solo'));
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    const cs = __gm.gx.customers(), L = __gm.locals()[0], c = cs[3];
    L.car.place(c.x + 1.2, c.z, 0); L.car.vx = -10; L.car.vz = 0;
    __gm.step(1/30); const s1 = [c.state, c.ox.toFixed(2), c.oz.toFixed(2)];
    L.car.place(c.x + 40, c.z + 40, 0); L.car.vx = 0; L.car.vz = 0;
    const seq = [];
    for (let i = 0; i < 1500; i++) { __gm.step(1/30); L.car.vx = 0; L.car.vz = 0; if (i % 150 === 0) seq.push(c.state); }
    return { s1, seq, end: [c.state, c.ox.toFixed(2), c.oz.toFixed(2)] };
  });
  console.log(JSON.stringify(r)); console.log(errs.join('\n') || 'no errors'); await browser.close();
})();
