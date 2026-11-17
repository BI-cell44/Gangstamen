// (17 nov.) split screen on a touch device: menu limited to 2 players, player 1 on touch, views and controls in portrait and landscape
const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2] || __dirname + '/../../gangstamen-ultra.html', { viewport: { width: 390, height: 844 }, context: { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } });
  await page.keyboard.press('KeyA');
  await page.evaluate(() => { document.querySelector('#vMain [data-go="vSplit"]').click(); });
  await page.waitForTimeout(500);
  console.log(await page.evaluate(() => ({ n: __gm.settings.nPlayers, nBtns: [...document.querySelectorAll('#nSeg button')].filter(b => !b.hidden).length, slots: document.getElementById('slots').innerText.replace(/\n/g, ' | ') })));
  await page.screenshot({ path: 'st_menu.png', timeout: 240000 });
  await page.evaluate(() => { __gm.settings.gmode = 0; __gm.settings.teams = false; __gm.start('split'); });
  await page.waitForTimeout(3000); await page.screenshot({ path: 'st_p.png', timeout: 240000 });
  await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(3000); await page.screenshot({ path: 'st_l.png', timeout: 240000 });
  console.log(await page.evaluate(() => __gm.locals().map(L => L.vp)));
  console.log([...new Set(errs)].join('\n') || 'no errors'); await browser.close();
})();
