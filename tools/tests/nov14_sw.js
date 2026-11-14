const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2]);
  await page.evaluate(() => { __gm.settings.voices = false; __gm.start('solo'); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const L = __gm.locals()[0]; L.ammo = { rockets: 2, mines: 3, nitro: 1 }; L.weapon = 'rockets'; });
  const seq = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.down('KeyQ'); await page.waitForTimeout(900); await page.keyboard.up('KeyQ'); await page.waitForTimeout(900);
    seq.push(await page.evaluate(() => __gm.locals()[0].weapon + ' / ' + document.getElementById('ammo').textContent)); }
  await page.click('#ammo'); await page.waitForTimeout(300); seq.push('click: ' + await page.evaluate(() => __gm.locals()[0].weapon));
  console.log(seq.join('\n'));
  console.log('ctl:', await page.evaluate(() => (document.body.innerText.match(/Changer d’arme[^·\n]*/) || ['?'])[0]));
  await page.screenshot({ path: 'sw.png' });
  console.log(errs.join('\n') || 'no errors'); await browser.close();
})();
