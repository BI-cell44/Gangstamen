// online traffic (20 nov.): the « Circulation » row of the online menu, « Calme » by default = half the cars.
// Run from /home/claude/t with the Node server on port 8099: node traf.js -> civOnline 7, civOnlineNormale 14
const fs = require('fs'); const { chromium } = require('playwright');
(async () => { const T0 = Date.now(); const lg = m => console.log(((Date.now() - T0) / 1000).toFixed(0) + ' s', m);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 500 } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.route('https://cdnjs.cloudflare.com/**', r => r.fulfill({ body: fs.readFileSync('three.min.js'), contentType: 'application/javascript' }));
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(() => { window.__noIntro = true; });
  await p.goto('http://localhost:8099/', { waitUntil: 'load', timeout: 900000 });
  await p.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 900000 });
  lg('chargé'); await p.evaluate(() => __gm.hd && __gm.hd.setQuality(0));
  const r = await p.evaluate(async () => {
    const out = { row: !document.getElementById('trafNetSeg').closest('.row').hidden, def: __gm.settings.trafficNet, on: [...document.querySelectorAll('#trafNetSeg button.on')].map(b => b.textContent) };
    __gm.settings.netGmode = 0; __gm.settings.netTeams = false; __gm.settings.goal = 0; __gm.settings.limit = 0; document.getElementById('nick').value = 'Alice'; document.getElementById('create').click();
    for (let k = 0; k < 120 && !(__gm.locals().length && __gm.locals()[0].car && __gm.Net.isHost); k++) await new Promise(r => setTimeout(r, 1000)); out.mode = __gm.Net.isHost ? 'online' : 'pas en ligne';
    out.civOnline = __gm.gx.budget().civ; __gm.settings.trafficNet = 2; out.civOnlineNormale = __gm.gx.budget().civ; __gm.settings.trafficNet = 1;
    return out; });
  lg('fini'); console.log(JSON.stringify(r)); await b.close();
})();
