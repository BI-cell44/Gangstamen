const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2]);
  await page.evaluate(() => { __gm.settings.voices = false; __gm.start('solo'); __gm.hd && __gm.hd.setQuality(1); });
  await page.waitForTimeout(3000);
  console.log(JSON.stringify(await page.evaluate(() => ({ barriers: __gm.edges.barriers, trams: __gm.trams.map(t => [t.dir, Math.round(t.x), t.sleep]) }))));
  // put the eastbound tram near Du Chaffault for the picture
  await page.evaluate(() => { const T = __gm.trams[0]; T.sleep = 0; T.x = 560; T.v = 0; T.wait = 0; });
  await page.waitForTimeout(1500);
  const shots = JSON.parse(process.argv[4]);
  for (const [name, cam] of shots) {
    await page.evaluate(c => { window.__camAt = c; }, cam);
    await page.waitForTimeout(4500);
    await page.screenshot({ path: process.argv[3] + name + '.png' });
  }
  console.log(errs.slice(0, 15).join('\n') || 'no errors'); await browser.close();
})();
