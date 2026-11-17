// (17 nov.) gamepad navigation in the main menu with a fake gamepad: up/down by row, left/right inside a row
const open = require('./nov14_h.js');
(async () => {
  const { browser, page, errs } = await open(process.argv[2] || __dirname + '/../../gangstamen-ultra.html', { viewport: { width: 1366, height: 768 }, init: () => {
    const b = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    window.__pad = { id: 'fake pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: b };
    navigator.getGamepads = () => [window.__pad, null, null, null];
  } });
  await page.evaluate(() => { const b = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    window.__pad = { id: 'fake pad', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: b };
    navigator.getGamepads = () => [window.__pad, null, null, null]; });
  await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: window.__pad })));
  await page.mouse.click(300, 300); await page.waitForTimeout(1500); await page.keyboard.press('Escape'); await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('startFree').focus());
  const out = ['départ : ' + await page.evaluate(() => document.activeElement.textContent.slice(0, 24))];
  for (const [k, n] of [[13, 'bas'], [15, 'droite'], [13, 'bas'], [14, 'gauche'], [13, 'bas'], [13, 'bas'], [15, 'droite'], [13, 'bas'], [15, 'droite'], [12, 'haut'], [12, 'haut']]) {
    await page.evaluate(k => { window.__pad.buttons[k].pressed = true; window.__pad.buttons[k].value = 1; }, k);
    await page.waitForFunction(() => true); await page.waitForTimeout(2500);
    await page.evaluate(k => { window.__pad.buttons[k].pressed = false; window.__pad.buttons[k].value = 0; }, k);
    await page.waitForTimeout(2500);
    out.push(n + ' → ' + await page.evaluate(() => (document.activeElement.textContent || document.activeElement.tagName).slice(0, 26)));
  }
  console.log(out.join('\n'));
  console.log([...new Set(errs)].join('\n') || 'no errors'); await browser.close();
})();
